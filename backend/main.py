# from fastapi import FastAPI, Form, UploadFile, File, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# from services.face_recognition.enroll_from_video import enroll_from_video
# from services.face_recognition.verify_face import verify_face
# from PIL import Image
# import os
# import io
# import cv2
# import base64
# import numpy as np

# from services.behavior_detected.behavior_recognition import BehaviorRecognitionService

# model_path = "models/final_model2.pth"
# behavior_service = BehaviorRecognitionService(model_path)

# app = FastAPI()

# # =========================
# # Cho phép CORS (fix lỗi kết nối)
# # =========================
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # hoặc chỉ định ["http://localhost:3000"]
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # =========================
# # Endpoint đăng ký từ video
# # =========================
# @app.post("/api/register-video")
# async def register_video(
#     student_id: str = Form(...),
#     name: str = Form(...),
#     video: UploadFile = File(...),
# ):
#     try:
#         VIDEO_DIR = "registered_videos"
#         os.makedirs(VIDEO_DIR, exist_ok=True)
#         video_path = os.path.join(VIDEO_DIR, f"{student_id}.webm")

#         with open(video_path, "wb") as f:
#             f.write(await video.read())

#         num_frames = enroll_from_video(video_path, student_id, frame_interval_sec=0.5)

#         return {
#             "message": f"Đăng ký video thành công cho {name}",
#             "frames_used": num_frames,
#         }
#     except Exception as e:
#         return {"detail": str(e)}

# # =========================
# # Endpoint xác thực khuôn mặt
# # =========================
# @app.post("/api/verify-face")
# async def verify_face_api(image: UploadFile = File(...)):
#     try:
#         # Đọc dữ liệu ảnh từ frontend
#         img_bytes = await image.read()
#         print(f"[📸] Đã nhận {len(img_bytes)} bytes từ frontend")

#         # Mở bằng Pillow
#         pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
#         print(f"[🖼️] Ảnh nhận được: kích thước={pil_img.size}, định dạng={pil_img.format or 'RGB'}")

#         # ✅ Lưu tạm ảnh để kiểm tra bằng mắt
#         save_path = os.path.join(os.path.dirname(__file__), "debug_upload.jpg")
#         pil_img.save(save_path)
#         print(f"[💾] Ảnh đã lưu tạm tại: {save_path}")

#         # --- Gọi hàm xác thực khuôn mặt ---
#         person_id, score = verify_face(pil_img)
#         print(f"[🔍] Kết quả verify: person_id={person_id}, score={score:.4f}")

#         if person_id:
#             return {
#                 "verified": True,
#                 "student": {"student_id": person_id},
#                 "similarity": score,
#             }
#         else:
#             return {
#                 "verified": False,
#                 "similarity": score,
#                 "detail": "Không nhận diện được khuôn mặt hoặc chưa đăng ký.",
#             }

#     except Exception as e:
#         print("[❌] Lỗi khi xử lý ảnh:", e)
#         return {"verified": False, "detail": str(e)}
    

# @app.websocket("/ws/student")
# async def student_ws(websocket: WebSocket, exam: str, student: str):
#     await websocket.accept()
#     print(f"[🎓] Student connected: {student} in exam {exam}")

#     try:
#         while True:
#             msg = await websocket.receive_text()
#             data = eval(msg) if msg.startswith("{") else None
#             if not data:
#                 continue

#             if data["type"] == "frame":
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)
#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 behavior = behavior_service.predict(frame)
#                 payload = {
#                     "type": "self_assessment",
#                     "student": student,
#                     "exam": exam,
#                     "behavior": {
#                         "class": behavior["label"],
#                         "score": behavior["confidence"] / 100,
#                     },
#                     "ts": data["ts"],
#                 }

#                 # Gửi lại kết quả cho học sinh
#                 await websocket.send_json(payload)

#                 # Gửi broadcast đến giáo viên
#                 if exam in teacher_connections:
#                     for t_ws in teacher_connections[exam]:
#                         await t_ws.send_json({
#                             "type": "student_frame",
#                             "student": student,
#                             "frame_b64": data["b64"],
#                             "behavior": payload["behavior"],
#                             "ts": data["ts"],
#                         })

#     except WebSocketDisconnect:
#         print(f"[❌] Student {student} disconnected")
#     finally:
#         await websocket.close()


