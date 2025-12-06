# import os
# import cv2
# import pickle
# import torch
# import numpy as np
# from PIL import Image
# from facenet_pytorch import MTCNN, InceptionResnetV1
# from sklearn.preprocessing import normalize
# from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc
# import matplotlib.pyplot as plt

# # ==============================
# # 1️⃣ DEVICE & MÔ HÌNH
# # ==============================
# DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# DB_PATH = os.path.join(os.path.dirname(__file__), "database3.pkl")

# mtcnn = MTCNN(keep_all=True, min_face_size=40, device=DEVICE)
# resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# # ==============================
# # 2️⃣ HÀM ALIGN KHUÔN MẶT
# # ==============================
# def align_face(image, landmarks):
#     left_eye = landmarks[0]
#     right_eye = landmarks[1]
#     dx = right_eye[0] - left_eye[0]
#     dy = right_eye[1] - left_eye[1]
#     angle = np.degrees(np.arctan2(dy, dx))
#     center = tuple(np.mean([left_eye, right_eye], axis=0))
#     rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
#     aligned = cv2.warpAffine(image, rot_mat, (image.shape[1], image.shape[0]))
#     return aligned

# # ==============================
# # 3️⃣ EXTRACT EMBEDDING
# # ==============================
# def extract_embedding(face_tensor):
#     with torch.no_grad():
#         emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze()
#     return normalize(emb.reshape(1, -1))[0]

# # ==============================
# # 4️⃣ CHECK CHẤT LƯỢNG ẢNH
# # ==============================
# def is_good_frame(gray):
#     sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
#     brightness = np.mean(gray)
#     return sharpness > 50 and 80 < brightness < 200

# # ==============================
# # 5️⃣ ENROLL TỪ DATASET FOLDER
# # ==============================
# def enroll_from_dataset(dataset_path, min_frames=10):
#     if os.path.exists(DB_PATH):
#         db = pickle.load(open(DB_PATH, "rb"))
#     else:
#         db = {}

#     for student_id in os.listdir(dataset_path):
#         student_path = os.path.join(dataset_path, student_id)
#         if not os.path.isdir(student_path):
#             continue

#         embeddings = []
#         for fname in os.listdir(student_path):
#             fpath = os.path.join(student_path, fname)
#             img = cv2.imread(fpath)
#             if img is None:
#                 continue

#             gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#             if not is_good_frame(gray):
#                 continue

#             rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#             pil = Image.fromarray(rgb)

#             boxes, probs, landmarks = mtcnn.detect(pil, landmarks=True)
#             if boxes is None or probs is None or landmarks is None:
#                 continue

#             # Chọn mặt lớn nhất
#             areas = [(b[2]-b[0])*(b[3]-b[1]) for b in boxes]
#             idx = int(np.argmax(areas))
#             if probs[idx] < 0.95:
#                 continue

#             # Align face
#             aligned = align_face(rgb, landmarks[idx])
#             pil_aligned = Image.fromarray(aligned)
#             face_tensor = mtcnn(pil_aligned)

#             # ===== FIX DIMENSION =====
#             if face_tensor is None:
#                 continue
#             if isinstance(face_tensor, list):
#                 face_tensor = torch.stack(face_tensor)
#             if face_tensor.ndim == 4:  # batch dim >1
#                 face_tensor = face_tensor[0]  # chọn mặt đầu tiên

#             emb = extract_embedding(face_tensor)
#             embeddings.append(emb)

#         if len(embeddings) < min_frames:
#             print(f"⚠️  Không đủ frame/ảnh cho {student_id}, chỉ {len(embeddings)} frame")
#             continue

#         # Loại outlier
#         arr = np.array(embeddings)
#         mean = arr.mean(axis=0)
#         std = arr.std(axis=0)
#         z_scores = np.abs((arr - mean) / (std + 1e-8))
#         mask = (z_scores < 2).all(axis=1)
#         cleaned_embeddings = arr[mask]
#         if len(cleaned_embeddings) >= min_frames:
#             arr = cleaned_embeddings

#         final_mean = arr.mean(axis=0)
#         final_std = arr.std(axis=0)

#         db[student_id] = {
#             "mean": final_mean,
#             "std": final_std,
#             "raw": arr.tolist()
#         }
#         print(f"✅ Đã enroll {student_id}: {len(arr)} embeddings")

