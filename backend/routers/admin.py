"""
Admin router
Handles admin-only endpoints: manage subjects, teachers, generate reports
"""
from fastapi import APIRouter, HTTPException, Depends
from database.mongo import (
    classes_collection, users_collection, 
    violates_collection, exams_collection
)
from utils.serializers import serialize_class, serialize_doc, serialize_doc2
from utils.email_service import send_email_notification
from core.websocket_manager import broadcast_class_event, notify_teacher
from security import require_role
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter()


@router.post("/admin/get-all-classes")
async def admin_get_all_classes(data: dict = {}, current_user: dict = Depends(require_role(["admin"]))):
    """Admin: Lấy tất cả lớp học (môn học) trong hệ thống"""
    classes = []
    async for cls in classes_collection.find({}):
        classes.append(serialize_class(cls))
    
    return {"success": True, "classes": classes}


@router.post("/admin/create-subject")
async def admin_create_subject(data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Admin: Tạo môn học và phân giảng viên"""
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

    # Tạo môn học
    new_subject = {
        "name": name,
        "code": code,
        "teacher_id": teacher_id,
        "teacher_name": teacher["name"],
        "visibility": "public",
        "password": "",
        "students": [],
        "description": description,
        "created_by_admin": True,
        "created_at": datetime.utcnow(),
    }

    result = await classes_collection.insert_one(new_subject)
    inserted = await classes_collection.find_one({"_id": result.inserted_id})

    # Realtime broadcast
    try:
        await broadcast_class_event({
            "type": "class_created",
            "class": serialize_class(inserted)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast môn học mới:", e)

    # Gửi thông báo tới giảng viên
    try:
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


@router.post("/admin/get-all-teachers")
async def admin_get_all_teachers(data: dict = {}, current_user: dict = Depends(require_role(["admin"]))):
    """Admin: Lấy danh sách tất cả giảng viên để phân công"""
    teachers = []
    async for teacher in users_collection.find({"role": "teacher"}, {"password": 0}):
        teachers.append(serialize_doc(teacher))
    
    return {"success": True, "teachers": teachers}


@router.post("/admin/update-subject-teacher")
async def admin_update_subject_teacher(data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Admin: Cập nhật giảng viên cho môn học đã tồn tại"""
    class_id = data.get("class_id", "").strip()
    new_teacher_id = data.get("teacher_id", "").strip()

    if not class_id or not new_teacher_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc teacher_id.")

    if not ObjectId.is_valid(class_id) or not ObjectId.is_valid(new_teacher_id):
        raise HTTPException(status_code=400, detail="ID không hợp lệ.")

    # Kiểm tra môn học tồn tại
    subject = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not subject:
        raise HTTPException(status_code=404, detail="Môn học không tồn tại.")

    # Kiểm tra giảng viên mới
    new_teacher = await users_collection.find_one({"_id": ObjectId(new_teacher_id), "role": "teacher"})
    if not new_teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên hợp lệ.")

    old_teacher_id = subject.get("teacher_id")

    # Cập nhật giảng viên
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

    # Realtime broadcast
    try:
        await broadcast_class_event({
            "type": "class_updated",
            "class": serialize_class(updated_class)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast cập nhật giảng viên:", e)

    # Gửi thông báo tới giảng viên mới
    try:
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
            
        notification_event = {
            "type": "assigned_to_subject",
            "subject": serialize_class(updated_class),
            "message": f"Bạn đã được phân công giảng dạy môn học: {updated_class.get('name')} ({updated_class.get('code')})",
            "created_at": datetime.utcnow().isoformat(),
        }
        await notify_teacher(new_teacher_id, notification_event)
    except Exception as e:
        print(f"⚠ Lỗi gửi thông báo tới giảng viên mới: {e}")

    return {"success": True, "class": serialize_class(updated_class)}


@router.post("/admin/generate-report")
async def generate_report(data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Tạo báo cáo tổng hợp cho admin"""
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
            "behavior_display": behavior_display,
        })
    
    # Thống kê
    total_violations = len(detailed_violations)
    behavior_violations = len([v for v in detailed_violations if v.get("type") == "behavior"])
    face_violations = len([v for v in detailed_violations if v.get("type") == "face"])
    
    # Thống kê theo lớp
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
    
    # Trả về đúng cấu trúc mà frontend expect
    return {
        "success": True,
        "report": {
            "statistics": {
                "total_violations": total_violations,
                "behavior_violations": behavior_violations,
                "face_violations": face_violations,
            },
            "filter": {
                "start_date": start_date,
                "end_date": end_date,
                "class_id": class_id,
            },
            "class_statistics": class_stats,  # Frontend expect class_statistics
            "violations": detailed_violations
        }
    }