# behavior_service = BehaviorRecognitionService("E:/TN_Project/P_ActionRecognition/CNN/models/final_model2.pth")

# # Lưu danh sách kết nối giáo viên theo exam
# teacher_connections = {}

# @app.websocket("/ws/teacher")
# async def teacher_ws(websocket: WebSocket, exam: str):
#     await websocket.accept()
#     print(f"[🧑‍🏫] Teacher connected for exam {exam}")

#     if exam not in teacher_connections:
#         teacher_connections[exam] = []
#     teacher_connections[exam].append(websocket)

#     try:
#         while True:
#             await websocket.receive_text()
#     except WebSocketDisconnect:
#         print(f"[❌] Teacher disconnected from {exam}")
#     finally:
#         teacher_connections[exam].remove(websocket)


from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.socket_manager.connection_manager import ConnectionManager
from services.behavior_detected.behavior_recognition import BehaviorRecognitionService
from services.behavior_detected.behavior_recognition_fcnn import BehaviorDetectionService
from services.face_recognition.enroll_from_video import enroll_from_video
from services.face_recognition.verify_face import verify_face
from PIL import Image
import os, io, base64, cv2, numpy as np, json
from datetime import datetime

from pydantic import BaseModel, EmailStr

from database.mongo import exams_collection 
from database.mongo import users_collection 
from database.mongo import classes_collection
from database.mongo import violates_collection
from bson import ObjectId
from passlib.hash import bcrypt
from typing import Optional
import asyncio


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
@app.post("/api/register-video")
async def register_video(student_id: str = Form(...), name: str = Form(...), video: UploadFile = File(...)):
    try:
        VIDEO_DIR = "registered_videos"
        os.makedirs(VIDEO_DIR, exist_ok=True)
        path = os.path.join(VIDEO_DIR, f"{student_id}.webm")
        with open(path, "wb") as f:
            f.write(await video.read())
        used = enroll_from_video(path, student_id)
        return {"message": f"✅ Đăng ký thành công cho {name}", "frames_used": used}
    except Exception as e:
        return {"detail": str(e)}

# ==========================
# API: Xác thực khuôn mặt
    # ==========================
@app.post("/api/verify-face")
async def verify_face_api(image: UploadFile = File(...)):
    try:
        img_bytes = await image.read()
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        person_id, score = verify_face(pil_img)
        if person_id:
            return {"verified": True, "student": {"student_id": person_id}, "similarity": score}
        else:
            return {"verified": False, "similarity": score, "detail": "Không nhận diện được khuôn mặt."}
    except Exception as e:
        return {"verified": False, "detail": str(e)}

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

#Code 1 realtime cho sinh viên
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
#                 # 🖼️ Giải mã frame từ frontend
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)
#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 # 🔹 Nhận diện bằng mô hình FasterRCNN
#                 detections = behavior_service2.predict(frame, score_thresh=0.4)

#                 # ✅ In kết quả nhận diện ra console
#                 if detections:
#                     print(f"\n🟩 Student [{student}] - Detected {len(detections)} object(s):")
#                     for det in detections:
#                         x1, y1, x2, y2 = [int(x) for x in det["box"]]
#                         print(f"   • {det['label']} ({det['score']*100:.1f}%) at [{x1}, {y1}, {x2}, {y2}]")
#                 else:
#                     print(f"\n⬜ Student [{student}] - No objects detected above threshold.")

#                 # 🔹 Vẽ khung và encode lại thành base64 để gửi cho giáo viên
#                 draw_frame = behavior_service2.draw_detections(frame, detections)
#                 _, buffer = cv2.imencode(".jpg", draw_frame)
#                 frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

#                 # 🔹 Tính tỷ lệ vi phạm (số đối tượng không phải 'normal')
#                 if len(detections) > 0:
#                     abnormal = [d for d in detections if d["label"] != "normal"]
#                     violation_rate = len(abnormal) / len(detections)
#                 else:
#                     violation_rate = 0.0

#                 # 🔹 Gửi lại kết quả cho học sinh
#                 await websocket.send_json({
#                     "type": "self_assessment",
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": data.get("ts")
#                 })

#                 # 🔹 Gửi broadcast cho giáo viên
#                 await manager.broadcast_teachers(exam, {
#                     "type": "student_frame",
#                     "student": student,
#                     "frame_b64": frame_b64,
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "ts": data.get("ts")
#                 })