#     pickle.dump(db, open(DB_PATH, "wb"))
#     return db

# # ==============================
# # 6️⃣ COSINE SIMILARITY
# # ==============================
# def cosine_similarity(a, b):
#     return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# # ==============================
# # 7️⃣ ĐÁNH GIÁ MÔ HÌNH
# # ==============================
# def evaluate_model(db):
#     student_ids = list(db.keys())
#     true_labels = []
#     pred_scores = []

#     for sid in student_ids:
#         embeddings = db[sid]["raw"]

#         # Positive pairs
#         for i in range(len(embeddings)):
#             for j in range(i+1, len(embeddings)):
#                 sim = cosine_similarity(embeddings[i], embeddings[j])
#                 pred_scores.append(sim)
#                 true_labels.append(1)

#         # Negative pairs
#         for other_id in student_ids:
#             if other_id == sid:
#                 continue
#             for e1 in embeddings:
#                 for e2 in db[other_id]["raw"]:
#                     sim = cosine_similarity(e1, e2)
#                     pred_scores.append(sim)
#                     true_labels.append(0)

#     pred_scores = np.array(pred_scores)
#     true_labels = np.array(true_labels)

#     # Tìm threshold tối ưu
#     thresholds = np.linspace(-1, 1, 200)
#     best_acc = 0
#     best_t = 0
#     for t in thresholds:
#         preds = (pred_scores >= t).astype(int)
#         acc = accuracy_score(true_labels, preds)
#         if acc > best_acc:
#             best_acc = acc
#             best_t = t

#     print(f"\n🔥 Best threshold = {best_t:.4f} with Accuracy = {best_acc:.4f}\n")

#     # Tính metric
#     final_preds = (pred_scores >= best_t).astype(int)
#     acc = accuracy_score(true_labels, final_preds)
#     precision = precision_score(true_labels, final_preds)
#     recall = recall_score(true_labels, final_preds)
#     f1 = f1_score(true_labels, final_preds)
#     cm = confusion_matrix(true_labels, final_preds)
#     tn, fp, fn, tp = cm.ravel()
#     FAR = fp / (fp + tn)
#     FRR = fn / (fn + tp)

#     print("===== MODEL EVALUATION =====")
#     print(f"Accuracy:   {acc:.4f}")
#     print(f"Precision:  {precision:.4f}")
#     print(f"Recall:     {recall:.4f}")
#     print(f"F1-score:   {f1:.4f}")
#     print(f"FAR:        {FAR:.4f}")
#     print(f"FRR:        {FRR:.4f}")

#     # Vẽ ROC
#     fpr, tpr, _ = roc_curve(true_labels, pred_scores)
#     roc_auc = auc(fpr, tpr)
#     plt.figure()
#     plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}")
#     plt.title("ROC Curve")
#     plt.xlabel("False Positive Rate")
#     plt.ylabel("True Positive Rate")
#     plt.legend(loc="lower right")
#     plt.grid(True)
#     plt.show()

#     # Vẽ Confusion Matrix
#     plt.figure()
#     plt.imshow(cm, cmap="Blues")
#     plt.title("Confusion Matrix")
#     plt.colorbar()
#     labels = ["Negative", "Positive"]
#     plt.xticks([0,1], labels)
#     plt.yticks([0,1], labels)
#     for i in range(2):
#         for j in range(2):
#             plt.text(j,i,cm[i,j],ha="center",va="center",color="black")
#     plt.show()

# # ==============================
# # 8️⃣ CHẠY TOÀN BỘ
# # ==============================
# if __name__ == "__main__":
#     DATASET_PATH = r"E:\Test_model\archive\105_classes_pins_dataset"
#     db = enroll_from_dataset(DATASET_PATH, min_frames=10)
#     evaluate_model(db)


# import os
# import cv2
# import pickle
# import random
# import torch
# import numpy as np
# from PIL import Image
# from facenet_pytorch import MTCNN, InceptionResnetV1
# from sklearn.preprocessing import normalize
# from sklearn.metrics import (
#     accuracy_score, precision_score, recall_score, f1_score,
#     confusion_matrix, roc_curve, auc, ConfusionMatrixDisplay
# )
# import matplotlib.pyplot as plt

# plt.style.use("seaborn-v0_8-darkgrid")

