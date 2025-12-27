"""
Classes router
Handles class management: create, get, join, add students, etc.
"""
from fastapi import APIRouter, HTTPException
from database.mongo import (
    classes_collection, users_collection, 
    exams_collection, exam_sessions_collection
)
from utils.serializers import serialize_doc, serialize_class
from core.websocket_manager import broadcast_class_event, notify_teacher
from utils.email_service import send_email_notification
from datetime import datetime
from bson import ObjectId

router = APIRouter()


@router.post("/create-class")
async def create_class(data: dict):
    """Tạo lớp học mới"""
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()
    teacher_id = data.get("teacher_id", "").strip()
    visibility = data.get("visibility", "public")
    password = data.get("password", "").strip()

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

    # Kiểm tra trùng
    existing_name = await classes_collection.find_one({"name": name, "teacher_id": teacher_id})
    if existing_name:
        raise HTTPException(status_code=400, detail="Tên lớp đã tồn tại.")

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

    # Realtime broadcast
    try:
        await broadcast_class_event({
            "type": "class_created",
            "class": serialize_class(inserted)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast lớp mới:", e)

    return {"success": True, "class": serialize_class(inserted)}


@router.post("/get-classes")
async def get_classes(data: dict):
    """Lấy danh sách lớp theo user"""
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

        async for cls in classes_collection.find({}):
            cls_serialized = serialize_class(cls)
            if user_id in cls.get("students", []):
                joined_classes.append(cls_serialized)
            else:
                not_joined_classes.append(cls_serialized)

        return {
            "success": True,
            "joinedClasses": joined_classes,
            "notJoinedClasses": not_joined_classes
        }


@router.post("/join-class")
async def join_class(data: dict):
    """Học sinh tham gia lớp"""
    class_id = data.get("class_id", "").strip()
    student_id = data.get("student_id", "").strip()

    if not class_id or not student_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id hoặc student_id.")

    class_doc = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")

    # Thêm student nếu chưa tồn tại
    if student_id not in class_doc.get("students", []):
        await classes_collection.update_one(
            {"_id": ObjectId(class_id)},
            {"$addToSet": {"students": student_id}}
        )

    updated = await classes_collection.find_one({"_id": ObjectId(class_id)})

    # Realtime broadcast
    try:
        await broadcast_class_event({
            "type": "class_updated",
            "class": serialize_class(updated)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast join lớp:", e)

    return {"success": True, "class": serialize_class(updated)}


@router.post("/add-students-to-class")
async def add_students_to_class(data: dict):
    """Thêm sinh viên vào lớp (giảng viên)"""
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

    # Realtime broadcast
    try:
        await broadcast_class_event({
            "type": "class_updated",
            "class": serialize_class(updated)
        })
    except Exception as e:
        print("⚠ Lỗi broadcast cập nhật lớp:", e)

    return {"success": True, "class": serialize_class(updated)}


@router.post("/get-students-by-teacher")
async def get_students_by_teacher(data: dict):
    """Lấy danh sách sinh viên theo giảng viên"""
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


@router.post("/get-exams-by-class")
async def get_exams_by_class(data: dict):
    """Lấy danh sách lịch thi theo lớp"""
    class_id = data.get("class_id", "").strip()
    if not class_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id.")

    exams = []
    async for exam in exams_collection.find({"class_id": class_id}):
        exams.append(serialize_doc(exam))

    return {"success": True, "exams": exams}


@router.post("/get-students")
async def get_students(data: dict = {}):
    """Lấy tất cả sinh viên hoặc theo teacher_id"""
    teacher_id = data.get("teacher_id", "").strip()

    if teacher_id:
        all_student_ids = set()
        async for cls in classes_collection.find({"teacher_id": teacher_id}):
            for sid in cls.get("students", []):
                all_student_ids.add(sid)
        query_ids = [ObjectId(sid) for sid in all_student_ids]
        students_cursor = users_collection.find({"_id": {"$in": query_ids}, "role": "student"})
    else:
        students_cursor = users_collection.find({"role": "student"})

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}


@router.post("/get-students-in-class")
async def get_students_in_class(data: dict):
    """Lấy danh sách sinh viên trong lớp"""
    class_id = data.get("class_id")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    class_student_ids = cls.get("students", [])

    if not class_student_ids:
        return {"success": True, "students": []}

    object_ids_in_class = [ObjectId(sid) for sid in class_student_ids]

    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$in": object_ids_in_class}
    })

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}


@router.post("/get-students-not-in-class")
async def get_students_not_in_class(data: dict):
    """Lấy tất cả sinh viên KHÔNG thuộc lớp"""
    class_id = data.get("class_id")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    class_student_ids = set(cls.get("students", []))
    object_ids_in_class = [ObjectId(sid) for sid in class_student_ids]

    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$nin": object_ids_in_class}
    })

    students = []
    async for stu in students_cursor:
        students.append(serialize_doc(stu))

    return {"success": True, "students": students}


@router.post("/get-students-not-in-session")
async def get_students_not_in_session(data: dict):
    """Lấy sinh viên chưa được phân vào ca thi"""
    session_id = data.get("session_id")
    class_id = data.get("class_id")

    if not session_id or not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Session ID không hợp lệ")

    if not class_id or not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

    session = await exam_sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Ca thi không tồn tại")

    cls = await classes_collection.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    exam_id = session.get("exam_id")
    if not exam_id:
        raise HTTPException(status_code=400, detail="Ca thi không có exam_id")

    # Lấy các ca thi cùng bài thi
    other_sessions_cursor = exam_sessions_collection.find({"exam_id": exam_id})

    students_in_other_sessions = set()
    async for s in other_sessions_cursor:
        for stu in s.get("students", []):
            students_in_other_sessions.add(str(stu))

    class_student_ids = {str(s) for s in cls.get("students", [])}

    eligible_student_ids = [
        ObjectId(sid)
        for sid in class_student_ids
        if sid not in students_in_other_sessions
    ]

    students_cursor = users_collection.find({
        "role": "student",
        "_id": {"$in": eligible_student_ids}
    })

    students = [serialize_doc(stu) async for stu in students_cursor]

    return {"success": True, "students": students}


@router.post("/get-class")
async def get_class_by_id(payload: dict):
    """Lấy thông tin lớp học, danh sách sinh viên, danh sách bài thi và ca thi"""
    class_id = payload.get("class_id")
    student_id = payload.get("student_id")

    if not class_id:
        raise HTTPException(status_code=400, detail="Thiếu class_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Thiếu student_id")
    if not ObjectId.is_valid(class_id):
        raise HTTPException(status_code=400, detail="Class ID không hợp lệ")

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
            "students": ObjectId(student_id)
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
            "start_time": exam.get("start_time"),
            "duration": exam.get("duration"),
            "created_by": exam.get("created_by"),
            "created_by_name": exam.get("created_by_name"),
            "student_sessions": student_sessions
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

