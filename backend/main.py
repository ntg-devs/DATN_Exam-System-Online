

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.socket_manager.connection_manager import ConnectionManager
from services.behavior_detected.behavior_recognition import BehaviorRecognitionService
from services.behavior_detected.behavior_recognition_fcnn import BehaviorDetectionService
# from services.face_recognition.enroll_from_video import enroll_from_video
from services.face_recognition.enroll_from_video_f import enroll_from_video, extract_embedding
# from services.face_recognition.verify_face import verify_face
from PIL import Image
import os, io, base64, cv2, numpy as np, json
from datetime import datetime, timedelta, timezone
import pickle
from pathlib import Path

from pydantic import BaseModel, EmailStr
from sklearn.metrics.pairwise import cosine_similarity
from facenet_pytorch import MTCNN, InceptionResnetV1 
from sklearn.preprocessing import normalize

from database.mongo import exams_collection 
from database.mongo import users_collection 
from database.mongo import classes_collection
from database.mongo import violates_collection
from database.mongo import exam_sessions_collection
from bson import ObjectId
from passlib.hash import bcrypt
from typing import Optional
import asyncio
import torch
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import timedelta



# ==========================
# Khởi tạo App + CORS
# ==========================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()
# behavior_service = BehaviorRecognitionService("models/final_model2.pth")
# Detector hành vi (Faster R-CNN)
behavior_service2 = BehaviorDetectionService("models/fasterrcnn_final.pth")

#Bổ sung logic lưu hình ảnh khi đăng kí

def extract_frame_at_5s(video_path: str, target_second: float = 5.0):
    """
    Trích frame tại giây thứ 5 - HOÀN TOÀN AN TOÀN với .webm từ trình duyệt
    """
    if not os.path.exists(video_path):
        return None, "File video không tồn tại"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, "Không thể mở video"

    # === LẤY THỜI GIAN THỰC QUA CAP_PROP_POS_MSEC (đáng tin nhất) ===
    # Đây là cách DUY NHẤT hoạt động ổn định với .webm từ browser
    target_ms = target_second * 1000  # 5000ms

    # Di chuyển đến đúng mili giây
    success = cap.set(cv2.CAP_PROP_POS_MSEC, target_ms)
    
    ret, frame = cap.read()
    cap.release()

    if ret and frame is not None:
        # Thành công → encode ngay
        encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if encoded:
            return base64.b64encode(buffer).decode('utf-8'), None
        else:
            return None, "Encode JPEG thất bại"

    # === Nếu thất bại → video quá ngắn hoặc không hỗ trợ POS_MSEC → dùng cách đọc tuần tự ===
    print("CAP_PROP_POS_MSEC thất bại → dùng đọc tuần tự (chậm nhưng chắc chắn)")
    return _extract_by_reading_frames(video_path, target_second)


def _extract_by_reading_frames(video_path: str, target_second: float = 5.0):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, "Fallback: Không mở được video"

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            # Video ngắn hơn → lấy frame cuối
            cap.release()
            cap = cv2.VideoCapture(video_path)
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_count - 1))
            _, frame = cap.read()
            cap.release()
            if frame is not None:
                encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                if encoded:
                    return base64.b64encode(buffer).decode('utf-8'), None
            return None, "Video quá ngắn"

        current_time = frame_count / fps
        if current_time >= target_second:
            cap.release()
            encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if encoded:
                return base64.b64encode(buffer).decode('utf-8'), None
            return None, "Encode thất bại"

        frame_count += 1

        # Bảo vệ treo (tối đa ~30-40s video)
        if frame_count > 1000:
            cap.release()
            return None, "Video quá dài hoặc lỗi"


@app.post("/api/register-video")
async def register_video(
    student_id: str = Form(...),
    name: str = Form(...),
    video: UploadFile = File(...)
):
    try:
        VIDEO_DIR = "registered_videos"
        os.makedirs(VIDEO_DIR, exist_ok=True)

        # 1. Lưu video
        path = os.path.join(VIDEO_DIR, f"{student_id}.webm")
        with open(path, "wb") as f:
            f.write(await video.read())

        # ✅ Đánh dấu trạng thái xử lý ngay khi nhận video
        await users_collection.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "face_processing_status": "processing",
                    "face_registered": False,
                }
            }
        )

        # 👉 GỬI THÔNG BÁO PENDING
        await notify_student(student_id, {
            "type": "face_register_pending",
            "student_id": student_id,
            "message": "Hệ thống đang xử lý video đăng ký..."
        })

        # 2. Training khuôn mặt
        frames_used = enroll_from_video(path, student_id)

        # 3. TRÍCH FRAME GIÂY THỨ 5
        frame_base64, error_msg = extract_frame_at_5s(path)

        if error_msg:
            raise Exception(f"Không thể lấy ảnh preview: {error_msg}")

        if frame_base64 is None:
            raise Exception("Không thể trích xuất hình ảnh ở giây thứ 5.")

        # 4. LƯU VÀO DATABASE
        await users_collection.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "face_image": frame_base64,
                    "face_processing_status": "completed",
                    "face_registered": True,
                }
            }
        )

        # GỬI SUCCESS
        await notify_student(student_id, {
            "type": "face_register_success",
            "student_id": student_id,
            "name": name,
            "message": "Đăng ký khuôn mặt thành công!",
            "preview_image": frame_base64
        })

        # 5. TRẢ VỀ FE LUÔN ẢNH BASE64
        return {
            "success": True,
            "message": f"✅ Đăng ký thành công cho sinh viên có mã {name}",
            "frames_used": frames_used,
            "saved_image": True,
            "face_image": frame_base64
        }

    except Exception as e:
        # GỬI FAILED TỚI ĐÚNG STUDENT
        await notify_student(student_id, {
            "type": "face_register_failed",
            "student_id": student_id,
            "error": str(e)
        })
        # ✅ Lưu trạng thái thất bại cho việc check sau này
        await users_collection.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "face_processing_status": "failed",
                    "face_registered": False,
                }
            }
        )
        return {"detail": str(e)}

#Realtime cho thông báo đăng kí khuôn mặt
active_student_clients = {}  
@app.websocket("/ws/student_register_video")
async def ws_student(websocket: WebSocket):
    await websocket.accept()

    # Nhận student_id từ FE
    student_id = await websocket.receive_text()

    # Lưu vào danh sách client
    active_student_clients[student_id] = websocket
    print("WS connected:", student_id)

    try:
        while True:
            await websocket.receive_text()  # giữ kết nối
    except:
        # Disconnect
        if student_id in active_student_clients:
            del active_student_clients[student_id]
        print("WS disconnected:", student_id)

async def notify_student(student_id: str, event: dict):
    ws = active_student_clients.get(student_id)

    if not ws:
        return  # Student không online → bỏ qua

    try:
        await ws.send_json(event)
    except:
        del active_student_clients[student_id]


# ==========================
# API: Xác thực khuôn mặt
    # ==========================
# @app.post("/api/verify-face")
# async def verify_face_api(image: UploadFile = File(...)):
#     try:
#         img_bytes = await image.read()
#         pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
#         person_id, score = verify_face(pil_img)
#         if person_id:
#             return {"verified": True, "student": {"student_id": person_id}, "similarity": score}
#         else:
#             return {"verified": False, "similarity": score, "detail": "Không nhận diện được khuôn mặt."}
#     except Exception as e:
#         return {"verified": False, "detail": str(e)}

# ============================
# CẤU HÌNH
# ============================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DB_PATH = os.path.join(
    os.path.dirname(__file__), "services", "face_recognition", "database2.pkl"
)
# with open(DB_PATH, "rb") as f:
#     face_db = pickle.load(f)

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


def extract_embedding_from_pil(pil_img):
    faces = mtcnn(pil_img)
    if faces is None:
        return None
    if isinstance(faces, list):
        faces = torch.stack(faces)
    return extract_embedding(faces[0])


@app.post("/api/verify-face")
async def verify_face_api(image: UploadFile = File(...)):

    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    boxes, _ = mtcnn.detect(pil_img)

    if boxes is None:
        return {"verified": False, "faces": []}

    db = pickle.load(open(DB_PATH, "rb"))
    results = []

    faces_tensor = mtcnn(pil_img)

    if isinstance(faces_tensor, list):
        faces_tensor = torch.stack(faces_tensor)

    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = map(int, box)

        face_tensor = faces_tensor[i]
        emb = extract_embedding(face_tensor)

        best_score = -1
        best_label = "unknown"

        for person_id, data in db.items():
            mean_emb = np.asarray(data["mean"]) 
            sc = cosine_similarity(
                emb.reshape(1, -1),
                mean_emb.reshape(1, -1)
            )[0][0]

            if sc > best_score:
                best_score = sc
                if sc >= 0.65:
                    best_label = person_id


        results.append({
            "label": best_label,
            "similarity": float(best_score),
            "box": [x1, y1, x2, y2]
        })

    verified = any(r["label"] != "unknown" for r in results)

    return {
        "verified": verified,
        "faces": results
    }

# ==========================
# WS: Học sinh
# ==========================

# Nhận diện hành vi sinh viên có bổ sung nhận diện khuôn mặt realtime 

# Final optimizations
# ===========================
# CONFIG
# ===========================
FACE_SIMILARITY_THRESHOLD = 0.65
FACE_CHECK_INTERVAL_MS = 30_000  # nhận diện khuôn mặt mỗi 30s
MULTI_FACE_VIOLATION_MIN = 2
UNKNOWN_FACE_PERSIST_MS = 3_000
BEHAVIOR_VIOLATION_DURATION_MS = 5_000  # hành vi kéo dài 5s → vi phạm

# ===========================
# HELPER FUNCTIONS
# ===========================
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


# ===========================
# WEBSOCKET HANDLER
# ===========================
violation_state = {}

