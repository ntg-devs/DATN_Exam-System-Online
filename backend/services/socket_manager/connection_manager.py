from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.students: Dict[str, Dict[str, WebSocket]] = {}  # {exam: {student_id: ws}}
        self.teachers: Dict[str, List[WebSocket]] = {}        # {exam: [ws1, ws2, ...]}

    # ---------------- STUDENT ----------------
    # async def connect_student(self, exam: str, student: str, websocket: WebSocket):
    #     await websocket.accept()
    #     if exam not in self.students:
    #         self.students[exam] = {}
    #     self.students[exam][student] = websocket
    #     print(f"[🎓] {student} joined exam {exam}")

    # Chỉnh lại lần 2 theo bổ sung reatime cho nhận diện khuôn mặt kèm hành vi
    # async def connect_student(self, exam: str, student: str, websocket: WebSocket):
    #     if exam not in self.students:
    #         self.students[exam] = {}
    #     self.students[exam][student] = websocket
    #     print(f"[🎓] {student} joined exam {exam}")

    async def connect_student(self, exam: str, session: str, student: str, websocket: WebSocket):
        # Khởi tạo exam nếu chưa có
        if exam not in self.students:
            self.students[exam] = {}
        # Khởi tạo session nếu chưa có
        if session not in self.students[exam]:
            self.students[exam][session] = {}
        # Gán WebSocket
        self.students[exam][session][student] = websocket
        print(f"[🎓] {student} joined exam {exam} - session {session}")


    async def disconnect_student(self, exam: str, student: str):
        if exam in self.students and student in self.students[exam]:
            del self.students[exam][student]
            print(f"[❌] {student} disconnected from {exam}")
            await self.broadcast_teachers(exam, {"type": "student_left", "student": student})

    # ---------------- TEACHER ----------------
    async def connect_teacher(self, exam: str, websocket: WebSocket):
        await websocket.accept()
        if exam not in self.teachers:
            self.teachers[exam] = []
        self.teachers[exam].append(websocket)
        print(f"[🧑‍🏫] Teacher connected for {exam}")

    async def disconnect_teacher(self, exam: str, websocket: WebSocket):
        if exam in self.teachers and websocket in self.teachers[exam]:
            self.teachers[exam].remove(websocket)
            print(f"[❌] Teacher disconnected from {exam}")

    # ---------------- BROADCAST ----------------
    async def broadcast_teachers(self, exam: str, message: dict):
        """Gửi thông báo tới tất cả giáo viên của exam"""
        if exam not in self.teachers:
            return
        dead_ws = []
        for ws in self.teachers[exam]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_ws.append(ws)
        for ws in dead_ws:
            await self.disconnect_teacher(exam, ws)

    def get_students_list(self, exam: str):
        return list(self.students.get(exam, {}).keys())
    
    # Trong class ConnectionManager
    async def broadcast_students(self, exam: str, student_ids: list[str], message: dict):
        if exam not in self.students:
            print(f"[WS] No students connected for exam {exam}")
            return
        dead_ws = []
        for sid in student_ids:
            ws = self.students[exam].get(sid)
            if ws:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_ws.append(sid)
            else:
                print(f"[WS] Student {sid} not connected")
        for sid in dead_ws:
            await self.disconnect_student(exam, sid)

