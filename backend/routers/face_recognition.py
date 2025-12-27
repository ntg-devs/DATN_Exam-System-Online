"""
Face Recognition router
Handles face registration and verification
"""
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from database.mongo import users_collection
from utils.video_utils import extract_frame_at_5s
from utils.face_utils import (
    get_face_db, mtcnn, extract_embedding_from_pil,
    _detect_faces_pil, _compute_face_results_from_tensors, _find_best_label_for_emb
)
# notify_student imported in functions to avoid circular import
from services.face_recognition.enroll_from_video_f import enroll_from_video, extract_embedding
from PIL import Image
import os
import io
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter()


@router.post("/register-video")
async def register_video(
    student_id: str = Form(...),
    name: str = Form(...),
    video: UploadFile = File(...)
):
    """Đăng ký khuôn mặt từ video"""
    try:
        VIDEO_DIR = "registered_videos"
        os.makedirs(VIDEO_DIR, exist_ok=True)

        # 1. Lưu video
        path = os.path.join(VIDEO_DIR, f"{student_id}.webm")
        with open(path, "wb") as f:
            f.write(await video.read())

        # Đánh dấu trạng thái xử lý
        await users_collection.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "face_processing_status": "processing",
                    "face_registered": False,
                }
            }
        )

        # Gửi thông báo pending
        from core.websocket_manager import notify_student
        await notify_student(student_id, {
            "type": "face_register_pending",
            "student_id": student_id,
            "message": "Hệ thống đang xử lý video đăng ký..."
        })

        # 2. Training khuôn mặt
        frames_used = enroll_from_video(path, student_id)

        # 3. Trích frame giây thứ 5
        frame_base64, error_msg = extract_frame_at_5s(path)

        if error_msg:
            raise Exception(f"Không thể lấy ảnh preview: {error_msg}")

        if frame_base64 is None:
            raise Exception("Không thể trích xuất hình ảnh ở giây thứ 5.")

        # 4. Lưu vào database
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

        # Gửi success
        from core.websocket_manager import notify_student
        await notify_student(student_id, {
            "type": "face_register_success",
            "student_id": student_id,
            "name": name,
            "message": "Đăng ký khuôn mặt thành công!",
            "preview_image": frame_base64
        })

        return {
            "success": True,
            "message": f"✅ Đăng ký thành công cho sinh viên có mã {name}",
            "frames_used": frames_used,
            "saved_image": True,
            "face_image": frame_base64
        }

    except Exception as e:
        # Gửi failed
        from core.websocket_manager import notify_student
        await notify_student(student_id, {
            "type": "face_register_failed",
            "student_id": student_id,
            "error": str(e)
        })
        # Lưu trạng thái thất bại
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


@router.post("/verify-face")
async def verify_face_api(image: UploadFile = File(...)):
    """Xác thực khuôn mặt từ ảnh"""
    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    boxes, _ = mtcnn.detect(pil_img)

    if boxes is None:
        return {"verified": False, "faces": []}

    db = get_face_db()
    results = []

    faces_tensor = mtcnn(pil_img)

    if isinstance(faces_tensor, list):
        faces_tensor = faces_tensor[0] if len(faces_tensor) > 0 else None

    if faces_tensor is None:
        return {"verified": False, "faces": []}

    if isinstance(faces_tensor, list):
        faces_tensor = faces_tensor[0]

    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = map(int, box)

        if isinstance(faces_tensor, list):
            face_tensor = faces_tensor[i] if i < len(faces_tensor) else None
        else:
            face_tensor = faces_tensor

        if face_tensor is None:
            continue

        emb = extract_embedding(face_tensor)

        best_score = -1
        best_label = "unknown"

        for person_id, data in db.items():
            if "mean" not in data:
                continue
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
