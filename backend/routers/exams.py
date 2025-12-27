"""
Exams router
Handles exam management: create, get exams
"""
from fastapi import APIRouter, HTTPException
from database.mongo import exams_collection, users_collection, classes_collection
from utils.serializers import serialize_doc, serialize_class
from core.websocket_manager import broadcast_exam_created, broadcast_class_event
from datetime import datetime
from bson import ObjectId

router = APIRouter()


@router.post("/create-exam")
async def create_exam(data: dict):
    """Tạo phòng thi mới"""
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

    # ✅ Gửi realtime
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

    return {
        "success": True,
        "exam": inserted_exam_serialized,
    }


@router.get("/exams")
async def get_exams():
    """Lấy danh sách tất cả phòng thi"""
    exams = []
    async for exam in exams_collection.find():
        exams.append(serialize_doc(exam))
    return {"exams": exams}


@router.post("/exams_by_teacher")
async def get_exams_by_teacher(data: dict):
    """Lấy danh sách phòng thi theo giáo viên"""
    created_by = data.get("created_by")
    
    if not created_by:
        raise HTTPException(status_code=400, detail="Thiếu created_by")
    
    exams = []
    async for exam in exams_collection.find({"created_by": created_by}):
        exams.append(serialize_doc(exam))
    
    return {"exams": exams}