# # ==============================
# # 0️⃣ TIỆN ÍCH
# # ==============================
# def ensure_dir(path):
#     if not os.path.exists(path):
#         os.makedirs(path)

# # ==============================
# # 1️⃣ DEVICE & MÔ HÌNH
# # ==============================
# DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# DB_PATH = os.path.join(os.path.dirname(__file__), "database3.pkl")

# mtcnn = MTCNN(keep_all=True, min_face_size=40, device=DEVICE)
# resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# # ==============================
# # 2️⃣ ALIGN FACE
# # ==============================
# def align_face(image, lm):
#     try:
#         left_eye  = lm[0]
#         right_eye = lm[1]
#         dx = right_eye[0] - left_eye[0]
#         dy = right_eye[1] - left_eye[1]
#         angle = np.degrees(np.arctan2(dy, dx))
#         center = tuple(np.mean([left_eye, right_eye], axis=0))
#         rot = cv2.getRotationMatrix2D(center, angle, 1.0)
#         return cv2.warpAffine(image, rot, (image.shape[1], image.shape[0]))
#     except:
#         return image  # fallback nếu lỗi

# # ==============================
# # 3️⃣ EMBEDDING
# # ==============================
# def extract_embedding(face_tensor):
#     with torch.no_grad():
#         emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze()
#     return normalize(emb.reshape(1, -1))[0]

# # ==============================
# # 4️⃣ CHẤT LƯỢNG ẢNH
# # ==============================
# def is_good_frame(gray):
#     sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
#     brightness = np.mean(gray)
#     return sharpness > 50 and 80 < brightness < 200

# # ==============================
# # 5️⃣ ENROLL
# # ==============================
# def enroll_from_dataset(dataset_path, sample_size=20, min_frames=10):

#     db = pickle.load(open(DB_PATH, "rb")) if os.path.exists(DB_PATH) else {}

#     for student_id in os.listdir(dataset_path):
#         path = os.path.join(dataset_path, student_id)
#         if not os.path.isdir(path):
#             continue

#         all_images = [os.path.join(path, f) for f in os.listdir(path)]
#         if len(all_images) == 0:
#             continue

#         selected = random.sample(all_images, min(len(all_images), sample_size))

#         embeddings = []

#         for fpath in selected:
#             img = cv2.imread(fpath)
#             if img is None:
#                 continue

#             gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#             if not is_good_frame(gray):
#                 continue

#             rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#             pil = Image.fromarray(rgb)

#             boxes, probs, landmarks = mtcnn.detect(pil, landmarks=True)

#             if boxes is None or landmarks is None:
#                 continue

#             # chọn mặt lớn nhất
#             idx = int(np.argmax([(b[2]-b[0])*(b[3]-b[1]) for b in boxes]))
#             if probs[idx] < 0.95:
#                 continue

#             lm = landmarks[idx]

#             if lm is None or lm.shape[0] < 5:
#                 continue

#             aligned = align_face(rgb, lm)
#             pil_aligned = Image.fromarray(aligned)

#             face_tensor = mtcnn(pil_aligned)
#             if face_tensor is None:
#                 continue

#             if face_tensor.ndim == 4:
#                 face_tensor = face_tensor[0]

#             emb = extract_embedding(face_tensor)
#             embeddings.append(emb)

#         if len(embeddings) < min_frames:
#             print(f"⚠️ {student_id}: chỉ có {len(embeddings)} → bỏ qua")
#             continue

#         db[student_id] = {"raw": np.array(embeddings).tolist()}
#         print(f"✅ {student_id}: Đã lấy {len(embeddings)} embeddings")

#     pickle.dump(db, open(DB_PATH, "wb"))
#     return db

# # ==============================
# # 6️⃣ COSINE
# # ==============================
# def cosine_similarity(a, b):
#     return np.dot(a,b) / (np.linalg.norm(a)*np.linalg.norm(b))

# # ==============================
# # 7️⃣ EVALUATE
# # ==============================
# def evaluate_model(db):
#     save_dir = "accurancy"
#     ensure_dir(save_dir)

#     student_ids = list(db.keys())
#     true_labels = []
#     scores = []

#     for sid in student_ids:
#         emb = db[sid]["raw"]

#         # POSITIVE
#         for i in range(len(emb)):
#             for j in range(i + 1, len(emb)):
#                 scores.append(cosine_similarity(emb[i], emb[j]))
#                 true_labels.append(1)

