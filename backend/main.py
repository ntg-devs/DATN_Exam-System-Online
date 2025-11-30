

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
from datetime import datetime
import pickle

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

# ==========================
# API: Đăng ký video khuôn mặt
# ==========================
# @app.post("/api/register-video")
# async def register_video(student_id: str = Form(...), name: str = Form(...), video: UploadFile = File(...)):
#     try:
#         VIDEO_DIR = "registered_videos"
#         os.makedirs(VIDEO_DIR, exist_ok=True)
#         path = os.path.join(VIDEO_DIR, f"{student_id}.webm")
#         with open(path, "wb") as f:
#             f.write(await video.read())
#         used = enroll_from_video(path, student_id)
#         return {"message": f"✅ Đăng ký thành công cho sinh viên có mã {name}", "frames_used": used}
#     except Exception as e:
#         return {"detail": str(e)}


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

        # Bảo vệ treo (tối đa 10 giây xử lý)
        if frame_count > 1000:  # ~30-40s video là quá đủ
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
                }
            }
        )

        # 5. TRẢ VỀ FE LUÔN ẢNH BASE64
        return {
            "message": f"✅ Đăng ký thành công cho sinh viên có mã {name}",
            "frames_used": frames_used,
            "saved_image": True,
            "face_image": frame_base64    # 👈 TRẢ BASE64 VỀ FE
        }

    except Exception as e:
        return {"detail": str(e)}


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

        for person_id, embs in db.items():
            sc = cosine_similarity([emb], embs).max()
            if sc > best_score:
                best_score = sc
                if sc >= 0.65:   # tốt nhất cho nhiều người
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
# @app.websocket("/ws/student")
# async def ws_student(websocket: WebSocket):
#     exam = websocket.query_params.get("exam")
#     student = websocket.query_params.get("student")

#     await manager.connect_student(exam, student, websocket)
#     await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

#     try:
#         while True:
#             msg = await websocket.receive_text()
#             try:
#                 data = json.loads(msg)
#             except json.JSONDecodeError:
#                 continue

#             if data.get("type") == "frame":
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)
#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 # # Nhận diện hành vi
#                 # behavior = behavior_service.predict(frame)
#                 # print("Behavior predicted:", behavior)

#                 # # Gửi lại kết quả cho học sinh
#                 # await websocket.send_json({
#                 #     "type": "self_assessment",
#                 #     "behavior": behavior,
#                 #     "ts": data.get("ts")
#                 # })

#                 # # Gửi broadcast cho giáo viên
#                 # await manager.broadcast_teachers(exam, {
#                 #     "type": "student_frame",
#                 #     "student": student,
#                 #     "frame_b64": data["b64"],
#                 #     "behavior": behavior,
#                 #     "ts": data.get("ts")
#                 # })
#                 # Nhận diện hành vi
#                 raw = behavior_service.predict(frame)
#                 print("Behavior predicted:", raw)

#                 # ✅ Chuẩn hóa output
#                 behavior = {
#                     "class": raw.get("label", "unknown"),
#                     "score": float(raw.get("confidence", 0)) / 100.0  # chuyển 41.3 → 0.413
#                 }

#                 print("Normalized behavior:", behavior)

#                 # ✅ Gửi lại kết quả cho học sinh
#                 await websocket.send_json({
#                     "type": "self_assessment",
#                     "behavior": behavior,
#                     "ts": data.get("ts")
#                 })

#                 # ✅ Gửi broadcast cho giáo viên
#                 await manager.broadcast_teachers(exam, {
#                     "type": "student_frame",
#                     "student": student,
#                     "frame_b64": data["b64"],
#                     "behavior": behavior,
#                     "ts": data.get("ts")
#                 })


#     except WebSocketDisconnect:
#         await manager.disconnect_student(exam, student)

#-----------------------------------------------------
behavior_service2 = BehaviorDetectionService("models/fasterrcnn_final.pth")
#Code 4 code sinh viên

# ============================================
# FASTAPI BACKEND — WS STUDENT
# ============================================

# violation_state = {}

# @app.websocket("/ws/student")
# async def ws_student(websocket: WebSocket):
#     import json, base64
#     import numpy as np
#     import cv2
#     from datetime import datetime

#     exam = websocket.query_params.get("exam")
#     student = websocket.query_params.get("student")

#     student_info = await users_collection.find_one({"_id": student})
#     class_id = websocket.query_params.get("class_id") 
#     await manager.connect_student(exam, student, websocket)
#     await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

#     violation_state[student] = {
#         "last_behavior": None,
#         "start_ts": None,
#         "reported": False
#     }

#     try:
#         while True:
#             raw_msg = await websocket.receive_text()

#             try:
#                 data = json.loads(raw_msg)
#             except:
#                 continue

#             # ---------------------------------------------------
#             #   📌 HANDLE CAMERA FRAME
#             # ---------------------------------------------------
#             if data.get("type") == "frame":
#                 ts = int(data["ts"])