@app.websocket("/ws/student")
async def ws_student(websocket: WebSocket):
    from fastapi import WebSocketDisconnect
    await websocket.accept()

    exam = websocket.query_params.get("exam")
    session = websocket.query_params.get("session")
    print("aaa", session)
    student = websocket.query_params.get("student")
    class_id = websocket.query_params.get("class_id")

    await manager.connect_student(exam, session, student, websocket)
    await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

    violation_state[student] = {
        "last_behavior": None,
        "behavior_start_ts": None,
        "behavior_reported": False,
        "last_face_check_ts": 0,
        "unknown_start_ts": None,
        "unknown_reported": False,
    }

    loop = asyncio.get_running_loop()

    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except:
                continue

            if data.get("type") != "frame":
                continue

            ts = int(data["ts"])
            b64 = data["b64"].split(",")[1]
            img_bytes = base64.b64decode(b64)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            track = violation_state[student]
            now_ms = ts

            # -------------------------
            # 1) BEHAVIOR DETECTION (liên tục)
            # -------------------------
            detections = behavior_service2.predict(frame, score_thresh=0.4)
            abnormal = [d for d in detections if d["label"] != "normal"]
            top = max(abnormal, key=lambda d: d["score"]) if abnormal else {"label": "normal", "score": 1.0}
            behavior = top["label"]
            score = top["score"]

            if behavior != "normal" and score > 0.5:
                if track["last_behavior"] != behavior:
                    track["last_behavior"] = behavior
                    track["behavior_start_ts"] = now_ms
                    track["behavior_reported"] = False
                else:
                    duration = now_ms - (track["behavior_start_ts"] or now_ms)
                    if duration >= BEHAVIOR_VIOLATION_DURATION_MS and not track["behavior_reported"]:
                        track["behavior_reported"] = True
                        draw_frame = behavior_service2.draw_detections(frame, detections)
                        _, buffer = cv2.imencode(".jpg", draw_frame)
                        evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

                        await violates_collection.insert_one({
                            "student": student,
                            "exam_id": exam,
                            "class_id": class_id,
                            "type": "behavior",
                            "behavior": behavior,
                            "score": score,
                            "start_ts": track["behavior_start_ts"],
                            "end_ts": now_ms,
                            "duration_ms": duration,
                            "timestamp": datetime.utcnow(),
                            "evidence": evidence_b64,
                        })
                        await manager.broadcast_teachers(exam, {
                            "type": "violation_detected",
                            "student": student,
                            "behavior": behavior,
                            "duration": duration,
                            "timestamp": now_ms,
                            "evidence": evidence_b64,
                        })
            else:
                track["last_behavior"] = None
                track["behavior_start_ts"] = None
                track["behavior_reported"] = False

            # -------------------------
            # 2) FACE CHECK (mỗi 30s)
            # -------------------------
            face_results = []          # <--- reset mỗi frame để tránh giữ giá trị cũ
            ran_face_check = False     # <--- đánh dấu xem frame này có chạy 30s hay không

            if now_ms - track["last_face_check_ts"] >= FACE_CHECK_INTERVAL_MS:
                ran_face_check = True
                track["last_face_check_ts"] = now_ms
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

                try:
                    boxes, probs, faces_tensor = await loop.run_in_executor(None, _detect_faces_pil, pil_img)
                except:
                    boxes = None
                    faces_tensor = None

                face_violation_happened = False

                if boxes is None or len(boxes) == 0:
                    track["unknown_start_ts"] = None
                    track["unknown_reported"] = False

                else:
                    try:
                        embs = await loop.run_in_executor(None, _compute_face_results_from_tensors, faces_tensor)
                    except:
                        embs = []

                    detected_faces = []
                    for idx, box in enumerate(boxes):
                        x1, y1, x2, y2 = map(int, box)
                        emb = embs[idx] if idx < len(embs) else None

                        if emb is None:
                            label = "unknown"
                            sim = 0.0
                        else:
                            label, sim = _find_best_label_for_emb(emb, face_db, threshold=FACE_SIMILARITY_THRESHOLD)

                        detected_faces.append({
                            "box": [x1, y1, x2, y2],
                            "label": label,
                            "similarity": sim,
                        })

                    face_results = detected_faces

                    # --- Face Violation Rules ---
                    if len(detected_faces) >= MULTI_FACE_VIOLATION_MIN:
                        face_violation_happened = True
                        reason = "multi_face"

                    elif len(detected_faces) == 1:
                        f = detected_faces[0]

                        if f["label"] == "unknown" or f["label"] != student:
                            if f["label"] == "unknown":
                                if track["unknown_start_ts"] is None:
                                    track["unknown_start_ts"] = now_ms
                                else:
                                    duration_unknown = now_ms - track["unknown_start_ts"]
                                    if duration_unknown >= UNKNOWN_FACE_PERSIST_MS and not track["unknown_reported"]:
                                        track["unknown_reported"] = True
                                        face_violation_happened = True
                                        reason = "Nghi vấn thi hộ"
                            else:
                                face_violation_happened = True
                                reason = "mismatch_face"

                        else:
                            track["unknown_start_ts"] = None
                            track["unknown_reported"] = False

                    # --- Gửi vi phạm (nếu có) ---
                    if face_violation_happened:
                        draw = frame.copy()
                        for f in detected_faces:
                            x1, y1, x2, y2 = f["box"]
                            color = (0,255,0) if f["label"] == student else (0,0,255)
                            cv2.rectangle(draw, (x1,y1), (x2,y2), color, 2)
                            text = f"{f['label']}:{f['similarity']:.2f}"
                            cv2.putText(draw, text, (x1, max(0,y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                        _, buffer = cv2.imencode(".jpg", draw)
                        evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

                        await violates_collection.insert_one({
                            "student": student,
                            "exam_id": exam,
                            "class_id": class_id,
                            "type": "face",
                            "reason": reason,
                            "faces": detected_faces,
                            "timestamp": datetime.utcnow(),
                            "evidence": evidence_b64,
                        })

                        await manager.broadcast_teachers(exam, {
                            "type": "face_alert",
                            "student": student,
                            "reason": reason,
                            "faces": detected_faces,
                            "timestamp": now_ms,
                            "evidence": evidence_b64,
                        })

            # -------------------------
            # 3) DRAW FINAL FRAME
            # -------------------------
            draw_frame = behavior_service2.draw_detections(frame, detections)

            # ❗Chỉ vẽ box khuôn mặt khi thực sự detect (mỗi 30s)
            if ran_face_check:
                for f in face_results:
                    x1, y1, x2, y2 = f["box"]
                    color = (0,255,0) if f["label"] == student else (0,0,255)
                    cv2.rectangle(draw_frame, (x1,y1), (x2,y2), color, 2)
                    text = f"{f['label']}:{f['similarity']:.2f}"
                    cv2.putText(draw_frame, text, (x1, max(0,y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            _, buffer = cv2.imencode(".jpg", draw_frame)
            frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

            # Gửi client và teacher
            await websocket.send_json({
                "type": "self_assessment",
                "detections": detections,
                "frame_b64": frame_b64,
                "ts": ts,
                "faces": face_results if ran_face_check else [],   # <--- CHỈ GỬI MỖI 30s
            })

            await manager.broadcast_teachers(exam, {
                "type": "student_frame",
                "student": student,
                "detections": detections,
                "frame_b64": frame_b64,
                "ts": ts,
                "faces": face_results if ran_face_check else [],   # <--- CHỈ GỬI MỖI 30s
            })


    except WebSocketDisconnect:
        violation_state.pop(student, None)
        await manager.disconnect_student(exam, session, student)
        print(f"🔴 Student {student} disconnected")


# ==========================
# API UPLOAD VIDEO
# ==========================
# @app.post("/api/analyze-video")
# async def analyze_video(file: UploadFile = File(...)):

#     os.makedirs("temp_videos", exist_ok=True)
#     os.makedirs("results", exist_ok=True)

#     # --- Save video ---
#     video_path = f"temp_videos/{file.filename}"
#     with open(video_path, "wb") as f:
#         f.write(await file.read())

#     cap = cv2.VideoCapture(video_path)
#     fps = cap.get(cv2.CAP_PROP_FPS)
#     total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

#     # Lấy 1 frame mỗi 3 giây
#     frame_interval_sec = 3
#     frame_step = int(frame_interval_sec * fps)

#     track = {
#         "last_face_check_ts": 0,
#         "unknown_start_ts": None,
#         "unknown_reported": False,
#     }

#     violations = []

#     frame_index = 0

#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break

#         # Chỉ phân tích frame mỗi 3 giây
#         if frame_index % frame_step == 0:
#             ts_ms = int((frame_index / fps) * 1000)

#             # -----------------
#             # 1) BEHAVIOR DETECTION (ghi nhận ngay)
#             # -----------------
#             detections = behavior_service2.predict(frame, score_thresh=0.4)
#             abnormal = [d for d in detections if d["label"] != "normal"]

#             for d in abnormal:
#                 if d["score"] > 0.5:
#                     violations.append({
#                         "type": "behavior",
#                         "behavior": d["label"],
#                         "score": d["score"],
#                         "timestamp": ts_ms
#                     })

#             # -----------------
#             # 2) FACE DETECTION
#             # -----------------
#             if ts_ms - track["last_face_check_ts"] >= FACE_CHECK_INTERVAL_MS:
#                 track["last_face_check_ts"] = ts_ms

#                 pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
#                 try:
#                     boxes, probs, faces_tensor = _detect_faces_pil(pil_img)
#                 except:
#                     boxes, probs, faces_tensor = None, None, None

#                 if boxes is None or len(boxes) == 0:
#                     track["unknown_start_ts"] = None
#                     track["unknown_reported"] = False
#                 else:
#                     try:
#                         embs = _compute_face_results_from_tensors(faces_tensor)
#                     except:
#                         embs = []

#                     detected_faces = []
#                     for idx, box in enumerate(boxes):
#                         x1, y1, x2, y2 = map(int, box)
#                         emb = embs[idx] if idx < len(embs) else None
#                         if emb is None:
#                             label, sim = "unknown", 0.0
#                         else:
#                             label, sim = _find_best_label_for_emb(emb, face_db, threshold=FACE_SIMILARITY_THRESHOLD)
#                         detected_faces.append({"box":[x1,y1,x2,y2],"label":label,"similarity":sim})

#                     # RULES
#                     if len(detected_faces) >= MULTI_FACE_VIOLATION_MIN:
#                         violations.append({"type":"face","reason":"multi_face","faces":detected_faces,"timestamp":ts_ms})
#                     elif len(detected_faces) == 1:
#                         f = detected_faces[0]
#                         if f["label"]=="unknown":
#                             if track["unknown_start_ts"] is None:
#                                 track["unknown_start_ts"] = ts_ms
#                             else:
#                                 duration = ts_ms - track["unknown_start_ts"]
#                                 if duration >= UNKNOWN_FACE_PERSIST_MS and not track["unknown_reported"]:
#                                     track["unknown_reported"] = True
#                                     violations.append({"type":"face","reason":"unknown_face","faces":detected_faces,"timestamp":ts_ms})
#                         else:
#                             track["unknown_start_ts"] = None
#                             track["unknown_reported"] = False

#         frame_index += 1

#     cap.release()

#     # --- SAVE JSON ---
#     json_path = f"results/violates_{file.filename}.json"
#     with open(json_path, "w", encoding="utf8") as f:
#         json.dump(violations, f, indent=4, ensure_ascii=False)

#     # --- SAVE TXT ---
#     txt_path = f"results/violates_{file.filename}.txt"
#     with open(txt_path, "w", encoding="utf8") as f:
#         for v in violations:
#             f.write(json.dumps(v, ensure_ascii=False) + "\n")

#     return {
#         "status": "done",
#         "total_violations": len(violations),
#         "json_file": json_path,
#         "txt_file": txt_path,
#         "violations": violations
#     }

def cv2_to_base64(img):
    """Chuyển ảnh OpenCV sang base64 string"""
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")

@app.post("/api/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    # --- Tạo thư mục cần thiết ---
    os.makedirs("temp_videos", exist_ok=True)
    os.makedirs("results/images", exist_ok=True)
    os.makedirs("results", exist_ok=True)

    # --- Lưu video tạm ---
    video_path = f"temp_videos/{file.filename}"
    with open(video_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval_sec = 3
    frame_step = int(frame_interval_sec * fps)

    track = {"last_face_check_ts": 0, "unknown_start_ts": None, "unknown_reported": False}
    violations = []
    frame_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % frame_step == 0:
            ts_ms = int((frame_index / fps) * 1000)
            img_copy = frame.copy()

            # -----------------
            # 1) BEHAVIOR DETECTION
            # -----------------
            detections = behavior_service2.predict(frame, score_thresh=0.4)
            abnormal = [d for d in detections if d["label"] != "normal"]

            for d in abnormal:
                if d["score"] > 0.5:
                    # Vẽ bounding box màu đỏ
                    if "box" in d:
                        x1, y1, x2, y2 = map(int, d["box"])
                        cv2.rectangle(img_copy, (x1, y1), (x2, y2), (255, 0, 0), 2)
                        cv2.putText(img_copy, f"{d['label']} {d['score']:.2f}", 
                                    (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,0,0), 1)

                    violations.append({
                        "type": "behavior",
                        "behavior": d["label"],
                        "score": d["score"],
                        "timestamp": ts_ms/1000,
                        "img_base64": cv2_to_base64(img_copy)
                    })

            # -----------------
            # 2) FACE DETECTION
            # -----------------
            if ts_ms - track["last_face_check_ts"] >= FACE_CHECK_INTERVAL_MS:
                track["last_face_check_ts"] = ts_ms
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                try:
                    boxes, probs, faces_tensor = _detect_faces_pil(pil_img)
                except:
                    boxes, probs, faces_tensor = None, None, None

                if boxes is not None and len(boxes) > 0:
                    try:
                        embs = _compute_face_results_from_tensors(faces_tensor)
                    except:
                        embs = []

                    detected_faces = []
                    for idx, box in enumerate(boxes):
                        x1, y1, x2, y2 = map(int, box)
                        emb = embs[idx] if idx < len(embs) else None
                        label, sim = ("unknown", 0.0) if emb is None else _find_best_label_for_emb(
                            emb, face_db, threshold=FACE_SIMILARITY_THRESHOLD
                        )
                        detected_faces.append({"box":[x1,y1,x2,y2],"label":label,"similarity":sim})

                        # Vẽ bounding box màu đỏ cho vi phạm
                        cv2.rectangle(img_copy, (x1, y1), (x2, y2), (255, 0, 0), 2)
                        cv2.putText(img_copy, f"{label} {sim:.2f}", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,0,0), 1)

                    # RULES
                    if len(detected_faces) >= MULTI_FACE_VIOLATION_MIN:
                        violations.append({
                            "type":"face",
                            "reason":"multi_face",
                            "faces":detected_faces,
                            "timestamp":ts_ms/1000,
                            "img_base64": cv2_to_base64(img_copy)
                        })
                    elif len(detected_faces) == 1:
                        f = detected_faces[0]
                        if f["label"]=="unknown":
                            if track["unknown_start_ts"] is None:
                                track["unknown_start_ts"] = ts_ms
                            else:
                                duration = ts_ms - track["unknown_start_ts"]
                                if duration >= UNKNOWN_FACE_PERSIST_MS and not track["unknown_reported"]:
                                    track["unknown_reported"] = True
                                    violations.append({
                                        "type":"face",
                                        "reason":"unknown_face",
                                        "faces":detected_faces,
                                        "timestamp":ts_ms/1000,
                                        "img_base64": cv2_to_base64(img_copy)
                                    })
                        else:
                            track["unknown_start_ts"] = None
                            track["unknown_reported"] = False

        frame_index += 1

    cap.release()

    # --- SAVE JSON ---
    json_path = f"results/violates_{file.filename}.json"
    Path(json_path).parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf8") as f:
        json.dump(violations, f, indent=4, ensure_ascii=False)

    # --- SAVE TXT ---
    txt_path = f"results/violates_{file.filename}.txt"
    Path(txt_path).parent.mkdir(parents=True, exist_ok=True)
    with open(txt_path, "w", encoding="utf8") as f:
        for v in violations:
            f.write(json.dumps(v, ensure_ascii=False) + "\n")

    return {
        "status": "done",
        "total_violations": len(violations),
        "json_file": json_path,
        "txt_file": txt_path,
        "violations": violations
    }
# ==========================
# WS: Giáo viên
# ==========================
@app.websocket("/ws/teacher")
async def ws_teacher(websocket: WebSocket):
    exam = websocket.query_params.get("exam")
    await manager.connect_teacher(exam, websocket)

    # Gửi danh sách học sinh hiện có
    await websocket.send_json({
        "type": "student_list",
        "students": manager.get_students_list(exam)
    })

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_teacher(exam, websocket)



#Xử lí database với tác vụ khác

# def serialize_doc(doc):
#     """Chuyển ObjectId thành string để tránh lỗi JSON serialization."""
#     if not doc:
#         return None
#     doc["_id"] = str(doc["_id"])
#     return doc

def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    if "start_time" in doc and doc["start_time"]:
        doc["start_time"] = doc["start_time"].isoformat()
    if "created_at" in doc and doc["created_at"]:
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@app.post("/api/create-exam")
async def create_exam(data: dict):
    class_id = data.get("class_id", "").strip()
    code = data.get("code", "").strip()
    name = data.get("name", "").strip()
    created_by = data.get("created_by", "").strip()
    start_time_str = data.get("start_time")
    duration = data.get("duration")

    # ✅ Kiểm tra dữ liệu bắt buộc
    if not code or not name or not created_by:
        raise HTTPException(status_code=400, detail="Thiếu mã, tên hoặc người tạo.")

    # ✅ Kiểm tra trùng mã phòng
    existing = await exams_collection.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Mã phòng thi đã tồn tại.")

    # ✅ Kiểm tra ID giáo viên hợp lệ
    try:
        teacher = await users_collection.find_one({"_id": ObjectId(created_by)})
    except:
        raise HTTPException(status_code=400, detail="ID người tạo không hợp lệ.")

    if not teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên tạo phòng.")

    # ✅ Xử lý thời gian bắt đầu
    start_time = None
    if start_time_str:
        try:
            start_time = datetime.fromisoformat(start_time_str)
        except:
            raise HTTPException(
                status_code=400,
                detail="Thời gian bắt đầu không hợp lệ. Định dạng: YYYY-MM-DDTHH:MM"
            )

    # ✅ Tạo object phòng thi
    exam = {
        "class_id": class_id,
        "code": code,
        "name": name,
        "created_by": str(created_by), 
        "created_by_name": teacher["name"],
        "start_time": start_time,
        "duration": duration,
        "created_at": datetime.utcnow(),
    }

    # ✅ Lưu vào DB
    result = await exams_collection.insert_one(exam)
    inserted_exam = await exams_collection.find_one({"_id": result.inserted_id})
    inserted_exam_serialized = serialize_doc(inserted_exam)

    # ✅ Gửi realtime đến tất cả client đang mở màn hình danh sách phòng thi
    try:
        await broadcast_exam_created(inserted_exam_serialized)
    except Exception as e:
        print("⚠ Lỗi khi broadcast:", e)


    try:
        await broadcast_class_event({
            "type": "exam_created",
            "class_id": class_id,
            "exam": inserted_exam_serialized
        })
    except Exception as e:
        print("⚠ Lỗi broadcast realtime exam_created:", e)

    # ✅ Trả về response
    return {
        "success": True,
        "exam": inserted_exam_serialized,
    }



@app.get("/api/exams")
async def get_exams():
    exams = []
    async for exam in exams_collection.find():
        exams.append(serialize_doc(exam))
    return {"exams": exams}


@app.post("/api/exams_by_teacher")
async def get_exams_by_teacher(data: dict):
    print(data)
    created_by = data.get("created_by")
    print(created_by)

    if not created_by:
        raise HTTPException(status_code=400, detail="Thiếu ID người tạo.")

    query = {"created_by": created_by}

    exams = []
    async for exam in exams_collection.find(query):
        exams.append(serialize_doc(exam))

    print(exams)
    return {"exams": exams}


class RegisterInput(BaseModel):
    name: str
    student_id: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: str

@app.post("/api/create-user")
async def register_user(data: RegisterInput):
    name = data.name.strip()
    # email = data.email.strip().lower()
    email = (data.email or "").strip().lower()
    role = data.role.strip()

    print(data)

    # 🔒 Giới hạn mật khẩu dưới 72 bytes để tránh lỗi

    if data.password:
        password = data.password.encode("utf-8")[:72].decode("utf-8", errors="ignore")  
    else :
        password = "123456"

    # Hash với rounds=12
    hashed_password = bcrypt.using(rounds=12).hash(password)

    if role not in ["teacher", "student"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")

    if email:
        existing = await users_collection.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email đã tồn tại!")
   
    if data.student_id:
        existing = await users_collection.find_one({"student_id": data.student_id})
        if existing:
            raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại!")

    user = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "student_id": data.student_id,
        "role": role,
        "created_at": datetime.utcnow(),
        "is_active": True
    }

    result = await users_collection.insert_one(user)
    inserted_user = await users_collection.find_one({"_id": result.inserted_id})

    return {"success": True, "user": serialize_doc(inserted_user)}


@app.post("/api/update-user")
async def update_user(data: dict):
    """
    Cập nhật thông tin tài khoản (tên, email, mã sinh viên, role).
    Body: { id, name, email, student_id, role }
    """
    user_id = data.get("id")
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    student_id = (data.get("student_id") or "").strip() or None
    role = (data.get("role") or "").strip()

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ.")

    if not name:
        raise HTTPException(status_code=400, detail="Tên không được để trống.")

    if role and role not in ["teacher", "student", "admin"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")

    user_obj_id = ObjectId(user_id)
    existing_user = await users_collection.find_one({"_id": user_obj_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Kiểm tra trùng email (ngoại trừ chính user này)
    if email:
        dup_email = await users_collection.find_one(
            {"email": email, "_id": {"$ne": user_obj_id}}
        )
        if dup_email:
            raise HTTPException(status_code=400, detail="Email đã tồn tại!")

    # Kiểm tra trùng mã sinh viên (nếu có, ngoại trừ chính user này)
    if student_id:
        dup_student = await users_collection.find_one(
            {"student_id": student_id, "_id": {"$ne": user_obj_id}}
        )
        if dup_student:
            raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại!")

    update_fields = {
        "name": name,
        "email": email,
        "student_id": student_id,
    }
    if role:
        update_fields["role"] = role

    await users_collection.update_one(
        {"_id": user_obj_id},
        {"$set": update_fields},
    )

    updated_user = await users_collection.find_one(
        {"_id": user_obj_id}, {"password": 0}
    )
    return {"success": True, "user": serialize_doc(updated_user)}


@app.post("/api/delete-user")
async def delete_user(data: dict):
    """
    Xóa tài khoản theo id.
    Body: { id }
    """
    user_id = data.get("id")

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ.")

    user_obj_id = ObjectId(user_id)
    user = await users_collection.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # (Optionally có thể chặn xóa admin tại đây)
    # if user.get("role") == "admin":
    #     raise HTTPException(status_code=403, detail="Không thể xóa tài khoản admin.")

    await users_collection.delete_one({"_id": user_obj_id})
    return {"success": True}

@app.post("/api/toggle-user-status")
async def toggle_user_status(data: dict):
    """
    Chuyển đổi trạng thái hoạt động của tài khoản.
    Body: { "id": "user_id" }
    """
    user_id_str = data.get("id")

    print("Received user_id:", user_id_str)
    print("Type:", type(user_id_str))

    if not user_id_str or not ObjectId.is_valid(user_id_str):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ.")

    # Tạo ObjectId MỘT LẦN DUY NHẤT
    user_obj_id = ObjectId(user_id_str)

    # Dùng cùng một object_id cho cả find và update
    user = await users_collection.find_one({"_id": user_obj_id})

    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    print("Found user:", user)  # Thêm dòng này để debug

    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi trạng thái tài khoản admin.")

    new_status = not user.get("is_active", True)

    # Dùng cùng user_obj_id để update
    result = await users_collection.update_one(
        {"_id": user_obj_id},
        {"$set": {"is_active": new_status}}
    )

    # QUAN TRỌNG: Kiểm tra xem có update thành công không
    print("Update result:", result.modified_count)

    if result.modified_count == 0:
        # Có thể do document không thay đổi (ví dụ status đã là new_status)
        # Hoặc do không match (hiếm)
        pass  # vẫn return success, vì request hợp lệ

    return {"success": True, "new_status": new_status}
@app.post("/api/login")
async def login_user(data: dict):
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Email không tồn tại!")

    # 🔐 Cắt password về 72 bytes để khớp với bcrypt hash
    password_trimmed = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")

    if not bcrypt.verify(password_trimmed, user["password"]):
        raise HTTPException(status_code=400, detail="Mật khẩu không chính xác!")

    return {
        "success": True,
        "message": "Đăng nhập thành công!",
        "user": serialize_doc(user),
    }


@app.post("/api/login_face")
async def login_user(data: dict):
    student_id = data.get("student_id", "").strip().upper()

    user = await users_collection.find_one({"student_id": student_id})
    if not user:
        raise HTTPException(status_code=400, detail="Mã sinh viên không tồn tại!")

    return {
        "success": True,
        "message": "Đăng nhập thành công!",
        "user": serialize_doc(user),
    }


@app.post("/api/check-face-registration-status")
async def check_face_registration_status(data: dict):
    """
    Kiểm tra trạng thái đăng ký khuôn mặt của sinh viên.
    Input: { "student_id": "MSSV..." }
    Trả về:
      - status: "pending" | "processing" | "completed" | "failed"
      - can_join_exam: bool
    """
    student_id = data.get("student_id", "").strip().upper()

    if not student_id:
        raise HTTPException(status_code=400, detail="Thiếu student_id.")

    user = await users_collection.find_one({"student_id": student_id})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")

    status = user.get("face_processing_status")

    # Nếu chưa có trạng thái nhưng đã có ảnh khuôn mặt → coi như đã hoàn tất
    if not status:
        if user.get("face_image"):
            status = "completed"
        else:
            status = "pending"

    can_join_exam = status == "completed" and bool(user.get("face_image"))

    return {
        "success": True,
        "status": status,
        "can_join_exam": can_join_exam,
    }


@app.post("/api/change-password")
async def change_password(data: dict):
    """
    Đổi mật khẩu cho user
    data: {
        user_id: str,           # ID người dùng
        current_password: str,  # Mật khẩu hiện tại
        new_password: str       # Mật khẩu mới
    }
    """
    user_id = data.get("user_id", "").strip()
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ.")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự.")

    # Lấy thông tin user
    user_obj_id = ObjectId(user_id)
    user = await users_collection.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Kiểm tra mật khẩu hiện tại
    current_password_trimmed = current_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    if not bcrypt.verify(current_password_trimmed, user["password"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")

    # Hash mật khẩu mới
    new_password_trimmed = new_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    hashed_new_password = bcrypt.using(rounds=12).hash(new_password_trimmed)

    # Cập nhật mật khẩu
    await users_collection.update_one(
        {"_id": user_obj_id},
        {"$set": {"password": hashed_new_password}}
    )

    return {
        "success": True,
        "message": "Đổi mật khẩu thành công!"
    }


active_exam_clients = []

@app.websocket("/ws/exams")
async def ws_exams(websocket: WebSocket):
    await websocket.accept()
    active_exam_clients.append(websocket)
    print("✅ Client connected to exam realtime")

    try:
        while True:
            await asyncio.sleep(1)   # giữ kết nối mở, không cần receive
    except WebSocketDisconnect:
        print("❌ Client disconnected exam realtime")
    finally:
        if websocket in active_exam_clients:
            active_exam_clients.remove(websocket)


# ✅ NEW: Hàm gửi realtime khi có phòng thi mới được tạo
async def broadcast_exam_created(exam):
    print("Broadcast exam:", exam)
    dead = []
    for ws in active_exam_clients:
        try:
            await ws.send_json({
                "type": "exam_created",
                "exam": exam
            })
        except:
            dead.append(ws)

    for ws in dead:
        if ws in active_exam_clients:
            active_exam_clients.remove(ws)


#Logic liên quan lớp học 
# serialize class
def serialize_class(doc):
    """Chuyển ObjectId -> str và thời gian -> ISO."""
    doc["_id"] = str(doc["_id"])
     # created_at có thể là datetime hoặc str → xử lý an toàn
    if "created_at" in doc:
        if hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        else:
            # nếu đã là string thì giữ nguyên
            doc["created_at"] = str(doc["created_at"])
    return doc

# ================================
# 🧩 Tạo lớp học mới
# ================================
@app.post("/api/create-class")
async def create_class(data: dict):
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()
    teacher_id = data.get("teacher_id", "").strip()
    visibility = data.get("visibility", "public")  # public/private
    password = data.get("password", "").strip()  # chỉ dùng cho private

    if not name or not teacher_id:
        raise HTTPException(status_code=400, detail="Thiếu tên lớp hoặc ID giáo viên.")
    if visibility not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="visibility phải là 'public' hoặc 'private'.")
    if visibility == "private" and not password:
        raise HTTPException(status_code=400, detail="Lớp private phải có mật khẩu.")
    if not code:
        raise HTTPException(status_code=400, detail="Vui lòng nhập mã lớp.")

    # Kiểm tra giáo viên tồn tại
    teacher = await users_collection.find_one({"_id": ObjectId(teacher_id), "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên hợp lệ.")

    # Kiểm tra trùng tên lớp cùng giáo viên
    existing_name = await classes_collection.find_one({"name": name, "teacher_id": teacher_id})
    if existing_name:
        raise HTTPException(status_code=400, detail="Tên lớp đã tồn tại.")

    # Kiểm tra trùng mã lớp cùng giáo viên
    existing_code = await classes_collection.find_one({"code": code, "teacher_id": teacher_id})
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã lớp đã tồn tại.")

    new_class = {
        "name": name,
        "code": code,
        "teacher_id": teacher_id,
        "teacher_name": teacher["name"],
        "visibility": visibility,
        "password": password if visibility == "private" else "",
        "students": [],
        "created_at": datetime.utcnow(),
    }

    result = await classes_collection.insert_one(new_class)
    inserted = await classes_collection.find_one({"_id": result.inserted_id})

     # ✅ Realtime: thông báo lớp mới cho tất cả học sinh
    try:
        await broadcast_class_event({
            "type": "class_created",
            "class": serialize_class(inserted)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast lớp mới:", e)

    return {"success": True, "class": serialize_class(inserted)}

# ================================
# 🧩 Lấy danh sách lớp theo user
# ================================
@app.post("/api/get-classes")
async def get_classes(data: dict):
    user_id = data.get("user_id", "").strip()
    role = data.get("role", "teacher")

    if not user_id:
        raise HTTPException(status_code=400, detail="Thiếu user_id.")

    if role == "teacher":
        classes = []
        async for cls in classes_collection.find({"teacher_id": user_id}):
            classes.append(serialize_class(cls))
        return {"success": True, "classes": classes}

    else:  # student
        joined_classes = []
        not_joined_classes = []

        # Lấy tất cả lớp
        async for cls in classes_collection.find({}):
            cls_serialized = serialize_class(cls)
            if user_id in cls.get("students", []):
                joined_classes.append(cls_serialized)
            else:
                not_joined_classes.append(cls_serialized)

        return {
            "success": True,
            "joinedClasses": joined_classes,     # Lớp đã tham gia
            "notJoinedClasses": not_joined_classes  # Lớp chưa tham gia
        }

# ================================
# 🧩 Học sinh tham gia lớp
# ================================
@app.post("/api/join-class")
async def join_class(data: dict):
    class_id = data.get("class_id", "").strip()
    student_id = data.get("student_id", "").strip()
    # Bỏ password - tất cả lớp đều do admin quản lý

    if not class_id or not student_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc student_id.")

    class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")

    # Thêm student nếu chưa tồn tại (không cần check password)
    if student_id not in class_doc.get("students", []):
        await classes_collection.update_one(
            {"_id": ObjectId(class_id)},
            {"$addToSet": {"students": student_id}}
        )

    updated = await classes_collection.find_one({"_id": ObjectId(class_id)})

      # ✅ Realtime: thông báo cập nhật danh sách lớp
    try:
        await broadcast_class_event({
            "type": "class_updated",
            "class": serialize_class(updated)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast join lớp:", e)

    return {"success": True, "class": serialize_class(updated)}

# ================================
# 🧩 Thêm sinh viên vào lớp (giảng viên)
# ================================
@app.post("/api/add-students-to-class")
async def add_students_to_class(data: dict):
    class_id = data.get("class_id", "").strip()
    student_ids = data.get("student_ids", [])

    if not class_id or not isinstance(student_ids, list):
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc student_ids.")

    class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")

    valid_students = []
    for sid in student_ids:
        student = await users_collection.find_one({"_id": ObjectId(sid), "role": "student"})
        if student:
            valid_students.append(str(student["_id"]))

    if not valid_students:
        raise HTTPException(status_code=400, detail="Không có sinh viên hợp lệ để thêm.")

    await classes_collection.update_one(
        {"_id": ObjectId(class_id)},
        {"$addToSet": {"students": {"$each": valid_students}}}
    )

    updated = await classes_collection.find_one({"_id": ObjectId(class_id)})

    # ✅ Realtime: thông báo lớp đã cập nhật (thêm sinh viên)
    try:
        await broadcast_class_event({
            "type": "class_updated",
            "class": serialize_class(updated)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast cập nhật lớp:", e)

    return {"success": True, "class": serialize_class(updated)}

# ================================
# 🧩 Lấy danh sách sinh viên theo giảng viên
# ================================
@app.post("/api/get-students-by-teacher")
async def get_students_by_teacher(data: dict):
    teacher_id = data.get("teacher_id", "").strip()
    if not teacher_id:
        raise HTTPException(status_code=400, detail="Thiếu ID giảng viên.")

    all_student_ids = set()
    async for cls in classes_collection.find({"teacher_id": teacher_id}):
        for sid in cls.get("students", []):
            all_student_ids.add(sid)

    students = []
    async for stu in users_collection.find({"_id": {"$in": [ObjectId(sid) for sid in all_student_ids]}}):
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}

# ================================
# 🧩 Lấy danh sách lịch thi theo lớp
# ================================
@app.post("/api/get-exams-by-class")
async def get_exams_by_class(data: dict):
    class_id = data.get("class_id", "").strip()
    if not class_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id.")

    exams = []
    async for exam in exams_collection.find({"class_id": class_id}):
        exams.append(serialize_doc(exam))

    return {"success": True, "exams": exams}


# ================================
# 🧩 Lấy danh sách sinh viên
# ================================
@app.post("/api/get-users")
async def get_users(data: dict = {}):
    """
    Lấy danh sách tất cả users (giảng viên và sinh viên) hoặc filter theo role.
    data: { role?: 'teacher'|'student' } - Nếu không có role thì lấy tất cả
    """
    role = data.get("role", "").strip()
    
    # Xây dựng query
    query = {}
    if role and role in ["teacher", "student"]:
        query["role"] = role
    
    # Lấy users (không bao gồm password) - sử dụng projection để loại bỏ password ngay từ query
    users = []
    async for user in users_collection.find(query, {"password": 0}):  # projection: loại bỏ password
        users.append(serialize_doc(user))
    
    return {"success": True, "users": users}


# ================================
# 🎓 ADMIN: Quản lý môn học (subjects/classes)
# ================================

@app.post("/api/admin/get-all-classes")
async def admin_get_all_classes(data: dict = {}):
    """
    Admin: Lấy tất cả lớp học (môn học) trong hệ thống
    """
    classes = []
    async for cls in classes_collection.find({}):
        classes.append(serialize_class(cls))
    
    return {"success": True, "classes": classes}


@app.post("/api/admin/create-subject")
async def admin_create_subject(data: dict):
    """
    Admin: Tạo môn học và phân giảng viên
    data: {
        name: str,          # Tên môn học
        code: str,          # Mã môn học
        teacher_id: str,    # ID giảng viên được phân công
        description?: str  # Mô tả (optional)
    }
    """
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()
    teacher_id = data.get("teacher_id", "").strip()
    description = data.get("description", "").strip()

    if not name or not code or not teacher_id:
        raise HTTPException(status_code=400, detail="Thiếu tên môn học, mã môn học hoặc ID giảng viên.")

    # Kiểm tra giảng viên tồn tại
    teacher = await users_collection.find_one({"_id": ObjectId(teacher_id), "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên hợp lệ.")

    # Kiểm tra trùng mã môn học
    existing_code = await classes_collection.find_one({"code": code})
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại.")

    # Tạo môn học (lớp học) với giảng viên được phân công
    new_subject = {
        "name": name,
        "code": code,
        "teacher_id": teacher_id,
        "teacher_name": teacher["name"],
        "visibility": "public",  # Môn học admin tạo mặc định là public
        "password": "",
        "students": [],
        "description": description,
        "created_by_admin": True,  # Đánh dấu do admin tạo
        "created_at": datetime.utcnow(),
    }

    result = await classes_collection.insert_one(new_subject)
    inserted = await classes_collection.find_one({"_id": result.inserted_id})

    # Realtime broadcast cho students
    try:
        await broadcast_class_event({
            "type": "class_created",
            "class": serialize_class(inserted)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast môn học mới:", e)

    # Gửi thông báo tới giảng viên được phân công
    try:
        # WebSocket notification
        notification_event = {
            "type": "assigned_to_subject",
            "subject": serialize_class(inserted),
            "message": f"Bạn đã được phân công giảng dạy môn học: {name} ({code})",
            "created_at": datetime.utcnow().isoformat(),
        }
        await notify_teacher(teacher_id, notification_event)
        
        # Email notification
        teacher_email = teacher.get("email")
        if teacher_email:
            email_subject = f"Phân công giảng dạy môn học: {name}"
            email_body_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Thông báo phân công giảng dạy</h2>
                    <p>Xin chào <strong>{teacher['name']}</strong>,</p>
                    <p>Bạn đã được phân công giảng dạy môn học mới:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Tên môn học:</strong> {name}</p>
                        <p style="margin: 5px 0;"><strong>Mã môn học:</strong> {code}</p>
                        {f'<p style="margin: 5px 0;"><strong>Mô tả:</strong> {description}</p>' if description else ''}
                    </div>
                    <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết và quản lý môn học.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                        Đây là email tự động từ hệ thống Online Exam System.
                    </p>
                </div>
            </body>
            </html>
            """
            email_body_text = f"""
Thông báo phân công giảng dạy

Xin chào {teacher['name']},

Bạn đã được phân công giảng dạy môn học mới:
- Tên môn học: {name}
- Mã môn học: {code}
{f'- Mô tả: {description}' if description else ''}

Vui lòng đăng nhập vào hệ thống để xem chi tiết và quản lý môn học.
            """
            await send_email_notification(teacher_email, email_subject, email_body_html, email_body_text)
    except Exception as e:
        print(f"⚠ Lỗi gửi thông báo tới giảng viên: {e}")

    return {"success": True, "subject": serialize_class(inserted)}


@app.post("/api/admin/get-all-teachers")
async def admin_get_all_teachers(data: dict = {}):
    """
    Admin: Lấy danh sách tất cả giảng viên để phân công
    """
    teachers = []
    async for teacher in users_collection.find({"role": "teacher"}, {"password": 0}):
        teachers.append(serialize_doc(teacher))
    
    return {"success": True, "teachers": teachers}


@app.post("/api/admin/update-subject-teacher")
async def admin_update_subject_teacher(data: dict):
    """
    Admin: Cập nhật giảng viên cho môn học đã tồn tại
    data: {
        class_id: str,      # ID môn học (lớp học)
        teacher_id: str,    # ID giảng viên mới được phân công
    }
    """
    class_id = data.get("class_id", "").strip()
    new_teacher_id = data.get("teacher_id", "").strip()

    if not class_id or not new_teacher_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc teacher_id.")

    if not ObjectId.is_valid(class_id) or not ObjectId.is_valid(new_teacher_id):
        raise HTTPException(status_code=400, detail="ID không hợp lệ.")

    # Kiểm tra môn học tồn tại
    class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học.")

    # Kiểm tra giảng viên mới tồn tại
    new_teacher = await users_collection.find_one({"_id": ObjectId(new_teacher_id), "role": "teacher"})
    if not new_teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên hợp lệ.")

    # Lấy giảng viên cũ (nếu có)
    old_teacher_id = class_doc.get("teacher_id")
    old_teacher = None
    if old_teacher_id and old_teacher_id != new_teacher_id:
        old_teacher = await users_collection.find_one({"_id": ObjectId(old_teacher_id), "role": "teacher"})

    # Cập nhật giảng viên cho môn học
    await classes_collection.update_one(
        {"_id": ObjectId(class_id)},
        {
            "$set": {
                "teacher_id": new_teacher_id,
                "teacher_name": new_teacher["name"]
            }
        }
    )

    updated_class = await classes_collection.find_one({"_id": ObjectId(class_id)})

    # Gửi thông báo tới giảng viên mới được phân công
    try:
        # WebSocket notification cho giảng viên mới
        notification_event = {
            "type": "assigned_to_subject",
            "subject": serialize_class(updated_class),
            "message": f"Bạn đã được phân công giảng dạy môn học: {updated_class.get('name')} ({updated_class.get('code')})",
            "created_at": datetime.utcnow().isoformat(),
        }
        await notify_teacher(new_teacher_id, notification_event)
        
        # Email notification cho giảng viên mới
        new_teacher_email = new_teacher.get("email")
        if new_teacher_email:
            subject_name = updated_class.get("name", "")
            subject_code = updated_class.get("code", "")
            description = updated_class.get("description", "")
            
            email_subject = f"Phân công giảng dạy môn học: {subject_name}"
            email_body_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Thông báo phân công giảng dạy</h2>
                    <p>Xin chào <strong>{new_teacher['name']}</strong>,</p>
                    <p>Bạn đã được phân công giảng dạy môn học:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Tên môn học:</strong> {subject_name}</p>
                        <p style="margin: 5px 0;"><strong>Mã môn học:</strong> {subject_code}</p>
                        {f'<p style="margin: 5px 0;"><strong>Mô tả:</strong> {description}</p>' if description else ''}
                    </div>
                    <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết và quản lý môn học.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                        Đây là email tự động từ hệ thống Online Exam System.
                    </p>
                </div>
            </body>
            </html>
            """
            email_body_text = f"""
Thông báo phân công giảng dạy

Xin chào {new_teacher['name']},

Bạn đã được phân công giảng dạy môn học:
- Tên môn học: {subject_name}
- Mã môn học: {subject_code}
{f'- Mô tả: {description}' if description else ''}

Vui lòng đăng nhập vào hệ thống để xem chi tiết và quản lý môn học.
            """
            await send_email_notification(new_teacher_email, email_subject, email_body_html, email_body_text)
    except Exception as e:
        print(f"⚠ Lỗi gửi thông báo tới giảng viên mới: {e}")

    return {"success": True, "class": serialize_class(updated_class)}


@app.post("/api/get-students")
async def get_students(data: dict = {}):
    """
    Lấy tất cả sinh viên hoặc theo teacher_id.
    data: { teacher_id?: str }
    """
    teacher_id = data.get("teacher_id", "").strip()

    if teacher_id:
        # Lấy danh sách sinh viên trong các lớp của giảng viên
        all_student_ids = set()
        async for cls in classes_collection.find({"teacher_id": teacher_id}):
            for sid in cls.get("students", []):
                all_student_ids.add(sid)
        query_ids = [ObjectId(sid) for sid in all_student_ids]
        students_cursor = users_collection.find({"_id": {"$in": query_ids}, "role": "student"})
    else:
        # Lấy tất cả sinh viên
        students_cursor = users_collection.find({"role": "student"})

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}


@app.post("/api/get-students-in-class")
async def get_students_in_class(data: dict):
    class_id = data.get("class_id")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    # Lấy thông tin lớp
    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    # Danh sách ID sinh viên (string)
    class_student_ids = cls.get("students", [])

    # Nếu lớp rỗng → trả về danh sách trống
    if not class_student_ids:
        return {"success": True, "students": []}

    # Chuyển sang ObjectId
    object_ids_in_class = [ObjectId(sid) for sid in class_student_ids]

    # 🔥 Truy vấn tất cả sinh viên TRONG lớp
    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$in": object_ids_in_class}
    })

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}

@app.post("/api/get-students-not-in-class")
async def get_students_not_in_class(data: dict):
    """
    Lấy tất cả sinh viên KHÔNG thuộc lớp.
    data = { class_id: "..." }
    """

    class_id = data.get("class_id")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    # Danh sách sinh viên đã có trong lớp
    class_student_ids = set(cls.get("students", []))  # dạng string

    # Convert sang ObjectId
    object_ids_in_class = [ObjectId(sid) for sid in class_student_ids]

    # Truy vấn tất cả sinh viên KHÔNG nằm trong lớp
    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$nin": object_ids_in_class}
    })

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}


@app.post("/api/get-students-not-in-session")
async def get_students_not_in_session(data: dict):
    session_id = data.get("session_id")
    class_id = data.get("class_id")

    if not session_id or not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    # Lấy ca thi gốc
    session = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Ca thi không tồn tại")

    # Lấy lớp
    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    exam_id = session.get("exam_id")
    if not exam_id:
        raise HTTPException(status_code=400, detail="Ca thi không có exam_id")

    # Lấy các ca thi cùng bài thi và cùng lớp
    other_sessions_cursor = exam_sessions_collection.find({
        "exam_id": exam_id,
    })

    # Gom tất cả sinh viên thuộc các ca thi khác (convert sang string)
    students_in_other_sessions = set()
    async for s in other_sessions_cursor:
        for stu in s.get("students", []):
            students_in_other_sessions.add(str(stu))

    # Danh sách sinh viên của lớp (định dạng string)
    class_student_ids = {str(s) for s in cls.get("students", [])}

   

    # Lấy student chưa thuộc ca nào
    eligible_student_ids = [
        ObjectId(sid)
        for sid in class_student_ids
        if sid not in students_in_other_sessions
    ]

    print("class_student_ids", class_student_ids)
    print("students_in_other_sessions", eligible_student_ids)

    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$in": eligible_student_ids}
    })

    students = [serialize_doc(stu) async for stu in students_cursor]

    return {"success": True, "students": students}



# @app.get("/api/get-class/{class_id}")
# async def get_class_by_id(class_id: str):
#     if not ObjectId.is_valid(class_id):
#         raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

#     cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
#     if not cls:
#         raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

#     # Lấy thông tin sinh viên chi tiết
#     student_ids = cls.get("students", [])
#     students_info = []
#     async for user in users_collection.find({"_id": {"$in": [ObjectId(sid) for sid in student_ids]}}):
#         students_info.append({
#             "_id": str(user["_id"]),
#             "name": user.get("name"),
#             "email": user.get("email"),
#             "student_id": user.get("student_id")
#         })

#     # Lấy thông tin lịch thi
#     exams_info = []
#     async for exam in exams_collection.find({"class_id": str(cls["_id"])}):
#         exams_info.append({
#             "_id": str(exam["_id"]),
#             "name": exam.get("name"),
#             "code": exam.get("code"),
#             "start_time": exam.get("start_time"),
#             "duration": exam.get("duration"),
#             "created_by": exam.get("created_by"),
#             "created_by_name": exam.get("created_by_name")
#         })

#     serialized = {
#         "_id": str(cls["_id"]),
#         "name": cls.get("name"),
#         "code": cls.get("code"),
#         "teacher_id": cls.get("teacher_id"),
#         "teacher_name": cls.get("teacher_name"),
#         "visibility": cls.get("visibility"),
#         "exams": exams_info,
#         "students": students_info
#     }
#     return {"success": True, "class": serialized}


@app.post("/api/get-class")
async def get_class_by_id(payload: dict):
    """
    Lấy thông tin lớp học, danh sách sinh viên, danh sách bài thi
    và ca thi của sinh viên hiện tại.
    """
    class_id = payload.get("class_id")
    student_id = payload.get("student_id")

    if not class_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Thiếu student_id")
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    # Lấy thông tin lớp học
    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    # Lấy thông tin sinh viên trong lớp
    student_ids = cls.get("students", [])
    students_info = []
    async for user in users_collection.find({"_id": {"$in": [ObjectId(sid) for sid in student_ids]}}):
        students_info.append({
            "_id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "student_id": user.get("student_id")
        })

    # Lấy các bài thi của lớp
    exams_info = []
    async for exam in exams_collection.find({"class_id": str(cls["_id"])}):
        # Lấy các ca thi của sinh viên hiện tại
        student_sessions = []
        async for session in exam_sessions_collection.find({
            "exam_id": str(exam["_id"]),
            "students": ObjectId(student_id)  # lọc ca mà sinh viên tham gia
        }):
            student_sessions.append({
                "_id": str(session["_id"]),
                "name": session.get("name"),
                "start_time": session.get("start_time"),
                "duration": session.get("duration")
            })

        exams_info.append({
            "_id": str(exam["_id"]),
            "name": exam.get("name"),
            "code": exam.get("code"),
            "created_by": exam.get("created_by"),
            "created_by_name": exam.get("created_by_name"),
            "start_time": exam.get("start_time"),
            "duration": exam.get("duration"),
            "student_sessions": student_sessions  # chỉ các ca của sinh viên
        })

    serialized = {
        "_id": str(cls["_id"]),
        "name": cls.get("name"),
        "code": cls.get("code"),
        "teacher_id": cls.get("teacher_id"),
        "teacher_name": cls.get("teacher_name"),
        "visibility": cls.get("visibility"),
        "students": students_info,
        "exams": exams_info
    }

    return {"success": True, "class": serialized}
# ==========================
# ✅ WS: DANH SÁCH LỚP HỌC (Realtime cho học sinh)
# ==========================

active_class_clients = []

# WebSocket clients cho giảng viên (theo teacher_id)
active_teacher_clients = {}  # {teacher_id: [websocket1, websocket2, ...]}

@app.websocket("/ws/classes")
async def ws_classes(websocket: WebSocket):
    await websocket.accept()
    active_class_clients.append(websocket)
    print("✅ Client connected to CLASS realtime")

    try:
        while True:
            await asyncio.sleep(1)   # giữ kết nối
    except WebSocketDisconnect:
        print("❌ Client disconnected CLASS realtime")
    finally:
        if websocket in active_class_clients:
            active_class_clients.remove(websocket)


async def broadcast_class_event(event: dict):
    """Broadcast sự kiện lớp học cho toàn bộ học sinh / client mở trang."""
    dead = []
    for ws in active_class_clients:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)

    for ws in dead:
        if ws in active_class_clients:
            active_class_clients.remove(ws)


# ==========================
# ✅ WS: THÔNG BÁO CHO GIẢNG VIÊN
# ==========================
@app.websocket("/ws/teachers/notifications")
async def ws_teachers_notifications(websocket: WebSocket):
    """WebSocket endpoint cho giảng viên nhận thông báo"""
    teacher_id = websocket.query_params.get("teacher_id", "").strip()
    
    if not teacher_id:
        await websocket.close(code=1008, reason="Missing teacher_id")
        return
    
    await websocket.accept()
    
    # Thêm websocket vào danh sách của giảng viên này
    if teacher_id not in active_teacher_clients:
        active_teacher_clients[teacher_id] = []
    active_teacher_clients[teacher_id].append(websocket)
    
    print(f"✅ Teacher {teacher_id} connected to notifications")
    
    try:
        while True:
            await asyncio.sleep(1)  # Giữ kết nối
    except WebSocketDisconnect:
        print(f"❌ Teacher {teacher_id} disconnected from notifications")
    finally:
        # Xóa websocket khỏi danh sách
        if teacher_id in active_teacher_clients:
            if websocket in active_teacher_clients[teacher_id]:
                active_teacher_clients[teacher_id].remove(websocket)
            # Xóa key nếu không còn websocket nào
            if len(active_teacher_clients[teacher_id]) == 0:
                del active_teacher_clients[teacher_id]


async def notify_teacher(teacher_id: str, event: dict):
    """Gửi thông báo tới giảng viên cụ thể qua WebSocket"""
    if teacher_id not in active_teacher_clients:
        return  # Giảng viên không online
    
    dead_ws = []
    for ws in active_teacher_clients[teacher_id]:
        try:
            await ws.send_json(event)
        except:
            dead_ws.append(ws)
    
    # Xóa các websocket đã chết
    for ws in dead_ws:
        if ws in active_teacher_clients[teacher_id]:
            active_teacher_clients[teacher_id].remove(ws)
    
    if len(active_teacher_clients[teacher_id]) == 0:
        del active_teacher_clients[teacher_id]


# ==========================
# ✅ GỬI EMAIL
# ==========================
async def send_email_notification(to_email: str, subject: str, body_html: str, body_text: str = ""):
    """
    Gửi email thông báo
    Cấu hình SMTP từ biến môi trường:
    - SMTP_SERVER: smtp.gmail.com (mặc định)
    - SMTP_PORT: 587 (mặc định)
    - SMTP_USER: email gửi (từ biến môi trường EMAIL_USER)
    - SMTP_PASSWORD: mật khẩu/app password (từ biến môi trường EMAIL_PASSWORD)
    
    Nếu không cấu hình, sẽ chỉ log ra console.
    """
    try:
        # Đọc từ biến môi trường hoặc dùng giá trị mặc định
        SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        SMTP_USER = os.getenv("EMAIL_USER", "giangnguyendev99@gmail.com")
        SMTP_PASSWORD = os.getenv("EMAIL_PASSWORD", "rngi fbkb ogby puvt")
        
        # Nếu không cấu hình email, chỉ log và không gửi
        if not SMTP_USER or not SMTP_PASSWORD:
            print(f"⚠ Email không được cấu hình. Thông báo sẽ được gửi tới: {to_email}")
            print(f"   Subject: {subject}")
            print(f"   Body: {body_text[:200]}...")
            print(f"   💡 Để gửi email, hãy cấu hình biến môi trường EMAIL_USER và EMAIL_PASSWORD")
            return True  # Trả về True để không làm gián đoạn flow
        
        # Tạo message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        
        # Thêm text và HTML
        if body_text:
            part1 = MIMEText(body_text, "plain", "utf-8")
            msg.attach(part1)
        
        part2 = MIMEText(body_html, "html", "utf-8")
        msg.attach(part2)
        
        # Gửi email (chạy trong thread pool để không block)
        def send_sync():
            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                print(f"✅ Email đã gửi tới {to_email}")
            except Exception as e:
                print(f"❌ Lỗi gửi email tới {to_email}: {e}")
        
        # Chạy trong thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, send_sync)
        
        return True
    except Exception as e:
        print(f"❌ Lỗi khi gửi email: {e}")
        return False


# ==========================
# ✅ Xử lý lịch sử minh chứng
# ==========================
# Hàm serialize ObjectId và datetime
def serialize_doc2(doc):
    doc = dict(doc)  # Convert từ BSON sang dict
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = serialize_doc2(v)
    return doc

@app.post("/api/teacher/violations")
async def get_violations(data: dict):
    teacher_id = data.get("teacher_id", "").strip()
    if not ObjectId.is_valid(teacher_id):
        raise HTTPException(status_code=400, detail="Teacher ID không hợp lệ")

    teacher_obj_id = ObjectId(teacher_id)
    current_teacher = await users_collection.find_one({"_id": teacher_obj_id})
    if current_teacher is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")

    # Lấy tất cả lớp của giáo viên
    classes_cursor = classes_collection.find({"teacher_id": teacher_id})
    classes = await classes_cursor.to_list(length=None)

    result = []

    for cls in classes:
        cls_id_str = str(cls["_id"])  # Convert _id sang string
        students_ids = cls.get("students", [])

        # Lấy các kỳ thi của lớp (sử dụng class_id = cls._id)
        exams_cursor = exams_collection.find({"class_id": cls_id_str})
        exams = await exams_cursor.to_list(length=None)

        exam_data_list = []
        for exam in exams:
            exam_id = exam.get("_id", "")

            exam_id_str = str(exam_id)
            cls_id_str = str(cls_id_str)

            
            # Lấy các vi phạm liên quan (exam code + class code)
            # violates_cursor = violates_collection.find({
            #     "exam_id": exam_id_str,
            #     "class_id": cls_id_str
            # })
            violates_cursor = (
                violates_collection
                .find({
                    "exam_id": exam_id_str,
                    "class_id": cls_id_str
                })
                .sort("timestamp", -1)
            )

            violations = await violates_cursor.to_list(length=None)
            print(violations)
            violations_serialized = [serialize_doc2(v) for v in violations]

            exam_data_list.append({
                "exam": exam.get("code", ""),
                "exam_name": exam.get("name", ""),
                "start_time": exam.get("start_time").isoformat() if exam.get("start_time") else None,
                "violations": violations_serialized
            })

        result.append({
            "class_code": cls.get("code", ""),
            "class_name": cls.get("name", ""),
            "exams": exam_data_list
        })

    return {"teacher": current_teacher.get("name", ""), "classes": result}


@app.post("/api/student/violations")
async def get_student_violations(data: dict):
    student_code = data.get("student_code", "").strip()
    if not student_code:
        raise HTTPException(status_code=400, detail="Student code không hợp lệ")

    # Lấy tất cả vi phạm của sinh viên
    # violations_cursor = violates_collection.find({"student": student_code})
    violations_cursor = (
        violates_collection
        .find({"student": student_code})
        .sort("timestamp", -1)  
    )
    violations = await violations_cursor.to_list(length=None)

    detailed_violations = []
    for v in violations:
        
        cls_code = v.get("class_id")
        exam_id = v.get("exam_id")
        
        # Lấy thông tin lớp theo code
        cls = await classes_collection.find_one({"_id": ObjectId(cls_code)})

        cls_id = str(cls["_id"]) if cls else None

        # Lấy thông tin kỳ thi theo code + class_id
        exam = None
        if cls_id:
            exam = await exams_collection.find_one({"_id": ObjectId(exam_id), "class_id": cls_id})

        detailed_violations.append({
            **serialize_doc2(v),
            "class_code": cls_code,
            "class_name": cls.get("name") if cls else "",
            "exam_code": exam.get("code") if exam else "",
            "exam_name": exam.get("name") if exam else "",
        })

    return {"student_code": student_code, "violations": detailed_violations}


# Liên quan đến ca thi của bài thi

@app.post("/api/exam-session/create")
async def create_exam_session(payload: dict):
    print(payload)
    exam_id = payload.get("exam_id")
    name = payload.get("name")
    start_time_str = payload.get("start_time")
    duration = payload.get("duration")


    if not all([exam_id, name]):
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu bắt buộc")

    if not ObjectId.is_valid(exam_id):
        raise HTTPException(status_code=400, detail="Exam ID không hợp lệ")

    # Xử lý start_time: convert từ string sang datetime UTC
    start_time = None
    if start_time_str:
        try:
            # Xử lý cả datetime-local format (YYYY-MM-DDTHH:MM) và ISO format
            if isinstance(start_time_str, str):
                # Parse datetime từ string
                parsed_time = datetime.fromisoformat(start_time_str)
                # Nếu là naive datetime (không có timezone), giả định là local time UTC+7 và convert sang UTC
                if parsed_time.tzinfo is None:
                    # Giả định input từ datetime-local là local time UTC+7 (Vietnam timezone)
                    # Tạo timezone UTC+7
                    vietnam_tz = timezone(timedelta(hours=7))
                    # Gán timezone UTC+7 cho parsed_time
                    local_time = parsed_time.replace(tzinfo=vietnam_tz)
                    # Convert sang UTC và remove timezone info để lưu vào DB
                    start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
                    print(f"[DEBUG] Converted start_time: {start_time_str} (local UTC+7) -> {start_time} (UTC)")
                else:
                    # Nếu đã có timezone, convert sang UTC
                    start_time = parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
            elif isinstance(start_time_str, datetime):
                # Nếu đã là datetime object
                if start_time_str.tzinfo is None:
                    # Naive datetime, giả định là local time UTC+7 và convert sang UTC
                    vietnam_tz = timezone(timedelta(hours=7))
                    local_time = start_time_str.replace(tzinfo=vietnam_tz)
                    start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
                else:
                    # Có timezone, convert sang UTC
                    start_time = start_time_str.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception as e:
            print(f"[ERROR] Lỗi parse start_time: {start_time_str}, error: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Thời gian bắt đầu không hợp lệ: {start_time_str}"
            )

    session = {
        "exam_id": exam_id,
        "name": name,
        "start_time": start_time,
        "duration": duration,
        "students": [],
        "created_at": datetime.utcnow(),
    }

    result = await exam_sessions_collection.insert_one(session)
    session["_id"] = str(result.inserted_id)

    return {"success": True, "session": session}


@app.post("/api/exam-session/list")
async def get_exam_sessions(data: dict):
    exam_id = data.get("exam_id")
    if not exam_id or not ObjectId.is_valid(exam_id):
        raise HTTPException(status_code=400, detail="Exam ID không hợp lệ")

    sessions = []
    async for ses in exam_sessions_collection.find({"exam_id": exam_id}):
        ses["_id"] = str(ses["_id"])
        ses["students"] = [str(s) for s in ses.get("students", [])]
        sessions.append(ses)

    return {"success": True, "sessions": sessions}

@app.post("/api/exam-session/add-students")
async def add_students_to_exam_session(payload: dict):
    session_id = payload.get("session_id")
    student_ids = payload.get("student_ids", [])

    # --- Validate input ---
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    if not isinstance(student_ids, list):
        raise HTTPException(status_code=400, detail="Danh sách sinh viên phải là list")

    # --- Convert sang ObjectId ---
    oid_students = []
    for sid in student_ids:
        if ObjectId.is_valid(sid):
            oid_students.append(ObjectId(sid))

    if not oid_students:
        raise HTTPException(status_code=400, detail="Không có student_id hợp lệ")

    # --- Thêm vào session (không trùng) ---
    result = await exam_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$addToSet": {"students": {"$each": oid_students}}},
    )

    if result.modified_count == 0:
        return {"success": False, "detail": "Không có thay đổi hoặc session không tồn tại"}

    # --- Lấy exam_id từ session ---
    session_doc = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    
    exam_id = str(session_doc.get("exam_id"))
    exam_doc = await exams_collection.find_one({"_id": ObjectId(exam_id)})
    
    # Lấy thông tin lớp học để có tên lớp
    class_id = exam_doc.get("class_id") if exam_doc else None
    class_doc = None
    if class_id:
        class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})

    # --- Broadcast tới sinh viên (thông báo chuông) ---
    if exam_id:
        await broadcast_session_update({
        "type": "added_to_session",
        "exam_id": exam_id,
        "session_id": session_id,
        "student_ids": [str(s) for s in oid_students],
        "nameExam": exam_doc.get("name") if exam_doc else "",
        "nameSession": session_doc.get("name"),
    })

    # --- Gửi email cho từng sinh viên được phân vào ca thi ---
    try:
        for student_oid in oid_students:
            student = await users_collection.find_one({"_id": student_oid, "role": "student"})
            if student and student.get("email"):
                student_email = student.get("email")
                student_name = student.get("name", "Sinh viên")
                exam_name = exam_doc.get("name") if exam_doc else "Kỳ thi"
                session_name = session_doc.get("name", "Ca thi")
                class_name = class_doc.get("name") if class_doc else ""
                
                # Format thời gian ca thi
                session_start_time = session_doc.get("start_time")
                session_duration = session_doc.get("duration")
                time_info = ""
                if session_start_time:
                    try:
                        if isinstance(session_start_time, str):
                            start_dt = datetime.fromisoformat(session_start_time.replace('Z', '+00:00'))
                        else:
                            start_dt = session_start_time
                        time_info = f"<p style=\"margin: 5px 0;\"><strong>Thời gian bắt đầu:</strong> {start_dt.strftime('%d/%m/%Y %H:%M')}</p>"
                    except:
                        pass
                if session_duration:
                    time_info += f"<p style=\"margin: 5px 0;\"><strong>Thời lượng:</strong> {session_duration} phút</p>"
                
                email_subject = f"Thông báo phân ca thi: {session_name}"
                email_body_html = f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2563eb;">Thông báo phân ca thi</h2>
                        <p>Xin chào <strong>{student_name}</strong>,</p>
                        <p>Bạn đã được phân vào ca thi mới:</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Kỳ thi:</strong> {exam_name}</p>
                            <p style="margin: 5px 0;"><strong>Ca thi:</strong> {session_name}</p>
                            {f'<p style="margin: 5px 0;"><strong>Môn học:</strong> {class_name}</p>' if class_name else ''}
                            {time_info}
                        </div>
                        <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết và chuẩn bị cho ca thi.</p>
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                            Đây là email tự động từ hệ thống Online Exam System.
                        </p>
                    </div>
                </body>
                </html>
                """
                email_body_text = f"""
Thông báo phân ca thi

Xin chào {student_name},

Bạn đã được phân vào ca thi mới:
- Kỳ thi: {exam_name}
- Ca thi: {session_name}
{f'- Lớp học: {class_name}' if class_name else ''}
{time_info.replace('<p style="margin: 5px 0;"><strong>', '').replace('</strong>', '').replace('</p>', '') if time_info else ''}

Vui lòng đăng nhập vào hệ thống để xem chi tiết và chuẩn bị cho ca thi.
                """
                await send_email_notification(student_email, email_subject, email_body_html, email_body_text)
    except Exception as e:
        print(f"⚠ Lỗi gửi email thông báo ca thi: {e}")

    return {"success": True, "added": len(oid_students)}

# Dùng chung với active_exam_clients (bạn đã có sẵn cho exam_created)
async def broadcast_session_update(event: dict):
    """Gửi realtime đến tất cả client đang mở trang danh sách phòng thi (/ws/exams)"""
    dead = []
    for ws in active_exam_clients:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)
    for ws in dead:
        if ws in active_exam_clients:
            active_exam_clients.remove(ws)

@app.post("/api/get-students-in-session")
async def get_students_in_session(data: dict):
    session_id = data.get("session_id")
    if not session_id or not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    session = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Ca thi không tồn tại")

    student_ids = [ObjectId(sid) for sid in session.get("students", [])]

    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$in": student_ids}
    })

    students = [serialize_doc(stu) async for stu in students_cursor]
    return {"success": True, "students": students}


@app.get("/api/exam-session/detail/{session_id}")
async def get_exam_session_detail(session_id: str):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    ses = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not ses:
        raise HTTPException(status_code=404, detail="Ca thi không tồn tại")

    # Lấy thông tin sinh viên
    students_info = []
    if ses.get("students"):
        async for user in users_collection.find({"_id": {"$in": ses["students"]}}):
            students_info.append({
                "_id": str(user["_id"]),
                "name": user.get("name"),
                "email": user.get("email"),
                "student_id": user.get("student_id")
            })

    ses["_id"] = str(ses["_id"])
    ses["students"] = students_info

    return {"success": True, "session": ses}


@app.post("/api/exam-session/remove-student")
async def remove_student_from_session(payload: dict):
    session_id = payload.get("session_id")
    student_id = payload.get("student_id")

    if not ObjectId.is_valid(session_id) or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    result = await exam_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$pull": {"students": ObjectId(student_id)}}
    )

    return {"success": True, "removed": result.modified_count}


# @app.post("/api/student/current-sessions")
# async def get_student_current_sessions(data: dict):
#     """
#     Lấy các ca thi hiện tại mà sinh viên có thể tham gia.
#     Ca thi được coi là "hiện tại" nếu:
#     - Sinh viên có trong danh sách students của session
#     - Ca thi chưa kết thúc và sắp diễn ra trong 24 giờ tới
#     Logic thời gian:
#     - Trước start_time: "Chưa đến thời gian thi"
#     - Từ start_time đến start_time + 15 phút: "Vào phòng thi"
#     - Sau start_time + 15 phút nhưng chưa kết thúc: "Đã quá thời gian vào phòng thi"
#     - Sau end_time: "Đã kết thúc"
#     """
#     student_id = data.get("student_id")
    
#     if not student_id or not ObjectId.is_valid(student_id):
#         raise HTTPException(status_code=400, detail="Student ID không hợp lệ")
    
#     student_obj_id = ObjectId(student_id)
#     now = datetime.utcnow() + timedelta(hours=7)

    
#     # Tìm tất cả sessions mà sinh viên tham gia
#     sessions_cursor = exam_sessions_collection.find({
#         "students": student_obj_id
#     })
    
#     print(f"[DEBUG] Tìm ca thi cho student_id: {student_id}")
#     session_count = 0
#     current_sessions = []
    
#     async for session in sessions_cursor:
#         session_count += 1
#         print(f"[DEBUG] Session {session_count}: {session.get('name')}, start_time={session.get('start_time')}, students={session.get('students')}")
#         start_time = session.get("start_time")
#         if not start_time:
#             print(f"[DEBUG] Session {session.get('name')} không có start_time, bỏ qua")
#             continue
        
#         # Chuyển start_time sang datetime UTC
#         # Nếu start_time là string không có timezone (như "2025-12-17T23:10"),
#         # giả định đó là local time UTC+7 và convert sang UTC
#         # Nếu start_time là datetime object từ DB, có thể đã được convert sang UTC khi tạo
        
#         if isinstance(start_time, str):
#             try:
#                 # Xử lý cả UTC và local time
#                 if start_time.endswith('Z'):
#                     # Có timezone UTC
#                     parsed = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
#                     start_time = parsed.astimezone(timezone.utc).replace(tzinfo=None)
#                 elif '+' in start_time or start_time.count('-') > 2:
#                     # Có timezone info (như +07:00)
#                     parsed = datetime.fromisoformat(start_time)
#                     start_time = parsed.astimezone(timezone.utc).replace(tzinfo=None)
#                 else:
#                     # String không có timezone (như "2025-12-17T23:10")
#                     # Giả định là local time UTC+7 và convert sang UTC
#                     parsed = datetime.fromisoformat(start_time)
#                     vietnam_tz = timezone(timedelta(hours=7))
#                     local_time = parsed.replace(tzinfo=vietnam_tz)
#                     start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
#                     print(f"[DEBUG] Converted start_time string (UTC+7 -> UTC): {parsed} -> {start_time}")
#             except Exception as e:
#                 print(f"[DEBUG] Lỗi parse start_time: {start_time}, error: {e}")
#                 continue
#         elif isinstance(start_time, datetime):
#             # Nếu đã là datetime object
#             if start_time.tzinfo is not None:
#                 # Nếu có timezone, convert sang UTC và remove timezone info
#                 start_time = start_time.astimezone(timezone.utc).replace(tzinfo=None)
#             else:
#                 # Naive datetime từ DB
#                 # Kiểm tra xem có phải là UTC hay local time bằng cách so sánh với thời gian hiện tại
#                 # Nếu start_time > now + 12h, có thể là local time (UTC+7)
#                 # Để an toàn, giả định tất cả naive datetime là local time UTC+7
#                 vietnam_tz = timezone(timedelta(hours=7))
#                 local_time = start_time.replace(tzinfo=vietnam_tz)
#                 start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
#                 print(f"[DEBUG] Converted start_time datetime (assumed UTC+7 -> UTC): {start_time}")
#         else:
#             continue
        
#         duration = session.get("duration", 0)  # duration tính bằng phút
        
#         # Đảm bảo cả start_time và now đều là UTC naive datetime để so sánh chính xác
#         # start_time từ DB có thể là naive datetime (giả định là UTC)
#         # now là datetime.utcnow() cũng là UTC naive datetime
#         start_ms = start_time.timestamp() * 1000
#         end_ms = start_ms + duration * 60 * 1000
#         now_ms = now.timestamp() * 1000
        
#         # Mở rộng: Hiển thị tất cả ca thi chưa kết thúc hoặc sắp diễn ra trong 24 giờ tới
#         # Hiển thị nếu:
#         # 1. Ca thi chưa kết thúc (now_ms <= end_ms) VÀ
#         # 2. Ca thi sắp diễn ra hoặc đang diễn ra (start_ms <= now_ms + 24h)
#         future_limit = now_ms + 24 * 60 * 60 * 1000  # 24 giờ tới
        
#         # Debug log chi tiết để kiểm tra timezone
#         print(f"[DEBUG] Session {session.get('name')}:")
#         print(f"  - start_time (raw from DB): {session.get('start_time')} (type: {type(session.get('start_time'))})")
#         print(f"  - start_time (parsed): {start_time} (type: {type(start_time)}, tzinfo: {start_time.tzinfo})")
#         print(f"  - now (UTC): {now} (type: {type(now)}, tzinfo: {now.tzinfo})")
#         print(f"  - start_ms: {start_ms} ({datetime.fromtimestamp(start_ms/1000)})")
#         print(f"  - now_ms: {now_ms} ({datetime.fromtimestamp(now_ms/1000)})")
#         print(f"  - end_ms: {end_ms} ({datetime.fromtimestamp(end_ms/1000)})")
#         print(f"  - Comparison: now_ms ({now_ms}) < start_ms ({start_ms})? {now_ms < start_ms}")
#         print(f"  - Condition: now_ms <= end_ms? {now_ms <= end_ms}, start_ms <= future_limit? {start_ms <= future_limit}")
        
#         # Chỉ trả về ca thi đang trong thời gian có thể vào thi
#         # (từ start_time đến start_time + 15 phút)
#         can_enter_start = start_ms
#         can_enter_end = start_ms + 15 * 60 * 1000  # 15 phút sau start_time
        
#         # Debug log chi tiết để kiểm tra timezone
#         print(f"[DEBUG] Session {session.get('name')}:")
#         print(f"  - start_time (raw from DB): {session.get('start_time')} (type: {type(session.get('start_time'))})")
#         print(f"  - start_time (parsed): {start_time} (type: {type(start_time)}, tzinfo: {start_time.tzinfo})")
#         print(f"  - now (UTC): {now} (type: {type(now)}, tzinfo: {now.tzinfo})")
#         print(f"  - start_ms: {start_ms} ({datetime.fromtimestamp(start_ms/1000)})")
#         print(f"  - now_ms: {now_ms} ({datetime.fromtimestamp(now_ms/1000)})")
#         print(f"  - can_enter_start: {can_enter_start}, can_enter_end: {can_enter_end}")
#         print(f"  - Condition: can_enter_start <= now_ms <= can_enter_end? {can_enter_start <= now_ms <= can_enter_end}")
        
#         # Chỉ trả về ca thi đang trong thời gian có thể vào thi
#         if now_ms >= can_enter_start and now_ms <= can_enter_end:
#             # Lấy thông tin exam
#             exam_id = session.get("exam_id")
#             exam = None
#             if exam_id:
#                 exam = await exams_collection.find_one({"_id": ObjectId(exam_id)})
            
#             # Lấy thông tin class
#             class_id = None
#             class_info = None
#             if exam:
#                 class_id = exam.get("class_id")
#                 if class_id:
#                     class_info = await classes_collection.find_one({"_id": ObjectId(class_id)})
            
#             # Vì chỉ trả về ca thi đang trong thời gian có thể vào thi,
#             # nên status luôn là "Vào phòng thi"
#             status = "Vào phòng thi"
            
#             current_sessions.append({
#                 "_id": str(session["_id"]),
#                 "name": session.get("name"),
#                 "start_time": start_time.isoformat() if isinstance(start_time, datetime) else str(start_time),
#                 "duration": duration,
#                 "exam_id": str(exam_id) if exam_id else None,
#                 "exam_name": exam.get("name") if exam else None,
#                 "exam_code": exam.get("code") if exam else None,
#                 "class_id": str(class_id) if class_id else None,
#                 "class_name": class_info.get("name") if class_info else None,
#                 "status": status
#             })
    
#     # Sắp xếp theo start_time (sớm nhất trước)
#     current_sessions.sort(key=lambda x: x.get("start_time", ""))
    
#     print(f"[DEBUG] Tổng số sessions tìm thấy: {session_count}, số sessions hiển thị: {len(current_sessions)}")
    
#     return {"success": True, "sessions": current_sessions}

@app.post("/api/student/current-sessions")
async def get_student_current_sessions(data: dict):
    student_id = data.get("student_id")

    if not student_id or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Student ID không hợp lệ")

    student_obj_id = ObjectId(student_id)

    # Thời gian hiện tại (UTC + 7)
    now = datetime.utcnow() + timedelta(hours=7)

    print("\n================ TIME DEBUG =================")
    print(f"[NOW] utc+7 now = {now}")

    sessions_cursor = exam_sessions_collection.find({
        "students": student_obj_id
    })

    current_sessions = []

    async for session in sessions_cursor:
        raw_start_time = session.get("start_time")
        if not raw_start_time:
            continue

        start_time = None

        # ---- Parse start_time ----
        if isinstance(raw_start_time, str):
            try:
                if raw_start_time.endswith("Z"):
                    parsed = datetime.fromisoformat(raw_start_time.replace("Z", "+00:00"))
                    start_time = parsed.astimezone(timezone.utc).replace(tzinfo=None)
                elif "+" in raw_start_time:
                    parsed = datetime.fromisoformat(raw_start_time)
                    start_time = parsed.astimezone(timezone.utc).replace(tzinfo=None)
                else:
                    parsed = datetime.fromisoformat(raw_start_time)
                    start_time = parsed + timedelta(hours=7)
            except Exception:
                continue

        elif isinstance(raw_start_time, datetime):
            if raw_start_time.tzinfo:
                start_time = raw_start_time.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                start_time = raw_start_time + timedelta(hours=7)

        if not start_time:
            continue

        duration = session.get("duration", 0)

        # ---- Tính mốc thời gian ----
        start_ms = start_time.timestamp() * 1000
        enter_end_ms = start_ms + 15 * 60 * 1000
        end_ms = start_ms + duration * 60 * 1000
        now_ms = now.timestamp() * 1000

        # ---- DEBUG TIME ONLY ----
        print("\n--------------------------------------------")
        print(f"Session: {session.get('name')}")
        print(f"start_time (raw)      = {raw_start_time}")
        print(f"start_time (parsed)   = {start_time}")
        print(f"enter_end (+15m)      = {datetime.fromtimestamp(enter_end_ms/1000)}")
        print(f"end_time              = {datetime.fromtimestamp(end_ms/1000)}")
        print(f"now                   = {now}")

        print("COMPARE:")
        print(f"now < start_time      = {now_ms < start_ms}")
        print(f"start <= now <= +15m  = {start_ms <= now_ms <= enter_end_ms}")
        print(f"now <= end_time       = {now_ms <= end_ms}")

        # ---- Chỉ cho vào phòng thi trong 15 phút đầu ----
        if start_ms <= now_ms <= enter_end_ms:
            exam = None
            class_info = None

            exam_id = session.get("exam_id")
            if exam_id:
                exam = await exams_collection.find_one({"_id": ObjectId(exam_id)})

            if exam and exam.get("class_id"):
                class_info = await classes_collection.find_one(
                    {"_id": ObjectId(exam["class_id"])}
                )

            current_sessions.append({
                "_id": str(session["_id"]),
                "name": session.get("name"),
                "start_time": start_time.isoformat(),
                "duration": duration,
                "exam_id": str(exam_id) if exam_id else None,
                "exam_name": exam.get("name") if exam else None,
                "class_name": class_info.get("name") if class_info else None,
                "class_id": str(class_info["_id"]) if class_info else None,
                "status": "Vào phòng thi"
            })

    current_sessions.sort(key=lambda x: x["start_time"])

    print("\n================ END DEBUG ==================\n")

    return {
        "success": True,
        "sessions": current_sessions
    }

# ================================
# 📊 ADMIN: Tạo báo cáo
# ================================

@app.post("/api/admin/generate-report")
async def generate_report(data: dict):
    """
    Tạo báo cáo tổng hợp cho admin
    data: {
        start_date: "YYYY-MM-DD",
        end_date: "YYYY-MM-DD",
        class_id: "" (optional, nếu rỗng thì lấy tất cả)
    }
    """
    start_date = data.get("start_date", "").strip()
    end_date = data.get("end_date", "").strip()
    class_id = data.get("class_id", "").strip()
    
    # Xây dựng query filter
    query = {}
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query["timestamp"]["$gte"] = start_dt
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Thêm 1 ngày để bao gồm cả ngày cuối
            end_dt = end_dt + timedelta(days=1)
            query["timestamp"]["$lt"] = end_dt
    
    if class_id and ObjectId.is_valid(class_id):
        query["class_id"] = class_id
    
    # Lấy violations
    violations_cursor = violates_collection.find(query).sort("timestamp", -1)
    violations = await violations_cursor.to_list(length=None)
    
    # Lấy thông tin chi tiết cho violations
    detailed_violations = []
    for v in violations:
        student_id = v.get("student")
        exam_id = v.get("exam_id")
        cls_id = v.get("class_id")
        
        # Lấy thông tin sinh viên
        student_info = None
        if student_id and ObjectId.is_valid(student_id):
            student_info = await users_collection.find_one({"student_id": student_id})
        
        # Lấy thông tin lớp
        class_info = None
        if cls_id and ObjectId.is_valid(cls_id):
            class_info = await classes_collection.find_one({"_id": ObjectId(cls_id)})
        
        # Lấy thông tin kỳ thi
        exam_info = None
        if exam_id and ObjectId.is_valid(exam_id):
            exam_info = await exams_collection.find_one({"_id": ObjectId(exam_id)})
        
        # Mapping tên hành vi vi phạm
        behavior_name = v.get("behavior", "")
        violation_type = v.get("type", "")
        behavior_display = behavior_name
        
        if behavior_name:
            behavior_lower = behavior_name.lower()
            if violation_type == "face":
                if behavior_lower == "multi_face":
                    behavior_display = "Phát hiện nhiều người trong khung hình"
                elif behavior_lower in ["mismatch_face", "unknown_face"]:
                    behavior_display = "Khuôn mặt không khớp/nghi vấn thi hộ"
                elif behavior_lower == "no_face":
                    behavior_display = "Không phát hiện khuôn mặt"
                elif behavior_lower == "look_away":
                    behavior_display = "Đảo mắt bất thường/nhìn ra ngoài màn hình"
            elif violation_type == "behavior":
                if behavior_lower == "mobile_use":
                    behavior_display = "Sử dụng điện thoại trong khi thi"
                elif behavior_lower in ["eye_movement", "look_away"]:
                    behavior_display = "Đảo mắt bất thường/nhìn ra ngoài màn hình"
                elif behavior_lower == "side_watching":
                    behavior_display = "Nghiêng mặt / xoay mặt sang hướng khác"
                elif behavior_lower == "hand_move":
                    behavior_display = "Cử động tay bất thường"
                elif behavior_lower == "mouth_open":
                    behavior_display = "Mở miệng bất thường/ Có dấu hiệu trao đổi"
        
        detailed_violations.append({
            **serialize_doc2(v),
            "student_name": student_info.get("name") if student_info else "N/A",
            "student_id": student_info.get("student_id") if student_info else "N/A",
            "class_name": class_info.get("name") if class_info else "N/A",
            "class_code": class_info.get("code") if class_info else "N/A",
            "exam_name": exam_info.get("name") if exam_info else "N/A",
            "exam_code": exam_info.get("code") if exam_info else "N/A",
            "behavior_display": behavior_display,  # Tên hành vi đã được dịch
        })
    
    # Thống kê
    total_violations = len(detailed_violations)
    behavior_violations = len([v for v in detailed_violations if v.get("type") == "behavior"])
    face_violations = len([v for v in detailed_violations if v.get("type") == "face"])
    
    # Thống kê theo môn học
    class_stats = {}
    for v in detailed_violations:
        cls_name = v.get("class_name", "N/A")
        if cls_name not in class_stats:
            class_stats[cls_name] = {"total": 0, "behavior": 0, "face": 0}
        class_stats[cls_name]["total"] += 1
        if v.get("type") == "behavior":
            class_stats[cls_name]["behavior"] += 1
        elif v.get("type") == "face":
            class_stats[cls_name]["face"] += 1
    
    # Thống kê theo sinh viên
    student_stats = {}
    for v in detailed_violations:
        student_name = v.get("student_name", "N/A")
        student_id_code = v.get("student_id", "N/A")
        key = f"{student_name} ({student_id_code})"
        if key not in student_stats:
            student_stats[key] = {"total": 0, "behavior": 0, "face": 0}
        student_stats[key]["total"] += 1
        if v.get("type") == "behavior":
            student_stats[key]["behavior"] += 1
        elif v.get("type") == "face":
            student_stats[key]["face"] += 1
    
    # Lấy danh sách exams trong khoảng thời gian
    exam_query = {}
    if start_date or end_date:
        exam_query["created_at"] = {}
        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            exam_query["created_at"]["$gte"] = start_dt
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt + timedelta(days=1)
            exam_query["created_at"]["$lt"] = end_dt
    
    if class_id and ObjectId.is_valid(class_id):
        exam_query["class_id"] = class_id
    
    exams_cursor = exams_collection.find(exam_query)
    exams_list = await exams_cursor.to_list(length=None)
    exams_serialized = [serialize_doc(exam) for exam in exams_list]
    
    return {
        "success": True,
        "report": {
            "violations": detailed_violations,
            "statistics": {
                "total_violations": total_violations,
                "behavior_violations": behavior_violations,
                "face_violations": face_violations,
            },
            "class_statistics": class_stats,
            "student_statistics": student_stats,
            "exams": exams_serialized,
            "filter": {
                "start_date": start_date,
                "end_date": end_date,
                "class_id": class_id,
            }
        }
    }

