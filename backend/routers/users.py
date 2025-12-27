"""
Users router
Handles user management: create, update, delete, get users
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr, ValidationError
from database.mongo import users_collection
from utils.serializers import serialize_doc
from security import (
    get_current_user, require_role,
    validate_password_strength, hash_password,
    sanitize_string, sanitize_email, sanitize_student_id
)
from datetime import datetime
from bson import ObjectId
from typing import Optional
import secrets
import string

router = APIRouter()


class RegisterInput(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    student_id: Optional[str] = None
    role: str


@router.post("/create-user")
async def register_user(data: RegisterInput, request: Request):
    """Tạo user mới với validation và security improvements"""
    # Sanitize inputs
    name = sanitize_string(data.name.strip(), max_length=100)
    if not name:
        raise HTTPException(status_code=400, detail="Tên không hợp lệ!")
    
    email = sanitize_email(data.email) if data.email else None
    student_id = sanitize_student_id(data.student_id) if data.student_id else None
    role = sanitize_string(data.role.strip(), max_length=20)
    
    if role not in ["teacher", "student", "admin"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ. Chỉ cho phép: teacher, student, admin")

    # Password validation
    if data.password:
        is_valid, error_msg = validate_password_strength(data.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        password = data.password
    else:
        # Generate a random password if not provided
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for i in range(12))

    # Hash password
    hashed_password = hash_password(password)

    # Check for existing users
    if email:
        existing = await users_collection.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email đã tồn tại!")
   
    if student_id:
        existing = await users_collection.find_one({"student_id": student_id})
        if existing:
            raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại!")

    user = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "student_id": student_id,
        "role": role,
        "created_at": datetime.utcnow(),
        "is_active": True
    }

    result = await users_collection.insert_one(user)
    inserted_user = await users_collection.find_one({"_id": result.inserted_id})
    
    # Remove password from response
    user_response = serialize_doc(inserted_user)
    user_response.pop("password", None)
    
    return {"success": True, "user": user_response}


@router.post("/update-user")
async def update_user(data: dict, current_user: dict = Depends(get_current_user)):
    """
    Cập nhật thông tin tài khoản (tên, email, mã sinh viên, role).
    Body: { id, name, email, student_id, role }
    """
    user_id = data.get("id")
    name = (data.get("name") or "").strip()
    email = data.get("email", "").strip() if data.get("email") else None
    student_id = data.get("student_id", "").strip() if data.get("student_id") else None
    role = (data.get("role") or "").strip()

    if not user_id:
        raise HTTPException(status_code=400, detail="Thiếu ID user!")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID user không hợp lệ!")

    # Sanitize inputs
    if name:
        name = sanitize_string(name, max_length=100)
    if email:
        email = sanitize_email(email)
    if student_id:
        student_id = sanitize_student_id(student_id)
    if role:
        role = sanitize_string(role, max_length=20)
        if role not in ["teacher", "student", "admin"]:
            raise HTTPException(status_code=400, detail="Vai trò không hợp lệ!")

    # Build update dict
    update_data = {}
    if name:
        update_data["name"] = name
    if email is not None:
        # Check email uniqueness
        if email:
            existing = await users_collection.find_one({"email": email, "_id": {"$ne": ObjectId(user_id)}})
            if existing:
                raise HTTPException(status_code=400, detail="Email đã tồn tại!")
        update_data["email"] = email
    if student_id is not None:
        # Check student_id uniqueness
        if student_id:
            existing = await users_collection.find_one({"student_id": student_id, "_id": {"$ne": ObjectId(user_id)}})
            if existing:
                raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại!")
        update_data["student_id"] = student_id
    if role:
        update_data["role"] = role

    if not update_data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu để cập nhật!")

    # Update user
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    # Get updated user
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_response = serialize_doc(updated_user)
    user_response.pop("password", None)

    return {"success": True, "user": user_response}


@router.post("/delete-user")
async def delete_user(data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Xóa user (chỉ admin)"""
    user_id = data.get("id")
    
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID user không hợp lệ!")

    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    return {"success": True}


@router.post("/toggle-user-status")
async def toggle_user_status(data: dict):
    """Toggle trạng thái active/inactive của user"""
    user_id = data.get("id")
    
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID user không hợp lệ!")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    current_status = user.get("is_active", True)
    new_status = not current_status

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": new_status}}
    )

    return {"success": True, "new_status": new_status}


@router.post("/get-users")
async def get_users(data: dict = {}):
    """Lấy danh sách users (có thể filter theo role)"""
    role = data.get("role")
    
    query = {}
    if role:
        query["role"] = role
    
    users = []
    async for user in users_collection.find(query):
        user_doc = serialize_doc(user)
        user_doc.pop("password", None)
        users.append(user_doc)
    
    return {"success": True, "users": users}

