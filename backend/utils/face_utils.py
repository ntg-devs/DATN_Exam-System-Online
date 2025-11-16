import cv2
import numpy as np

def extract_face_embedding(video_path, model):
    # Cắt 1 frame giữa video
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
    ret, frame = cap.read()
    cap.release()

    # Tiền xử lý ảnh (resize, normalize)
    face = cv2.resize(frame, (160, 160)) / 255.0
    face = np.expand_dims(face, axis=0)

    embedding = model.predict(face)[0].tolist()
    return embedding


def verify_face(embedding1, embedding2, threshold=0.8):
    # So sánh khoảng cách cosine
    e1, e2 = np.array(embedding1), np.array(embedding2)
    cos_sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
    return cos_sim > threshold