#                 # Giải mã từ base64
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)

#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 # Detect
#                 detections = behavior_service2.predict(frame, score_thresh=0.4)

#                 abnormal = [d for d in detections if d["label"] != "normal"]
#                 violation_rate = len(abnormal) / len(detections) if detections else 0

#                 if abnormal:
#                     top = max(abnormal, key=lambda d: d["score"])
#                 else:
#                     top = {"label": "normal", "score": 1.0}

#                 behavior = top["label"]
#                 score = top["score"]

#                 # ---------------------------------------------------
#                 #   ⚠️ LOGIC 3 GIÂY LIÊN TỤC
#                 # ---------------------------------------------------
#                 track = violation_state[student]

#                 if behavior != "normal" and score > 0.5:
#                     if track["last_behavior"] != behavior:
#                         track["last_behavior"] = behavior
#                         track["start_ts"] = ts
#                         track["reported"] = False

#                     else:
#                         duration = ts - track["start_ts"]

#                         print("THời gian vi phạm", duration)

#                         if duration >= 3000 and not track["reported"]:
#                             track["reported"] = True

#                             # ---------------------------------------------------
#                             #  🎨 TẠO ẢNH BBOX LÀM EVIDENCE
#                             # ---------------------------------------------------
#                             draw_frame = behavior_service2.draw_detections(
#                                 frame, detections
#                             )
#                             _, buffer = cv2.imencode(".jpg", draw_frame)
#                             evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

#                             # ---------------------------------------------------
#                             #     💾 LƯU MONGODB
#                             # ---------------------------------------------------
#                             await violates_collection.insert_one({
#                                 "student": student,
#                                 "exam_id": exam,
#                                 "class_id": class_id,
#                                 "behavior": behavior,
#                                 "score": score,
#                                 "start_ts": track["start_ts"],
#                                 "end_ts": ts,
#                                 "duration_ms": duration,
#                                 "timestamp": datetime.utcnow(),
#                                 "evidence": evidence_b64,
#                             })

#                             # print(f"[🔥] SAVED VIOLATION: {student} - {duration}")

#                             # ---------------------------------------------------
#                             #  📡 GỬI GIẢNG VIÊN THÔNG BÁO VI PHẠM
#                             # ---------------------------------------------------
#                             await manager.broadcast_teachers(exam, {
#                                 "type": "violation_detected",
#                                 "student": student,
#                                 "behavior": behavior,
#                                 "duration": duration,
#                                 "timestamp": ts,
#                                 "evidence": evidence_b64,
#                             })

#                 else:
#                     track["last_behavior"] = None
#                     track["start_ts"] = None
#                     track["reported"] = False

#                 # ---------------------------------------------------
#                 #   🎨 TẠO FRAME LIVE ĐÃ VẼ BBOX
#                 # ---------------------------------------------------
#                 draw_frame = behavior_service2.draw_detections(frame, detections)
#                 _, buffer = cv2.imencode(".jpg", draw_frame)
#                 frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

#                 # Gửi lại học sinh
#                 await websocket.send_json({
#                     "type": "self_assessment",
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts,
#                 })

#                 # Gửi realtime cho giáo viên
#                 await manager.broadcast_teachers(exam, {
#                     "type": "student_frame",
#                     "student": student,
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts,
#                 })

#     except WebSocketDisconnect:
#         violation_state.pop(student, None)
#         await manager.disconnect_student(exam, student)
#         print(f"🔴 Student {student} disconnected")


# Nhận diện hành vi sinh viên có bổ sung nhận diện khuôn mặt realtime 

# ===========================
# CONFIG
# ===========================
FACE_SIMILARITY_THRESHOLD = 0.65
FACE_CHECK_INTERVAL_MS = 500
MULTI_FACE_VIOLATION_MIN = 2
UNKNOWN_FACE_PERSIST_MS = 3000

# ===========================
# HELPER FUNCTIONS
# ===========================
def _detect_faces_pil(pil_img):
    boxes, probs = mtcnn.detect(pil_img)
    faces_tensor = mtcnn(pil_img)  # list of tensors or stacked
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
        emb = extract_embedding(ft)  # 1D np array
        results.append(emb)
    return results

