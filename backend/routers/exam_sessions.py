"""
Exam Sessions router
Handles exam session management: create, list, add students, etc.
"""
from fastapi import APIRouter, HTTPException
from database.mongo import (
    exam_sessions_collection, exams_collection, 
    classes_collection, users_collection
)
from utils.serializers import serialize_doc, serialize_doc2
from utils.email_service import send_email_notification
from core.websocket_manager import (
    broadcast_session_realtime, broadcast_session_update
)
from datetime import datetime, timedelta, timezone
from bson import ObjectId

router = APIRouter()


@router.post("/exam-session/create")
async def create_exam_session(payload: dict):
    """Tạo ca thi mới"""
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
            if isinstance(start_time_str, str):
                parsed_time = datetime.fromisoformat(start_time_str)
                if parsed_time.tzinfo is None:
                    vietnam_tz = timezone(timedelta(hours=7))
                    local_time = parsed_time.replace(tzinfo=vietnam_tz)
                    start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
                    print(f"[DEBUG] Converted start_time: {start_time_str} (local UTC+7) -> {start_time} (UTC)")
                else:
                    start_time = parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
            elif isinstance(start_time_str, datetime):
                if start_time_str.tzinfo is None:
                    vietnam_tz = timezone(timedelta(hours=7))
                    local_time = start_time_str.replace(tzinfo=vietnam_tz)
                    start_time = local_time.astimezone(timezone.utc).replace(tzinfo=None)
                else:
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

    # Broadcast session created event to all teachers
    exam_doc = await exams_collection.find_one({"_id": ObjectId(exam_id)})
    class_id = exam_doc.get("class_id") if exam_doc else None
    class_doc = None
    if class_id:
        class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    
    # Broadcast to all teachers
    teacher_users = await users_collection.find({"role": "teacher"}).to_list(length=None)
    for teacher in teacher_users:
        teacher_id = str(teacher["_id"])
        await broadcast_session_realtime({
            "type": "session_created",
            "session": serialize_doc(session),
            "exam_id": exam_id,
            "exam_name": exam_doc.get("name") if exam_doc else "",
            "class_id": str(class_id) if class_id else None,
            "class_name": class_doc.get("name") if class_doc else "",
            "teacher_id": teacher_id,  # Broadcast to specific teacher
        })

    return {"success": True, "session": session}


@router.post("/exam-session/list")
async def get_exam_sessions(data: dict):
    """Lấy danh sách ca thi theo exam_id"""
    exam_id = data.get("exam_id")
    if not exam_id or not ObjectId.is_valid(exam_id):
        raise HTTPException(status_code=400, detail="Exam ID không hợp lệ")

    sessions = []
    async for ses in exam_sessions_collection.find({"exam_id": exam_id}):
        ses["_id"] = str(ses["_id"])
        ses["students"] = [str(s) for s in ses.get("students", [])]
        sessions.append(ses)

    return {"success": True, "sessions": sessions}


@router.post("/exam-session/add-students")
async def add_students_to_exam_session(payload: dict):
    """Thêm sinh viên vào ca thi"""
    session_id = payload.get("session_id")
    student_ids = payload.get("student_ids", [])

    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    if not isinstance(student_ids, list):
        raise HTTPException(status_code=400, detail="Danh sách sinh viên phải là list")

    # Convert sang ObjectId
    oid_students = []
    for sid in student_ids:
        if ObjectId.is_valid(sid):
            oid_students.append(ObjectId(sid))

    if not oid_students:
        raise HTTPException(status_code=400, detail="Không có student_id hợp lệ")

    # Thêm vào session (không trùng)
    result = await exam_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$addToSet": {"students": {"$each": oid_students}}},
    )

    if result.modified_count == 0:
        return {"success": False, "detail": "Không có thay đổi hoặc session không tồn tại"}

    # Lấy exam_id từ session
    session_doc = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    
    exam_id = str(session_doc.get("exam_id"))
    exam_doc = await exams_collection.find_one({"_id": ObjectId(exam_id)})
    
    # Lấy thông tin lớp học
    class_id = exam_doc.get("class_id") if exam_doc else None
    class_doc = None
    if class_id:
        class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})

    # Broadcast tới từng sinh viên được thêm vào
    for student_oid in oid_students:
        student_id_str = str(student_oid)
        await broadcast_session_realtime({
            "type": "session_updated",
            "action": "students_added",
            "session_id": session_id,
            "exam_id": exam_id,
            "nameExam": exam_doc.get("name") if exam_doc else "",
            "nameSession": session_doc.get("name"),
            "student_id": student_id_str,  # Gửi riêng cho từng student
        })
    
    # Broadcast tới tất cả giáo viên để cập nhật danh sách ca thi
    teacher_users = await users_collection.find({"role": "teacher"}).to_list(length=None)
    for teacher in teacher_users:
        teacher_id = str(teacher["_id"])
        await broadcast_session_realtime({
            "type": "session_updated",
            "action": "students_added_to_session",
            "session_id": session_id,
            "exam_id": exam_id,
            "nameExam": exam_doc.get("name") if exam_doc else "",
            "nameSession": session_doc.get("name"),
            "student_ids": [str(s) for s in oid_students],  # Gửi danh sách student_ids cho teacher
            "teacher_id": teacher_id,  # Broadcast to specific teacher
        })

    # Gửi email cho từng sinh viên
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


@router.post("/get-students-in-session")
async def get_students_in_session(data: dict):
    """Lấy danh sách sinh viên trong ca thi"""
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


@router.get("/exam-session/detail/{session_id}")
async def get_exam_session_detail(session_id: str):
    """Lấy chi tiết ca thi"""
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


@router.post("/exam-session/remove-student")
async def remove_student_from_session(payload: dict):
    """Xóa sinh viên khỏi ca thi"""
    session_id = payload.get("session_id")
    student_id = payload.get("student_id")

    if not ObjectId.is_valid(session_id) or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    result = await exam_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$pull": {"students": ObjectId(student_id)}}
    )

    return {"success": True, "removed": result.modified_count}


@router.post("/student/current-sessions")
async def get_student_current_sessions(data: dict):
    """Lấy danh sách ca thi hiện tại của sinh viên"""
    student_id = data.get("student_id")

    if not student_id or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Student ID không hợp lệ")

    student_obj_id = ObjectId(student_id)

    # Thời gian hiện tại (UTC + 7)
    now = datetime.utcnow() + timedelta(hours=7)

    sessions_cursor = exam_sessions_collection.find({
        "students": student_obj_id
    })

    current_sessions = []

    async for session in sessions_cursor:
        raw_start_time = session.get("start_time")
        if not raw_start_time:
            continue

        start_time = None

        # Parse start_time
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

        # Tính mốc thời gian
        start_ms = start_time.timestamp() * 1000
        enter_end_ms = start_ms + 15 * 60 * 1000
        end_ms = start_ms + duration * 60 * 1000
        now_ms = now.timestamp() * 1000

        # Chỉ cho vào phòng thi trong 15 phút đầu
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

    return {
        "success": True,
        "sessions": current_sessions
    }
