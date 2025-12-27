"""
Main FastAPI application entry point
Refactored structure with routers
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from core.config import create_app, add_security_headers_middleware
from routers import (
    auth, users, exams, exam_sessions, classes, admin,
    face_recognition, behavior_detection, websockets, violations
)

# Create app
app = create_app()

# Add security headers middleware
add_security_headers_middleware(app)

# Add exception handler for Pydantic validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors and return user-friendly messages"""
    errors = exc.errors()
    error_messages = []
    for error in errors:
        field = ".".join(str(loc) for loc in error.get('loc', []))
        msg = error.get('msg', 'Validation error')
        error_messages.append(f"{field}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "; ".join(error_messages)}
    )

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(exams.router, prefix="/api", tags=["Exams"])
app.include_router(exam_sessions.router, prefix="/api", tags=["Exam Sessions"])
app.include_router(classes.router, prefix="/api", tags=["Classes"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(face_recognition.router, prefix="/api", tags=["Face Recognition"])
app.include_router(behavior_detection.router, prefix="/api", tags=["Behavior Detection"])
app.include_router(violations.router, prefix="/api", tags=["Violations"])
app.include_router(websockets.router, tags=["WebSockets"])


@app.get("/")
async def root():
    return {"message": "Online Exam System API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

