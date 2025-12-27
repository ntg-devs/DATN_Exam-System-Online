"""
Video processing utilities
"""
import os
import cv2
import base64


def extract_frame_at_5s(video_path: str, target_second: float = 5.0):
    """
    Trích frame tại giây thứ 5 - HOÀN TOÀN AN TOÀN với .webm từ trình duyệt
    """
    if not os.path.exists(video_path):
        return None, "File video không tồn tại"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, "Không thể mở video"

    # === LẤY THỜI GIAN THỰC QUA CAP_PROP_POS_MSEC (đáng tin nhất) ===
    target_ms = target_second * 1000  # 5000ms

    # Di chuyển đến đúng mili giây
    success = cap.set(cv2.CAP_PROP_POS_MSEC, target_ms)
    
    ret, frame = cap.read()
    cap.release()

    if ret and frame is not None:
        # Thành công → encode ngay
        encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if encoded:
            return base64.b64encode(buffer).decode('utf-8'), None
        else:
            return None, "Encode JPEG thất bại"

    # === Nếu thất bại → video quá ngắn hoặc không hỗ trợ POS_MSEC → dùng cách đọc tuần tự ===
    print("CAP_PROP_POS_MSEC thất bại → dùng đọc tuần tự (chậm nhưng chắc chắn)")
    return _extract_by_reading_frames(video_path, target_second)


def _extract_by_reading_frames(video_path: str, target_second: float = 5.0):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, "Fallback: Không mở được video"

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            # Video ngắn hơn → lấy frame cuối
            cap.release()
            cap = cv2.VideoCapture(video_path)
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_count - 1))
            _, frame = cap.read()
            cap.release()
            if frame is not None:
                encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                if encoded:
                    return base64.b64encode(buffer).decode('utf-8'), None
            return None, "Video quá ngắn"

        current_time = frame_count / fps
        if current_time >= target_second:
            cap.release()
            encoded, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if encoded:
                return base64.b64encode(buffer).decode('utf-8'), None
            return None, "Encode thất bại"

        frame_count += 1

        # Bảo vệ treo (tối đa ~30-40s video)
        if frame_count > 1000:
            cap.release()
            return None, "Video quá dài hoặc lỗi"


def cv2_to_base64(img):
    """Chuyển ảnh OpenCV sang base64 string"""
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")

