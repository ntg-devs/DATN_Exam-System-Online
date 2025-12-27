"""
Face recognition utilities
"""
import os
import pickle
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN
from sklearn.metrics.pairwise import cosine_similarity
from services.face_recognition.enroll_from_video_f import extract_embedding

# Configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "services", "face_recognition", "database2.pkl"
)

# Load face database
if os.path.exists(DB_PATH):
    try:
        with open(DB_PATH, "rb") as f:
            face_db = pickle.load(f)
            print("Loaded face database:", DB_PATH)
    except:
        print("❌ Lỗi khi đọc database, tạo DB mới...")
        face_db = {}
else:
    print("⚠️ Không tìm thấy database2.pkl → Tạo DB rỗng")
    face_db = {}

mtcnn = MTCNN(keep_all=True, device=DEVICE)

# Constants
FACE_SIMILARITY_THRESHOLD = 0.65
FACE_CHECK_INTERVAL_MS = 30_000  # nhận diện khuôn mặt mỗi 30s
MULTI_FACE_VIOLATION_MIN = 2
UNKNOWN_FACE_PERSIST_MS = 3_000
BEHAVIOR_VIOLATION_DURATION_MS = 5_000  # hành vi kéo dài 5s → vi phạm


def extract_embedding_from_pil(pil_img):
    faces = mtcnn(pil_img)
    if faces is None:
        return None
    if isinstance(faces, list):
        faces = torch.stack(faces)
    return extract_embedding(faces[0])


def _detect_faces_pil(pil_img):
    boxes, probs = mtcnn.detect(pil_img)
    faces_tensor = mtcnn(pil_img)
    return boxes, probs, faces_tensor


def _compute_face_results_from_tensors(faces_tensor):
    if isinstance(faces_tensor, list):
        if len(faces_tensor) == 0:
            return []
        faces_stack = torch.stack(faces_tensor)
    else:
        faces_stack = faces_tensor

    results = []
    for i in range(faces_stack.shape[0]):
        ft = faces_stack[i]
        emb = extract_embedding(ft)
        results.append(emb)
    return results


def _find_best_label_for_emb(emb, db, threshold=FACE_SIMILARITY_THRESHOLD):
    best_score = -1.0
    best_label = "unknown"

    emb = np.asarray(emb).reshape(1, -1)  

    for person_id, data in db.items():
        if "mean" not in data:
            continue

        mean_emb = np.asarray(data["mean"]).reshape(1, -1)

        sc = cosine_similarity(emb, mean_emb)[0][0]

        if sc > best_score:
            best_score = float(sc)
            if sc >= threshold:
                best_label = person_id

    return best_label, float(best_score)


def get_face_db():
    """Get face database (reload if needed)"""
    global face_db
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, "rb") as f:
                face_db = pickle.load(f)
        except:
            face_db = {}
    return face_db