#     except WebSocketDisconnect:
#         await manager.disconnect_student(exam, student)
#         print(f"🔴 Student [{student}] disconnected from exam [{exam}]")


#Code 2 realtime cho sinh viên có bổ sung logic lưu trử với database
# Lưu trạng thái theo student
# violation_state = {}

# @app.websocket("/ws/student")
# async def ws_student(websocket: WebSocket):
#     exam = websocket.query_params.get("exam")
#     student = websocket.query_params.get("student")

#     # Lấy class_id của sinh viên từ exams hoặc từ bảng users (tùy bạn lưu)
#     student_info = await users_collection.find_one({"_id": student})
#     class_id = student_info.get("class_id") if student_info else None

#     await manager.connect_student(exam, student, websocket)
#     await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

#     # Setup tracking
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

#                 # Giải mã ảnh gửi từ frontend
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)

#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 # Detect
#                 detections = behavior_service2.predict(frame, score_thresh=0.4)

#                 # Phân loại vi phạm
#                 abnormal = [d for d in detections if d["label"] != "normal"]
#                 violation_rate = len(abnormal) / len(detections) if detections else 0

#                 # chọn hành vi mạnh nhất
#                 if abnormal:
#                     top = max(abnormal, key=lambda d: d["score"])
#                 else:
#                     top = {"label": "normal", "score": 1.0}

#                 behavior = top["label"]
#                 score = top["score"]

#                 # ---------------------------------------------------
#                 #   ⚠️ LOGIC 3 GIÂY VI PHẠM LIÊN TỤC
#                 # ---------------------------------------------------
#                 track = violation_state[student]

#                 if behavior != "normal" and score > 0.5:
#                     # Nếu đổi hành vi vi phạm → reset thời gian
#                     if track["last_behavior"] != behavior:
#                         track["last_behavior"] = behavior
#                         track["start_ts"] = ts
#                         track["reported"] = False
#                     else:
#                         # Vi phạm liên tục cùng hành vi
#                         duration = ts - track["start_ts"]

#                         if duration >= 3000 and not track["reported"]:
#                             track["reported"] = True

#                             # Ảnh chứng cứ base64
#                             evidence_b64 = (
#                                 "data:image/jpeg;base64," +
#                                 base64.b64encode(img_bytes).decode()
#                             )

#                             # ---------------------------------------------------
#                             #     💾 LƯU VÀO CƠ SỞ DỮ LIỆU MONGODB
#                             # ---------------------------------------------------
#                             await violates_collection.insert_one({
#                                 "student": student,
#                                 "exam": exam,
#                                 "class_id": class_id,
#                                 "behavior": behavior,
#                                 "score": score,
#                                 "start_ts": track["start_ts"],
#                                 "end_ts": ts,
#                                 "duration_ms": duration,
#                                 "timestamp": datetime.utcnow(),
#                                 "evidence": evidence_b64
#                             })

#                             print(f"🔥 SAVED VIOLATION FOR {student}: {behavior}")

#                             # ---------------------------------------------------
#                             #    📡 GỬI THÔNG BÁO REALTIME CHO GIÁO VIÊN
#                             # ---------------------------------------------------
#                             await manager.broadcast_teachers(exam, {
#                                 "type": "violation_detected",
#                                 "student": student,
#                                 "behavior": behavior,
#                                 "duration": duration,
#                                 "timestamp": ts,
#                                 "evidence": evidence_b64
#                             })

#                 else:
#                     # Reset khi bình thường
#                     track["last_behavior"] = None
#                     track["start_ts"] = None
#                     track["reported"] = False

#                 # ---------------------------------------------------
#                 #   📡 TRẢ KẾT QUẢ CHO HỌC SINH
#                 # ---------------------------------------------------
#                 draw_frame = behavior_service2.draw_detections(frame, detections)
#                 _, buffer = cv2.imencode(".jpg", draw_frame)
#                 frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

#                 await websocket.send_json({
#                     "type": "self_assessment",
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts
#                 })

#                 # ---------------------------------------------------
#                 #   📡 BROADCAST CHO GIẢNG VIÊN
#                 # ---------------------------------------------------
#                 await manager.broadcast_teachers(exam, {
#                     "type": "student_frame",
#                     "student": student,
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts
#                 })

#     except WebSocketDisconnect:
#         await manager.disconnect_student(exam, student)
#         violation_state.pop(student, None)
#         print(f"🔴 Student {student} disconnected")
#-----------------------------------------------------