#         # NEGATIVE
#         for sid2 in student_ids:
#             if sid2 == sid:
#                 continue
#             for e1 in emb:
#                 for e2 in db[sid2]["raw"]:
#                     scores.append(cosine_similarity(e1, e2))
#                     true_labels.append(0)

#     scores = np.array(scores)
#     true_labels = np.array(true_labels)

#     # tìm threshold tốt nhất
#     best_acc, best_t = 0, 0
#     for t in np.linspace(-1, 1, 200):
#         pred = (scores >= t).astype(int)
#         acc = accuracy_score(true_labels, pred)
#         if acc > best_acc:
#             best_acc, best_t = acc, t

#     preds = (scores >= best_t).astype(int)

#     precision = precision_score(true_labels, preds)
#     recall = recall_score(true_labels, preds)
#     f1 = f1_score(true_labels, preds)
#     cm = confusion_matrix(true_labels, preds)
#     tn, fp, fn, tp = cm.ravel()
#     FAR = fp / (fp + tn)
#     FRR = fn / (fn + tp)

#     # HISTOGRAM
#     plt.figure(figsize=(8,5))
#     plt.hist(scores[true_labels==1], bins=50, alpha=0.6, label="Positive")
#     plt.hist(scores[true_labels==0], bins=50, alpha=0.6, label="Negative")
#     plt.title("Distribution of Face Similarity")
#     plt.xlabel("Cosine Similarity")
#     plt.ylabel("Frequency")
#     plt.legend()
#     plt.savefig(os.path.join(save_dir, "similarity_histogram.png"), dpi=300)
#     plt.close()

#     # ROC
#     fpr, tpr, _ = roc_curve(true_labels, scores)
#     roc_auc = auc(fpr, tpr)
#     plt.figure(figsize=(7,7))
#     plt.plot(fpr, tpr, lw=2, label=f"AUC={roc_auc:.4f}")
#     plt.plot([0,1],[0,1],"--")
#     plt.title("ROC Curve")
#     plt.xlabel("FPR")
#     plt.ylabel("TPR")
#     plt.legend()
#     plt.savefig(os.path.join(save_dir, "roc_curve.png"), dpi=300)
#     plt.close()

#     # CONFUSION MATRIX
#     disp = ConfusionMatrixDisplay(cm, display_labels=["Negative","Positive"])
#     disp.plot(cmap="Blues", values_format="d")
#     plt.title("Confusion Matrix")
#     plt.savefig(os.path.join(save_dir, "confusion_matrix.png"), dpi=300)
#     plt.close()

#     # TXT
#     with open(os.path.join(save_dir, "metrics.txt"), "w", encoding="utf-8") as f:
#         f.write("===== MODEL EVALUATION =====\n")
#         f.write(f"Best Threshold: {best_t:.4f}\n")
#         f.write(f"Accuracy: {best_acc:.4f}\n")
#         f.write(f"Precision: {precision:.4f}\n")
#         f.write(f"Recall: {recall:.4f}\n")
#         f.write(f"F1-score: {f1:.4f}\n")
#         f.write(f"FAR: {FAR:.4f}\n")
#         f.write(f"FRR: {FRR:.4f}\n")
#         f.write(f"AUC: {roc_auc:.4f}\n")

#     print("\n🎉 Đã lưu toàn bộ kết quả vào thư mục: /accurancy\n")

# # ==============================
# # 8️⃣ MAIN
# # ==============================
# if __name__ == "__main__":
#     DATASET = r"E:\Test_model\archive\105_classes_pins_dataset"
#     db = enroll_from_dataset(DATASET, sample_size=40)
#     evaluate_model(db)

import os
import numpy as np
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sklearn.metrics import (
    classification_report,
    roc_curve,
    auc,
    confusion_matrix,
    ConfusionMatrixDisplay
)
from sklearn.preprocessing import normalize
import matplotlib.pyplot as plt

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ========================
# 1) Load model
# ========================
mtcnn = MTCNN(image_size=160, margin=10, keep_all=False, device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)


