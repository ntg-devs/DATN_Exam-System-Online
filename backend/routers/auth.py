"""
Authentication router
Handles login, face login, password change, etc.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, status
from database.mongo import users_collection
from utils.serializers import serialize_doc
from security import (
    create_access_token, get_current_user,
    check_rate_limit, get_client_ip,
    verify_password, hash_password, validate_password_strength,
    sanitize_email,
    LOGIN_RATE_LIMIT_REQUESTS, LOGIN_RATE_LIMIT_WINDOW
)
from datetime import datetime
from bson import ObjectId

router = APIRouter()


@router.post("/login")
async def login_user(data: dict, request: Request):
    """Login endpoint với rate limiting và JWT token"""
    # Rate limiting cho login endpoint
    client_ip = get_client_ip(request)
    
    if check_rate_limit(f"login_{client_ip}", LOGIN_RATE_LIMIT_REQUESTS, LOGIN_RATE_LIMIT_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 5 phút."
        )
    
    # Sanitize inputs
    email = sanitize_email(data.get("email", ""))
    password = data.get("password", "")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email không hợp lệ!")

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác!")

    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa!")

    # Verify password
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác!")

    # Create JWT token
    access_token = create_access_token(
        data={
            "sub": str(user["_id"]),
            "role": user.get("role", "student"),
            "email": user.get("email", ""),
            "student_id": user.get("student_id", "")
        }
    )

    # Remove password from user data
    user_response = serialize_doc(user)
    user_response.pop("password", None)

    return {
        "success": True,
        "message": "Đăng nhập thành công!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }


@router.post("/login_face")
async def login_face(data: dict):
    """Face login endpoint"""
    student_id = data.get("student_id", "").strip().upper()

    user = await users_collection.find_one({"student_id": student_id})
    if not user:
        raise HTTPException(status_code=400, detail="Mã sinh viên không tồn tại!")

    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa!")

    # Create JWT token
    access_token = create_access_token(
        data={
            "sub": str(user["_id"]),
            "role": user.get("role", "student"),
            "email": user.get("email", ""),
            "student_id": user.get("student_id", "")
        }
    )

    # Remove password from user data
    user_response = serialize_doc(user)
    user_response.pop("password", None)

    return {
        "success": True,
        "message": "Đăng nhập thành công!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }


@router.post("/change-password")
async def change_password(data: dict, request: Request, current_user: dict = Depends(get_current_user)):
    """Đổi mật khẩu cho user hiện tại"""
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!")

    # Validate password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Get user from database
    user_id = current_user.get("sub")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    # Verify current password
    if not verify_password(current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác!")

    # Hash new password
    hashed_password = hash_password(new_password)

    # Update password
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_password}}
    )

    return {
        "success": True,
        "message": "Đổi mật khẩu thành công!"
    }


@router.post("/check-face-registration-status")
async def check_face_registration_status(data: dict):
    """Kiểm tra trạng thái đăng ký khuôn mặt"""
    student_id = data.get("student_id", "").strip().upper()
    
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID không hợp lệ!")
    
    user = await users_collection.find_one({"student_id": student_id})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")
    
    status = user.get("face_processing_status", "pending")
    face_registered = user.get("face_registered", False)
    can_join_exam = face_registered and status == "completed"
    
    return {
        "success": True,
        "status": status,  # pending, processing, completed, failed
        "face_registered": face_registered,
        "can_join_exam": can_join_exam
    }