#Code 3 code cho sinh vien có bouding box 
# violation_state = {}
# @app.websocket("/ws/student")
# async def ws_student(websocket: WebSocket):
#     exam = websocket.query_params.get("exam")
#     student = websocket.query_params.get("student")

#     # Lấy class_id của sinh viên
#     student_info = await users_collection.find_one({"_id": student})
#     class_id = student_info.get("class_id") if student_info else None

#     # Kết nối WS
#     await manager.connect_student(exam, student, websocket)
#     await manager.broadcast_teachers(exam, {
#         "type": "student_joined",
#         "student": student
#     })

#     # Trạng thái theo dõi
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

#                 # Giải mã ảnh
#                 b64 = data["b64"].split(",")[1]
#                 img_bytes = base64.b64decode(b64)

#                 np_arr = np.frombuffer(img_bytes, np.uint8)
#                 frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#                 # Detect bằng FasterRCNN
#                 detections = behavior_service2.predict(frame, score_thresh=0.4)

#                 # Phân loại
#                 abnormal = [d for d in detections if d["label"] != "normal"]
#                 violation_rate = len(abnormal) / len(detections) if detections else 0

#                 # Chọn nhãn vi phạm mạnh nhất
#                 if abnormal:
#                     top = max(abnormal, key=lambda d: d["score"])
#                 else:
#                     top = {"label": "normal", "score": 1.0}

#                 behavior = top["label"]
#                 score = top["score"]

#                 # ---------------------------------------------------
#                 #   ⚠️ LOGIC 3 GIÂY VI PHẠM LIÊN TỤC
#                 # ---------------------------------------------------
#                 track = violation_state[student]

#                 if behavior != "normal" and score > 0.5:
#                     # Nếu đổi hành vi → reset
#                     if track["last_behavior"] != behavior:
#                         track["last_behavior"] = behavior
#                         track["start_ts"] = ts
#                         track["reported"] = False
#                     else:
#                         duration = ts - track["start_ts"]

#                         if duration >= 3000 and not track["reported"]:
#                             track["reported"] = True

#                             # ---------------------------------------------
#                             #   🎯 Tạo ảnh chứng cứ có bounding box
#                             # ---------------------------------------------
#                             evidence_frame = behavior_service2.draw_detections(frame, detections)
#                             _, buf2 = cv2.imencode(".jpg", evidence_frame)
#                             evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buf2).decode()

#                             # ---------------------------------------------
#                             #   📦 Lưu bounding box vào database
#                             # ---------------------------------------------
#                             violation_boxes = [
#                                 {
#                                     "label": d["label"],
#                                     "score": d["score"],
#                                     "box": d["box"]
#                                 }
#                                 for d in detections if d["label"] != "normal"
#                             ]

#                             await violates_collection.insert_one({
#                                 "student": student,
#                                 "exam": exam,
#                                 "class_id": class_id,
#                                 "behavior": behavior,
#                                 "score": score,
#                                 "start_ts": track["start_ts"],
#                                 "end_ts": ts,
#                                 "duration_ms": duration,
#                                 "timestamp": datetime.utcnow(),
#                                 "bounding_boxes": violation_boxes,
#                                 "evidence_image": evidence_b64
#                             })

#                             print(f"🔥 SAVED VIOLATION FOR {student}: {behavior}")

#                             # ---------------------------------------------
#                             #    📡 Gửi realtime cho giảng viên
#                             # ---------------------------------------------
#                             await manager.broadcast_teachers(exam, {
#                                 "type": "violation_detected",
#                                 "student": student,
#                                 "behavior": behavior,
#                                 "duration": duration,
#                                 "timestamp": ts,
#                                 "image": evidence_b64,
#                                 "boxes": violation_boxes
#                             })

#                 else:
#                     # Reset khi bình thường
#                     track["last_behavior"] = None
#                     track["start_ts"] = None
#                     track["reported"] = False

#                 # ---------------------------------------------------
#                 #   📡 TRẢ KẾT QUẢ CHO HỌC SINH
#                 # ---------------------------------------------------
#                 draw_frame = behavior_service2.draw_detections(frame, detections)
#                 _, buffer = cv2.imencode(".jpg", draw_frame)
#                 frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

#                 await websocket.send_json({
#                     "type": "self_assessment",
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts
#                 })