def _find_best_label_for_emb(emb, db, threshold=FACE_SIMILARITY_THRESHOLD):
    best_score = -1.0
    best_label = "unknown"
    for person_id, embs in db.items():
        sc = cosine_similarity([emb], embs).max()
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
    student = websocket.query_params.get("student")
    class_id = websocket.query_params.get("class_id")
    student_info = await users_collection.find_one({"_id": student})

    await manager.connect_student(exam, student, websocket)
    await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

    violation_state[student] = {
        "last_behavior": None,
        "start_ts": None,
        "reported": False,
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

            # -------------------------
            # 1) BEHAVIOR DETECTION
            # -------------------------
            detections = behavior_service2.predict(frame, score_thresh=0.4)
            abnormal = [d for d in detections if d["label"] != "normal"]
            violation_rate = len(abnormal) / len(detections) if detections else 0
            top = max(abnormal, key=lambda d: d["score"]) if abnormal else {"label": "normal", "score": 1.0}
            behavior = top["label"]
            score = top["score"]

            track = violation_state[student]
            if behavior != "normal" and score > 0.5:
                if track["last_behavior"] != behavior:
                    track["last_behavior"] = behavior
                    track["start_ts"] = ts
                    track["reported"] = False
                else:
                    duration = ts - (track["start_ts"] or ts)
                    if duration >= 3000 and not track["reported"]:
                        track["reported"] = True
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
                            "start_ts": track["start_ts"],
                            "end_ts": ts,
                            "duration_ms": duration,
                            "timestamp": datetime.utcnow(),
                            "evidence": evidence_b64,
                        })
                        await manager.broadcast_teachers(exam, {
                            "type": "violation_detected",
                            "student": student,
                            "behavior": behavior,
                            "duration": duration,
                            "timestamp": ts,
                            "evidence": evidence_b64,
                        })
            else:
                track["last_behavior"] = None
                track["start_ts"] = None
                track["reported"] = False

            # -------------------------
            # 2) FACE CHECK
            # -------------------------
            now_ms = ts
            do_face_check = (now_ms - track["last_face_check_ts"]) >= FACE_CHECK_INTERVAL_MS
            face_results = []
            face_violation_happened = False

            if do_face_check:
                track["last_face_check_ts"] = now_ms
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

                try:
                    boxes, probs, faces_tensor = await loop.run_in_executor(None, _detect_faces_pil, pil_img)
                except:
                    boxes = None
                    faces_tensor = None

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
                                        reason = "unknown_face_persistent"
                            else:
                                face_violation_happened = True
                                reason = "mismatch_face"
                        else:
                            track["unknown_start_ts"] = None
                            track["unknown_reported"] = False

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
            # 3) DRAW FINAL FRAME (behavior + face overlay)
            # -------------------------
            draw_frame = behavior_service2.draw_detections(frame, detections)
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
                "violation_rate": violation_rate,
                "frame_b64": frame_b64,
                "ts": ts,
                "faces": face_results,
            })

            await manager.broadcast_teachers(exam, {
                "type": "student_frame",
                "student": student,
                "detections": detections,
                "violation_rate": violation_rate,
                "frame_b64": frame_b64,
                "ts": ts,
                "faces": face_results,
            })

    except WebSocketDisconnect:
        violation_state.pop(student, None)
        await manager.disconnect_student(exam, student)
        print(f"🔴 Student {student} disconnected")

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
    }

    result = await users_collection.insert_one(user)
    inserted_user = await users_collection.find_one({"_id": result.inserted_id})

    return {"success": True, "user": serialize_doc(inserted_user)}


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
    password = data.get("password", "").strip()

    if not class_id or not student_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc student_id.")

    class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")

    # lớp private phải nhập đúng password
    if class_doc["visibility"] == "private" and class_doc["password"] != password:
        raise HTTPException(status_code=403, detail="Mật khẩu lớp không đúng.")

    # Thêm student nếu chưa tồn tại
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
            violates_cursor = violates_collection.find({
                "exam_id": exam_id_str,
                "class_id": cls_id_str
            })
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
    violations_cursor = violates_collection.find({"student": student_code})
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
    start_time = payload.get("start_time")
    duration = payload.get("duration")


    if not all([exam_id, name]):
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu bắt buộc")

    if not ObjectId.is_valid(exam_id):
        raise HTTPException(status_code=400, detail="Exam ID không hợp lệ")

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

# @app.post("/api/exam-session/add-students")
# async def add_students_to_exam_session(payload: dict):
#     session_id = payload.get("session_id")
#     student_ids = payload.get("student_ids", [])

#     if not ObjectId.is_valid(session_id):
#         raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

#     if not isinstance(student_ids, list):
#         raise HTTPException(status_code=400, detail="Danh sách sinh viên phải là list")

#     # Convert sang ObjectId
#     oid_students = []
#     for sid in student_ids:
#         if ObjectId.is_valid(sid):
#             oid_students.append(ObjectId(sid))

#     # Thêm vào session (không trùng)
#     result = await exam_sessions_collection.update_one(
#         {"_id": ObjectId(session_id)},
#         {"$addToSet": {"students": {"$each": oid_students}}},
#     )

#     if result.modified_count == 0:
#         return {"success": False, "detail": "Không có thay đổi hoặc session không tồn tại"}

#     return {"success": True, "added": len(oid_students)}

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

    # --- Broadcast tới sinh viên ---
    if exam_id:
        await broadcast_session_update({
        "type": "added_to_session",
        "exam_id": exam_id,
        "session_id": session_id,
        "student_ids": [str(s) for s in oid_students],
        "nameExam": exam_doc.get("name"),
        "nameSession": session_doc.get("name"),
    })

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

