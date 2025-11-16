import os
import cv2
import pickle
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sklearn.preprocessing import normalize

# Thiết bị GPU nếu có
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Khởi tạo model
mtcnn = MTCNN(keep_all=False, device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# Đường dẫn lưu embeddings
DB_PATH = os.path.join(os.path.dirname(__file__), "database.pkl")

def extract_embedding_from_pil(pil_img):
    """
    Trích xuất embedding từ PIL image
    """
    face_tensor = mtcnn(pil_img)
    if face_tensor is None:
        return None
    with torch.no_grad():
        emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
    return normalize(emb.reshape(1, -1))[0]

def enroll_from_video(video_path, person_id, frame_interval_sec=0.5):
    """
    Trích xuất embeddings từ video
    :param video_path: đường dẫn file video
    :param person_id: student_id
    :param frame_interval_sec: khoảng cách frame (giây)
    :return: số frame embedding thành công
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    interval = max(int(fps * frame_interval_sec), 1)  # đảm bảo ít nhất 1 frame

    embeddings = []
    idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % interval == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil = Image.fromarray(rgb)
            emb = extract_embedding_from_pil(pil)
            if emb is not None:
                embeddings.append(emb)
        idx += 1
    cap.release()

    if not embeddings:
        raise RuntimeError("Không phát hiện khuôn mặt trong video")

    # Load database.pkl cũ nếu có
    db = {}
    if os.path.exists(DB_PATH):
        with open(DB_PATH, "rb") as f:
            db = pickle.load(f)

    # Ghi embeddings mới
    db[person_id] = embeddings
    with open(DB_PATH, "wb") as f:
        pickle.dump(db, f)

    return len(embeddings)
