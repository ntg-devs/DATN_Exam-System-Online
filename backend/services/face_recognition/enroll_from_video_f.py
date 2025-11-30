# Final
# import os
# import cv2
# import pickle
# import torch
# import numpy as np
# from PIL import Image
# from facenet_pytorch import MTCNN, InceptionResnetV1
# from sklearn.preprocessing import normalize
# from sklearn.metrics.pairwise import cosine_similarity
# from collections import deque

# # =========================
# # Cấu hình thiết bị
# # =========================
# DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# DB_PATH = os.path.join(os.path.dirname(__file__), "database.pkl")

# # =========================
# # Khởi tạo MTCNN và ResNet
# # =========================
# mtcnn = MTCNN(
#     keep_all=True,
#     thresholds=[0.5, 0.6, 0.7],
#     factor=0.7,
#     min_face_size=40,  # ✅ sửa đúng tên tham số
#     device=DEVICE
# )
# resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# # =========================
# # Hàm trích xuất embedding
# # =========================
# def extract_embedding(pil_img):
#     faces = mtcnn(pil_img)
#     if faces is None:
#         return None
#     # Chọn khuôn mặt lớn nhất (nếu nhiều mặt)
#     if isinstance(faces, list):
#         areas = [(f.shape[1] * f.shape[2], f) for f in faces]
#         face_tensor = max(areas, key=lambda x: x[0])[1]
#     else:
#         face_tensor = faces
#     with torch.no_grad():
#         emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
#         return normalize(emb.reshape(1, -1))[0]

# # =========================
# # Hàm enroll từ video
# # =========================
# def enroll_from_video(video_path, person_id, frame_interval_sec=0.25):
#     cap = cv2.VideoCapture(video_path)
#     fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
#     interval = max(int(fps * frame_interval_sec), 1)

#     embeddings = []
#     idx = 0

#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#         if idx % interval == 0:
#             rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             pil = Image.fromarray(rgb)
#             emb = extract_embedding(pil)
#             if emb is not None:
#                 embeddings.append(emb)
#         idx += 1
#     cap.release()

#     if not embeddings:
#         raise RuntimeError("Không phát hiện khuôn mặt trong video")

#     # Load database
#     db = {}
#     if os.path.exists(DB_PATH):
#         with open(DB_PATH, "rb") as f:
#             db = pickle.load(f)

#     db[person_id] = embeddings
#     with open(DB_PATH, "wb") as f:
#         pickle.dump(db, f)

#     print(f"[INFO] Enroll xong {len(embeddings)} embeddings cho {person_id}")
#     return len(embeddings)

# # =========================
# # Nhận diện khuôn mặt realtime với voting
# # =========================
# def recognize_face(test_emb, db, threshold=0.6):
#     best_match = None
#     best_score = -1
#     for person_id, embeddings in db.items():
#         scores = cosine_similarity([test_emb], embeddings)
#         max_score = scores.max()
#         if max_score > best_score:
#             best_score = max_score
#             best_match = person_id
#     if best_score >= threshold:
#         return best_match, best_score
#     return None, best_score


# def run_realtime_recognition(video_source=0, vote_window=5):
#     # Load database
#     if not os.path.exists(DB_PATH):
#         print("[ERROR] Database không tồn tại. Enroll trước!")
#         return
#     with open(DB_PATH, "rb") as f:
#         db = pickle.load(f)

#     cap = cv2.VideoCapture(video_source)
#     votes = deque(maxlen=vote_window)

#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#         rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         pil = Image.fromarray(rgb)

#         emb = extract_embedding(pil)
#         label = "Unknown"
#         score = 0.0

#         if emb is not None:
#             person, s = recognize_face(emb, db)
#             votes.append(person)
#             vote_counts = {v: votes.count(v) for v in set(votes) if v is not None}
#             if vote_counts:
#                 label = max(vote_counts, key=vote_counts.get)
#                 score = s

#             # Vẽ khung mặt
#             boxes, _ = mtcnn.detect(pil)
#             if boxes is not None:
#                 x1, y1, x2, y2 = map(int, boxes[0])
#                 cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
#                 cv2.putText(frame, f"{label} ({score:.2f})", (x1, y1 - 10),
#                             cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

#         cv2.imshow("Face Recognition", frame)
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break

#     cap.release()
#     cv2.destroyAllWindows()

# # =========================
# # Ví dụ sử dụng
# # =========================
# if __name__ == "__main__":
#     # enroll_from_video("student1.mp4", "student1")
#     run_realtime_recognition(video_source=0)


import os
import cv2
import pickle
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sklearn.preprocessing import normalize

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DB_PATH = os.path.join(os.path.dirname(__file__), "database2.pkl")

# Khởi tạo MTCNN & ResNet
mtcnn = MTCNN(keep_all=True, min_face_size=40, device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)


def extract_embedding(face_tensor):
    with torch.no_grad():
        emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze()
    emb = normalize(emb.reshape(1, -1))[0]
    return emb


def enroll_from_video(video_path, student_id, min_frames=5):
    cap = cv2.VideoCapture(video_path)
    embeddings = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % 5 == 0:  # Lấy 1 frame mỗi 5 frame
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil = Image.fromarray(rgb)

            # Detect face & boxes
            boxes, probs = mtcnn.detect(pil)
            faces = mtcnn(pil)

            if boxes is None or faces is None:
                frame_idx += 1
                continue

            # Đồng bộ index: chọn face lớn nhất theo diện tích box
            areas = [(b[2]-b[0])*(b[3]-b[1]) for b in boxes]
            idx = int(np.argmax(areas))
            if isinstance(faces, list):
                faces = torch.stack(faces)

            face_tensor = faces[idx]

            # Chỉ enroll frame có confidence cao
            if probs is not None and probs[idx] < 0.90:
                frame_idx += 1
                continue

            embeddings.append(extract_embedding(face_tensor))

        frame_idx += 1

    cap.release()

    if len(embeddings) < min_frames:
        raise RuntimeError("Quá ít frame có mặt, vui lòng quay lại video rõ khuôn mặt!")

    # Load hoặc tạo database
    if os.path.exists(DB_PATH):
        db = pickle.load(open(DB_PATH, "rb"))
    else:
        db = {}

    db[student_id] = embeddings
    pickle.dump(db, open(DB_PATH, "wb"))
    return len(embeddings)
