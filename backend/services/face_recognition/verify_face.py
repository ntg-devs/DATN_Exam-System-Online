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
DB_PATH = os.path.join(os.path.dirname(__file__), "database2.pkl")

# Khởi tạo MTCNN phát hiện nhiều khuôn mặt
mtcnn = MTCNN(keep_all=True, thresholds=[0.5, 0.6, 0.7], device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)


# --------------------------------------------------------------
# TRÍCH XUẤT EMBEDDING TỪ MỖI KHUÔN MẶT
# --------------------------------------------------------------
def extract_embeddings(pil_img):
    """Trích xuất embedding cho tất cả khuôn mặt trong ảnh."""
    faces = mtcnn(pil_img)

    if faces is None:
        print("[❌] Không phát hiện được khuôn mặt.")
        return None

    face_tensors = []
    # Nếu có N khuôn mặt → faces sẽ có shape [N,3,160,160]
    if faces.ndim == 4:
        for i in range(faces.shape[0]):
            face_tensors.append(faces[i])
    else:
        face_tensors.append(faces)

    embeddings = []

    for face_tensor in face_tensors:
        with torch.no_grad():
            emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
            emb_norm = normalize(emb.reshape(1, -1))[0]
            embeddings.append(emb_norm)

    print(f"[✅] Phát hiện {len(embeddings)} khuôn mặt trong ảnh.")
    return embeddings


# --------------------------------------------------------------
# NHẬN DIỆN TẤT CẢ KHUÔN MẶT TRONG ẢNH
# --------------------------------------------------------------
def verify_face_multi(pil_img, threshold=0.6):
    """Nhận diện nhiều người cùng lúc từ database2.pkl."""
    if not os.path.exists(DB_PATH):
        raise RuntimeError("❌ Không tìm thấy database2.pkl. Vui lòng training trước.")

    with open(DB_PATH, "rb") as f:
        db = pickle.load(f)

    print(f"[ℹ️] Database chứa {len(db)} sinh viên.")

    embeddings = extract_embeddings(pil_img)
    if embeddings is None:
        return []

    results = []

    for idx, emb in enumerate(embeddings):
        print(f"\n[🔍] So khớp khuôn mặt thứ {idx + 1}...")

        best_match = "unknown"
        best_score = -1

        for student_id, stored_embs in db.items():
            score = cosine_similarity([emb], stored_embs).max()

            if score > best_score:
                best_score = score
                best_match = student_id

        if best_score < threshold:
            best_match = "unknown"

        results.append({
            "face_index": idx,
            "student_id": best_match,
            "score": float(best_score)
        })

        print(f"➡️ Kết quả: {best_match} | score={best_score:.4f}")

    return results