#                 # ---------------------------------------------------
#                 #   📡 BROADCAST CHO GIẢNG VIÊN (live)
#                 # ---------------------------------------------------
#                 await manager.broadcast_teachers(exam, {
#                     "type": "student_frame",
#                     "student": student,
#                     "detections": detections,
#                     "violation_rate": violation_rate,
#                     "frame_b64": frame_b64,
#                     "ts": ts
#                 })

#     except WebSocketDisconnect:
#         await manager.disconnect_student(exam, student)
#         violation_state.pop(student, None)
#         print(f"🔴 Student {student} disconnected")

#Code 4 code sinh viên

# ============================================
# FASTAPI BACKEND — WS STUDENT
# ============================================

violation_state = {}

@app.websocket("/ws/student")
async def ws_student(websocket: WebSocket):
    import json, base64
    import numpy as np
    import cv2
    from datetime import datetime

    exam = websocket.query_params.get("exam")
    student = websocket.query_params.get("student")

    student_info = await users_collection.find_one({"_id": student})
    class_id = websocket.query_params.get("class_id") 
    await manager.connect_student(exam, student, websocket)
    await manager.broadcast_teachers(exam, {"type": "student_joined", "student": student})

    violation_state[student] = {
        "last_behavior": None,
        "start_ts": None,
        "reported": False
    }

    try:
        while True:
            raw_msg = await websocket.receive_text()

            try:
                data = json.loads(raw_msg)
            except:
                continue

            # ---------------------------------------------------
            #   📌 HANDLE CAMERA FRAME
            # ---------------------------------------------------
            if data.get("type") == "frame":
                ts = int(data["ts"])

                # Giải mã từ base64
                b64 = data["b64"].split(",")[1]
                img_bytes = base64.b64decode(b64)

                np_arr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                # Detect
                detections = behavior_service2.predict(frame, score_thresh=0.4)

                abnormal = [d for d in detections if d["label"] != "normal"]
                violation_rate = len(abnormal) / len(detections) if detections else 0

                if abnormal:
                    top = max(abnormal, key=lambda d: d["score"])
                else:
                    top = {"label": "normal", "score": 1.0}

                behavior = top["label"]
                score = top["score"]

                # ---------------------------------------------------
                #   ⚠️ LOGIC 3 GIÂY LIÊN TỤC
                # ---------------------------------------------------
                track = violation_state[student]

                if behavior != "normal" and score > 0.5:
                    if track["last_behavior"] != behavior:
                        track["last_behavior"] = behavior
                        track["start_ts"] = ts
                        track["reported"] = False

                    else:
                        duration = ts - track["start_ts"]

                        if duration >= 3000 and not track["reported"]:
                            track["reported"] = True

                            # ---------------------------------------------------
                            #  🎨 TẠO ẢNH BBOX LÀM EVIDENCE
                            # ---------------------------------------------------
                            draw_frame = behavior_service2.draw_detections(
                                frame, detections
                            )
                            _, buffer = cv2.imencode(".jpg", draw_frame)
                            evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

                            # ---------------------------------------------------
                            #     💾 LƯU MONGODB
                            # ---------------------------------------------------
                            await violates_collection.insert_one({
                                "student": student,
                                "exam": exam,
                                "class_id": class_id,
                                "behavior": behavior,
                                "score": score,
                                "start_ts": track["start_ts"],
                                "end_ts": ts,
                                "duration_ms": duration,
                                "timestamp": datetime.utcnow(),
                                "evidence": evidence_b64,
                            })

                            print(f"[🔥] SAVED VIOLATION: {student} - {behavior}")

                            # ---------------------------------------------------
                            #  📡 GỬI GIẢNG VIÊN THÔNG BÁO VI PHẠM
                            # ---------------------------------------------------
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

                # ---------------------------------------------------
                #   🎨 TẠO FRAME LIVE ĐÃ VẼ BBOX
                # ---------------------------------------------------
                draw_frame = behavior_service2.draw_detections(frame, detections)
                _, buffer = cv2.imencode(".jpg", draw_frame)
                frame_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

                # Gửi lại học sinh
                await websocket.send_json({
                    "type": "self_assessment",
                    "detections": detections,
                    "violation_rate": violation_rate,
                    "frame_b64": frame_b64,
                    "ts": ts,
                })

                # Gửi realtime cho giáo viên
                await manager.broadcast_teachers(exam, {
                    "type": "student_frame",
                    "student": student,
                    "detections": detections,
                    "violation_rate": violation_rate,
                    "frame_b64": frame_b64,
                    "ts": ts,
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


# @app.post("/api/create-exam")
# async def create_exam(data: dict):
#     code = data.get("code", "").strip()
#     name = data.get("name", "").strip()
#     created_by = data.get("created_by", "").strip()
    
#     start_time_str = data.get("start_time", None)
#     duration = data.get("duration", None)


#     if not code or not name or not created_by:
#         raise HTTPException(status_code=400, detail="Thiếu mã, tên hoặc người tạo.")

#     # Kiểm tra trùng mã phòng
#     existing = await exams_collection.find_one({"code": code})
#     if existing:
#         raise HTTPException(status_code=400, detail="Mã phòng thi đã tồn tại.")

#     # Kiểm tra người tạo có tồn tại trong bảng user
#     teacher = await users_collection.find_one({"_id": ObjectId(created_by)})
#     if not teacher:
#         raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên tạo phòng.")


#      # 🕒 Xử lý thời gian bắt đầu (nếu có)
#     start_time = None
#     if start_time_str:
#         try:
#             # Chuyển từ string ISO 8601 thành datetime (ví dụ: 2025-10-30T14:30)
#             start_time = datetime.fromisoformat(start_time_str)
#         except Exception:
#             raise HTTPException(status_code=400, detail="Thời gian bắt đầu không hợp lệ. Định dạng hợp lệ: YYYY-MM-DDTHH:MM")

#     exam = {
#         "code": code,
#         "name": name,
#         "created_by": created_by,          # ✅ lưu id người tạo
#         "created_by_name": teacher["name"],
#         "start_time": start_time,   # ✅ lưu thêm tên để tiện hiển thị
#         "duration": duration,
#         "created_at": datetime.utcnow(),
#     }

#     result = await exams_collection.insert_one(exam)
#     inserted_exam = await exams_collection.find_one({"_id": result.inserted_id})

#     return {
#         "success": True,
#         "exam": serialize_doc(inserted_exam),
#     }


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


@app.get("/api/get-class/{class_id}")
async def get_class_by_id(class_id: str):
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    # Lấy thông tin sinh viên chi tiết
    student_ids = cls.get("students", [])
    students_info = []
    async for user in users_collection.find({"_id": {"$in": [ObjectId(sid) for sid in student_ids]}}):
        students_info.append({
            "_id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "student_id": user.get("student_id")
        })

    # Lấy thông tin lịch thi
    exams_info = []
    async for exam in exams_collection.find({"class_id": str(cls["_id"])}):
        exams_info.append({
            "_id": str(exam["_id"]),
            "name": exam.get("name"),
            "code": exam.get("code"),
            "start_time": exam.get("start_time"),
            "duration": exam.get("duration"),
            "created_by": exam.get("created_by"),
            "created_by_name": exam.get("created_by_name")
        })

    serialized = {
        "_id": str(cls["_id"]),
        "name": cls.get("name"),
        "code": cls.get("code"),
        "teacher_id": cls.get("teacher_id"),
        "teacher_name": cls.get("teacher_name"),
        "visibility": cls.get("visibility"),
        "exams": exams_info,
        "students": students_info
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
            exam_code = exam.get("code", "")
            
            # Lấy các vi phạm liên quan (exam code + class code)
            violates_cursor = violates_collection.find({
                "exam": exam_code,
                "class_id": cls.get("code", "")
            })
            violations = await violates_cursor.to_list(length=None)
            violations_serialized = [serialize_doc2(v) for v in violations]

            exam_data_list.append({
                "exam": exam_code,
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
        exam_code = v.get("exam")
        
        # Lấy thông tin lớp theo code
        cls = await classes_collection.find_one({"code": cls_code})
        cls_id = str(cls["_id"]) if cls else None

        # Lấy thông tin kỳ thi theo code + class_id
        exam = None
        if cls_id:
            exam = await exams_collection.find_one({"code": exam_code, "class_id": cls_id})

        detailed_violations.append({
            **serialize_doc2(v),
            "class_code": cls_code,
            "class_name": cls.get("name") if cls else "",
            "exam_code": exam_code,
            "exam_name": exam.get("name") if exam else "",
        })

    return {"student_code": student_code, "violations": detailed_violations}