# ========================
# XỬ LÝ 1 ẢNH
# ========================
def process_image(image_path):
    try:
        img = Image.open(image_path).convert("RGB")

        # MTCNN không hỗ trợ tham số save=
        face_tensor = mtcnn(img)

        if face_tensor is None:
            print(f"❌ Không tìm thấy mặt trong ảnh: {image_path}")
            return None

        # Nếu MTCNN trả batch 4D
        if face_tensor.ndim == 4:     # [1,3,160,160]
            face_tensor = face_tensor[0]

        return extract_embedding(face_tensor)

    except Exception as e:
        print(f"⚠ Lỗi xử lý ảnh {image_path}: {str(e)}")
        return None


# ========================
# EXTRACT EMBEDDING
# ========================
def extract_embedding(face_tensor):
    with torch.no_grad():
        face_tensor = face_tensor.unsqueeze(0).to(DEVICE)  # [1,3,160,160]
        emb = resnet(face_tensor).cpu().numpy().squeeze()

    emb = normalize(emb.reshape(1, -1))[0]
    return emb


# ========================
# ENROLL DATASET
# ========================
def enroll_from_dataset(dataset_path, sample_size=40):
    db = {}

    for person in sorted(os.listdir(dataset_path)):
        person_dir = os.path.join(dataset_path, person)
        if not os.path.isdir(person_dir):
            continue

        images = sorted(
            f for f in os.listdir(person_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        )

        images = images[:sample_size]
        embeddings = []

        for f in images:
            img_path = os.path.join(person_dir, f)
            emb = process_image(img_path)

            if emb is not None:
                embeddings.append(emb)

        if len(embeddings) == 0:
            print(f"⚠ Bỏ qua {person} — không có ảnh hợp lệ.")
            continue

        db[person] = np.array(embeddings)
        print(f"✅ Enrolled {person}: {len(embeddings)} embeddings")

    if len(db) == 0:
        raise RuntimeError("❌ Không có dữ liệu hợp lệ để đánh giá!")

    return db


# ========================
# EVALUATE MODEL
# ========================
def evaluate_model(db):
    os.makedirs("accurancy2", exist_ok=True)

    persons = list(db.keys())
    centroids = {p: db[p].mean(axis=0) for p in persons}

    Y_true = []
    Y_pred = []
    distances = []

    for person in persons:
        for emb in db[person]:
            Y_true.append(person)

            # tìm class gần nhất
            d_min = 999
            best = None

            for p in persons:
                d = np.linalg.norm(emb - centroids[p])
                if d < d_min:
                    d_min = d
                    best = p

            Y_pred.append(best)
            distances.append(d_min)

    # =======================
    # 1) Lưu classification report
    # =======================
    report = classification_report(Y_true, Y_pred)
    with open("accurancy2/classification_report.txt", "w", encoding="utf-8") as f:
        f.write(report)

    print("\n===== MODEL REPORT =====")
    print(report)

    # =======================
    # 2) Confusion Matrix
    # =======================
    cm = confusion_matrix(Y_true, Y_pred, labels=persons)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=persons)
    disp.plot(xticks_rotation=90, cmap="Blues")
    plt.title("Confusion Matrix")
    plt.tight_layout()
    plt.savefig("accurancy2/confusion_matrix.png", dpi=300)
    plt.close()

    # =======================
    # 3) ROC Curve (One vs All)
    # =======================
    try:
        y_true_bin = np.array([persons.index(y) for y in Y_true])
        y_pred_bin = np.array([persons.index(y) for y in Y_pred])

        fpr, tpr, _ = roc_curve(y_true_bin == y_pred_bin, np.array(distances) * -1)
        roc_auc = auc(fpr, tpr)

        plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.4f}")
        plt.plot([0, 1], [0, 1], "--")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC Curve")
        plt.legend()
        plt.savefig("accurancy2/roc_curve.png", dpi=300)
        plt.close()

    except Exception as e:
        print("⚠ Không thể vẽ ROC Curve:", e)

    # =======================
    # 4) Histogram khoảng cách
    # =======================
    plt.hist(distances, bins=40)
    plt.xlabel("Euclidean Distance")
    plt.ylabel("Count")
    plt.title("Embedding Distance Distribution")
    plt.savefig("accurancy2/distance_histogram.png", dpi=300)
    plt.close()


# ========================
# MAIN
# ========================
if __name__ == "__main__":
    DATASET = r"E:\Test_model\archive\105_classes_pins_dataset"

    db = enroll_from_dataset(DATASET, sample_size=40)
    evaluate_model(db)
