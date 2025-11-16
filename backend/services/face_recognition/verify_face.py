# import os
# import pickle
# import torch
# import numpy as np
# from PIL import Image
# from facenet_pytorch import MTCNN, InceptionResnetV1
# from sklearn.preprocessing import normalize
# from sklearn.metrics.pairwise import cosine_similarity

# DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# DB_PATH = os.path.join(os.path.dirname(__file__), "database.pkl")

# # Khởi tạo MTCNN và ResNet giống phần đăng ký
# mtcnn = MTCNN(keep_all=True, thresholds=[0.5, 0.6, 0.7],  device=DEVICE)
# resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# def extract_embedding(pil_img):
#     faces = mtcnn(pil_img)
#     if faces is None:
#         return None
#     if isinstance(faces, list):
#         areas = [(f.shape[1]*f.shape[2], f) for f in faces]
#         face_tensor = max(areas, key=lambda x:x[0])[1]
#     else:
#         face_tensor = faces

#     with torch.no_grad():
#         emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
#         return normalize(emb.reshape(1, -1))[0]

# def verify_face(pil_img, threshold=0.6):
#     # Load database
#     if not os.path.exists(DB_PATH):
#         raise RuntimeError("Chưa có database.pkl, vui lòng đăng ký trước.")

#     with open(DB_PATH, "rb") as f:
#         db = pickle.load(f)

#     emb = extract_embedding(pil_img)
#     if emb is None:
#         return None, 0.0

#     best_match = None
#     best_score = -1

#     for student_id, embeddings in db.items():
#         scores = cosine_similarity([emb], embeddings)
#         max_score = float(scores.max())
#         if max_score > best_score:
#             best_score = max_score
#             best_match = student_id

#     if best_score >= threshold:
#         return best_match, best_score
#     return None, best_score


import os
import pickle
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DB_PATH = os.path.join(os.path.dirname(__file__), "database.pkl")

# Khởi tạo MTCNN và ResNet giống phần đăng ký
mtcnn = MTCNN(keep_all=True, thresholds=[0.5, 0.6, 0.7], device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)


def extract_embedding(pil_img):
    faces = mtcnn(pil_img)
    if faces is None:
        print("[❌] Không phát hiện được khuôn mặt trong ảnh.")
        return None

    # Nếu có nhiều khuôn mặt, chọn khuôn mặt lớn nhất
    if isinstance(faces, list):
        areas = [(f.shape[1] * f.shape[2], f) for f in faces]
        face_tensor = max(areas, key=lambda x: x[0])[1]
    else:
        face_tensor = faces

    # Đảm bảo face_tensor có dạng [3,160,160]
    if face_tensor.ndim == 4 and face_tensor.shape[0] == 1:
        face_tensor = face_tensor.squeeze(0)

    with torch.no_grad():
        emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
        emb_norm = normalize(emb.reshape(1, -1))[0]
        print("[✅] Đã trích xuất embedding khuôn mặt:", emb_norm[:5], "...")
        return emb_norm

def verify_face(pil_img, threshold=0.6):
    # Load database
    if not os.path.exists(DB_PATH):
        raise RuntimeError("❌ Chưa có database.pkl, vui lòng đăng ký trước.")

    with open(DB_PATH, "rb") as f:
        db = pickle.load(f)

    print(f"\n[ℹ️] Đã tải database với {len(db)} sinh viên.")

    emb = extract_embedding(pil_img)
    if emb is None:
        print("[❌] Không phát hiện khuôn mặt trong ảnh gửi lên.")
        return None, 0.0

    best_match = None
    best_score = -1

    print("[🔍] Bắt đầu so khớp khuôn mặt...")

    # So sánh với từng sinh viên trong database
    for student_id, embeddings in db.items():
        scores = cosine_similarity([emb], embeddings)
        max_score = float(scores.max())
        print(f"🧩 {student_id:<15} | Điểm tương đồng cao nhất: {max_score:.4f}")
        if max_score > best_score:
            best_score = max_score
            best_match = student_id

    print("───────────────────────────────")
    if best_score >= threshold:
        print(f"[✅] Kết quả: KHỚP với sinh viên {best_match}")
        print(f"[📈] Độ tương đồng: {best_score:.4f}")
        return best_match, best_score
    else:
        print(f"[⚠️] Không có khuôn mặt nào vượt ngưỡng {threshold}")
        print(f"[📉] Điểm cao nhất: {best_score:.4f}")
        return None, best_score
