"""
Core configuration for FastAPI app
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


def create_app() -> FastAPI:
    """Create and configure FastAPI app"""
    app = FastAPI(
        title="Online Exam System API",
        description="API for Online Exam System with face recognition and behavior detection",
        version="1.0.0"
    )
    
    # CORS Configuration
    allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

    # Nếu không có origins được cấu hình, sử dụng localhost mặc định
    if not allowed_origins:
        allowed_origins = ["http://localhost:3000", "http://localhost:5173"]

    # Thêm ngrok URLs vào allowed origins (vì ngrok URLs thay đổi thường xuyên)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://.*\.ngrok-free\.dev|https?://.*\.ngrok\.io",
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    return app


def add_security_headers_middleware(app: FastAPI):
    """Add security headers middleware"""
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        """Thêm security headers vào mọi response"""
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

