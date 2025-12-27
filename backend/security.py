"""
🔒 Security Utilities Module
Cung cấp các chức năng bảo mật: JWT, rate limiting, password validation
"""
import os
import re
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from collections import defaultdict
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.hash import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==========================
# 🔐 JWT Configuration
# ==========================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-key-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours default

security = HTTPBearer(auto_error=False)

# ==========================
# 🚦 Rate Limiting
# ==========================
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
LOGIN_RATE_LIMIT_REQUESTS = int(os.getenv("LOGIN_RATE_LIMIT_REQUESTS", "5"))
LOGIN_RATE_LIMIT_WINDOW = int(os.getenv("LOGIN_RATE_LIMIT_WINDOW", "300"))


def check_rate_limit(identifier: str, max_requests: int = RATE_LIMIT_REQUESTS, window: int = RATE_LIMIT_WINDOW) -> bool:
    """Kiểm tra rate limit. Returns True nếu vượt quá limit"""
    now = time.time()
    rate_limit_store[identifier] = [
        req_time for req_time in rate_limit_store[identifier]
        if now - req_time < window
    ]
    
    if len(rate_limit_store[identifier]) >= max_requests:
        return True
    
    rate_limit_store[identifier].append(now)
    return False


def get_client_ip(request: Request) -> str:
    """Lấy IP address của client"""
    if request.client:
        return request.client.host
    return "unknown"


# ==========================
# 🔑 JWT Token Functions
# ==========================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify và decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(request: Request) -> dict:
    """Lấy user hiện tại từ JWT token"""
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không có token xác thực",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
        )
    
    return payload


def require_role(allowed_roles: List[str]):
    """Decorator để kiểm tra role"""
    async def role_checker(request: Request):
        user = await get_current_user(request)
        user_role = user.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền truy cập. Yêu cầu role: {allowed_roles}"
            )
        return user
    
    return role_checker


# ==========================
# 🔒 Password Validation
# ==========================
def validate_password_strength(password: str) -> tuple[bool, str]:
    """Kiểm tra độ mạnh của mật khẩu"""
    if len(password) < 8:
        return False, "Mật khẩu phải có ít nhất 8 ký tự"
    
    if len(password) > 72:
        return False, "Mật khẩu không được vượt quá 72 ký tự"
    
    if not re.search(r"[A-Z]", password):
        return False, "Mật khẩu phải có ít nhất 1 chữ hoa"
    
    if not re.search(r"[a-z]", password):
        return False, "Mật khẩu phải có ít nhất 1 chữ thường"
    
    if not re.search(r"\d", password):
        return False, "Mật khẩu phải có ít nhất 1 chữ số"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"
    
    weak_passwords = ["12345678", "password", "123456789", "1234567890", "qwerty123"]
    if password.lower() in weak_passwords:
        return False, "Mật khẩu quá yếu, vui lòng chọn mật khẩu khác"
    
    return True, ""


def hash_password(password: str) -> str:
    """Hash password với bcrypt"""
    password_trimmed = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return bcrypt.using(rounds=12).hash(password_trimmed)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    password_trimmed = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return bcrypt.verify(password_trimmed, hashed_password)


# ==========================
# 🛡️ Input Sanitization
# ==========================
def sanitize_string(input_str: str, max_length: int = 500) -> str:
    """Sanitize string input"""
    if not isinstance(input_str, str):
        return ""
    
    sanitized = input_str.strip()
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    sanitized = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', sanitized)
    return sanitized


def sanitize_email(email: str) -> Optional[str]:
    """Sanitize và validate email"""
    if not email:
        return None
    
    email = email.strip().lower()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return None
    
    return email


def sanitize_student_id(student_id: str) -> Optional[str]:
    """Sanitize student ID"""
    if not student_id:
        return None
    
    student_id = student_id.strip().upper()
    if not re.match(r'^[A-Z0-9-]+$', student_id):
        return None
    
    return student_id

