"""
WebSocket connection manager for realtime updates
"""
from fastapi import WebSocket


# Import clients from websockets router to avoid circular import
def get_active_clients():
    """Get active clients from websockets router"""
    from routers.websockets import (
        active_exam_clients, active_session_clients, active_class_clients,
        active_student_clients, active_student_session_clients, active_teacher_clients
    )
    return (
        active_exam_clients, active_session_clients, active_class_clients,
        active_student_clients, active_student_session_clients, active_teacher_clients
    )


async def broadcast_exam_created(exam: dict):
    """Gửi realtime khi có phòng thi mới được tạo"""
    print("Broadcast exam:", exam)
    active_exam_clients, _, _, _, _, _ = get_active_clients()
    dead = []
    for ws in active_exam_clients:
        try:
            await ws.send_json({
                "type": "exam_created",
                "exam": exam
            })
        except:
            dead.append(ws)

    for ws in dead:
        if ws in active_exam_clients:
            active_exam_clients.remove(ws)


async def broadcast_class_event(event: dict):
    """Gửi realtime event cho classes"""
    _, _, active_class_clients, _, _, _ = get_active_clients()
    dead = []
    for ws in active_class_clients:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)
    for ws in dead:
        if ws in active_class_clients:
            active_class_clients.remove(ws)


async def broadcast_session_update(event: dict):
    """Gửi realtime đến tất cả client đang mở trang danh sách phòng thi (/ws/exams)"""
    active_exam_clients, _, _, _, _, _ = get_active_clients()
    dead = []
    for ws in active_exam_clients:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)
    for ws in dead:
        if ws in active_exam_clients:
            active_exam_clients.remove(ws)


async def broadcast_session_realtime(event: dict):
    """Gửi realtime session updates đến tất cả clients đang xem sessions"""
    _, active_session_clients, _, _, active_student_session_clients, active_teacher_clients = get_active_clients()
    dead = []
    
    # Broadcast đến tất cả clients
    for ws in active_session_clients:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)
    
    # Broadcast đến specific students nếu có
    student_ids = event.get("student_ids", [])
    if student_ids:
        for student_id in student_ids:
            if student_id in active_student_session_clients:
                for ws in active_student_session_clients[student_id]:
                    try:
                        await ws.send_json(event)
                    except:
                        dead.append(ws)
    
    # Broadcast đến teachers nếu có teacher_id
    teacher_id = event.get("teacher_id")
    if teacher_id and teacher_id in active_teacher_clients:
        for ws in active_teacher_clients[teacher_id]:
            try:
                await ws.send_json(event)
            except:
                dead.append(ws)
    
    # Clean up dead connections
    for ws in dead:
        if ws in active_session_clients:
            active_session_clients.remove(ws)


async def notify_student(student_id: str, event: dict):
    """Gửi thông báo tới student cụ thể"""
    _, _, _, active_student_clients, _, _ = get_active_clients()
    
    ws = active_student_clients.get(student_id)
    if not ws:
        return  # Student không online → bỏ qua
    try:
        await ws.send_json(event)
    except:
        if student_id in active_student_clients:
            del active_student_clients[student_id]


async def notify_teacher(teacher_id: str, event: dict):
    """Gửi thông báo tới teacher cụ thể"""
    _, _, _, _, _, active_teacher_clients = get_active_clients()
    
    if teacher_id not in active_teacher_clients:
        return
    
    dead = []
    for ws in active_teacher_clients[teacher_id]:
        try:
            await ws.send_json(event)
        except:
            dead.append(ws)
    
    # Clean up dead connections
    for ws in dead:
        if ws in active_teacher_clients[teacher_id]:
            active_teacher_clients[teacher_id].remove(ws)
    
    # Xóa key nếu không còn websocket nào
    if len(active_teacher_clients[teacher_id]) == 0:
        del active_teacher_clients[teacher_id]
