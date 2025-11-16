import cv2
import torch
import pickle
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sklearn.preprocessing import normalize
from scipy.spatial.distance import cosine

# Thiết bị GPU nếu có
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Khởi tạo model
mtcnn = MTCNN(keep_all=False, device=DEVICE)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)

# Load database embeddings
DB_PATH = "E:/TN_Project/P_ActionRecognition/Online_Exam_System/backend/services/face_recognition/database.pkl"
with open(DB_PATH, "rb") as f:
    database = pickle.load(f)  # dict: {student_id: [embedding, ...]}

# Hàm trích xuất embedding từ frame
def extract_embedding_from_frame(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    face_tensor = mtcnn(pil)
    if face_tensor is None:
        return None
    with torch.no_grad():
        emb = resnet(face_tensor.unsqueeze(0).to(DEVICE)).cpu().numpy().squeeze(0)
    return normalize(emb.reshape(1, -1))[0]

# So sánh embedding với database
def recognize_face(embedding, threshold=0.5):
    for student_id, emb_list in database.items():
        for db_emb in emb_list:
            dist = cosine(embedding, db_emb)
            if dist < threshold:
                return student_id, dist
    return None, None

# Bật camera
cap = cv2.VideoCapture(0)  # 0 là webcam mặc định

if not cap.isOpened():
    print("Không mở được camera")
    exit()

print("Bắt đầu camera. Nhấn 'q' để thoát.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    emb = extract_embedding_from_frame(frame)
    text = "Không nhận diện"
    if emb is not None:
        student_id, dist = recognize_face(emb)
        if student_id:
            text = f"Nhận diện: {student_id} (dist={dist:.2f})"

    # Hiển thị
    cv2.putText(frame, text, (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.imshow("Face Recognition Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
