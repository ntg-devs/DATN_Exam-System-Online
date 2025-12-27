"""
WebSockets router
Handles all WebSocket connections for realtime updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.socket_manager.connection_manager import ConnectionManager
from services.behavior_detected.behavior_recognition_fcnn import BehaviorDetectionService
from database.mongo import violates_collection
from utils.face_utils import (
    get_face_db, mtcnn, _detect_faces_pil,
    _compute_face_results_from_tensors, _find_best_label_for_emb,
    FACE_SIMILARITY_THRESHOLD, FACE_CHECK_INTERVAL_MS,
    MULTI_FACE_VIOLATION_MIN, UNKNOWN_FACE_PERSIST_MS,
    BEHAVIOR_VIOLATION_DURATION_MS
)
from PIL import Image
import asyncio
import json
import base64
import cv2
import numpy as np
from datetime import datetime

router = APIRouter()

# WebSocket clients storage (defined here to avoid circular import)
active_exam_clients = []
active_session_clients = []
active_class_clients = []
active_student_clients = {}
active_student_session_clients = {}
active_teacher_clients = {}

# Initialize services
manager = ConnectionManager()
# Lazy load behavior service to avoid import errors
behavior_service = None

def get_behavior_service():
    """Lazy load behavior service"""
    global behavior_service
    if behavior_service is None:
        behavior_service = BehaviorDetectionService("models/fasterrcnn_final.pth")
    return behavior_service

violation_state = {}


@router.websocket("/ws/student_register_video")
async def ws_student_register_video(websocket: WebSocket):
    """WebSocket cho thông báo đăng ký khuôn mặt"""
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


@router.websocket("/ws/student")
async def ws_student(websocket: WebSocket):
    """WebSocket cho sinh viên khi đang thi (realtime monitoring)"""
    await websocket.accept()

    exam = websocket.query_params.get("exam")
    session = websocket.query_params.get("session")
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
    face_db = get_face_db()

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

            # 1) BEHAVIOR DETECTION (liên tục)
            detections = get_behavior_service().predict(frame, score_thresh=0.4)
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
                        draw_frame = get_behavior_service().draw_detections(frame, detections)
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

            # 2) FACE CHECK (mỗi 30s)
            face_results = []
            ran_face_check = False

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

                    # Face Violation Rules
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

                    # Gửi vi phạm (nếu có)
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

            # 3) DRAW FINAL FRAME
            draw_frame = get_behavior_service().draw_detections(frame, detections)

            # Chỉ vẽ box khuôn mặt khi thực sự detect (mỗi 30s)
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
                "faces": face_results if ran_face_check else [],
            })

            await manager.broadcast_teachers(exam, {
                "type": "student_frame",
                "student": student,
                "detections": detections,
                "frame_b64": frame_b64,
                "ts": ts,
                "faces": face_results if ran_face_check else [],
            })

    except WebSocketDisconnect:
        violation_state.pop(student, None)
        await manager.disconnect_student(exam, session, student)
        print(f"🔴 Student {student} disconnected")


@router.websocket("/ws/teacher")
async def ws_teacher(websocket: WebSocket):
    """WebSocket cho giáo viên giám sát phòng thi"""
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


@router.websocket("/ws/exams")
async def ws_exams(websocket: WebSocket):
    """WebSocket cho realtime exam updates"""
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


@router.websocket("/ws/sessions")
async def ws_sessions(websocket: WebSocket):
    """WebSocket endpoint cho realtime session updates (cho cả student và teacher)"""
    await websocket.accept()
    user_type = websocket.query_params.get("type", "")
    user_id = websocket.query_params.get("user_id", "")
    
    active_session_clients.append(websocket)
    
    if user_type == "student" and user_id:
        if user_id not in active_student_session_clients:
            active_student_session_clients[user_id] = []
        active_student_session_clients[user_id].append(websocket)
        print(f"✅ Student {user_id} connected to session realtime")
    elif user_type == "teacher" and user_id:
        if user_id not in active_teacher_clients:
            active_teacher_clients[user_id] = []
        active_teacher_clients[user_id].append(websocket)
        print(f"✅ Teacher {user_id} connected to session realtime")
    else:
        print("✅ Client connected to session realtime (no user type)")

    try:
        while True:
            await asyncio.sleep(1)   # giữ kết nối mở
    except WebSocketDisconnect:
        print("❌ Client disconnected session realtime")
    finally:
        if websocket in active_session_clients:
            active_session_clients.remove(websocket)
        if user_type == "student" and user_id and user_id in active_student_session_clients:
            if websocket in active_student_session_clients[user_id]:
                active_student_session_clients[user_id].remove(websocket)
        if user_type == "teacher" and user_id and user_id in active_teacher_clients:
            if websocket in active_teacher_clients[user_id]:
                active_teacher_clients[user_id].remove(websocket)


@router.websocket("/ws/classes")
async def ws_classes(websocket: WebSocket):
    """WebSocket cho realtime class updates"""
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


@router.websocket("/ws/teachers/notifications")
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
