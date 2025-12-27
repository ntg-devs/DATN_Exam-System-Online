"""
Violations router
Handles violation queries for teachers and students
"""
from fastapi import APIRouter, HTTPException
from database.mongo import (
    violates_collection, users_collection,
    classes_collection, exams_collection
)
from utils.serializers import serialize_doc, serialize_doc2
from bson import ObjectId

router = APIRouter()


@router.post("/teacher/violations")
async def get_violations(data: dict):
    """Lấy danh sách vi phạm theo giáo viên"""
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
        cls_id_str = str(cls["_id"])
        students_ids = cls.get("students", [])

        # Lấy các kỳ thi của lớp
        exams_cursor = exams_collection.find({"class_id": cls_id_str})
        exams = await exams_cursor.to_list(length=None)

        exam_data_list = []
        for exam in exams:
            exam_id = exam.get("_id", "")
            exam_id_str = str(exam_id)

            violates_cursor = (
                violates_collection
                .find({
                    "exam_id": exam_id_str,
                    "class_id": cls_id_str
                })
                .sort("timestamp", -1)
            )

            violations = await violates_cursor.to_list(length=None)
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


@router.post("/student/violations")
async def get_student_violations(data: dict):
    """Lấy danh sách vi phạm theo sinh viên"""
    student_code = data.get("student_code", "").strip()
    if not student_code:
        raise HTTPException(status_code=400, detail="Student code không hợp lệ")

    # Lấy tất cả vi phạm của sinh viên
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

        # Lấy thông tin kỳ thi
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

