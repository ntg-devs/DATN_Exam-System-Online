"""
Email service for sending notifications
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from concurrent.futures import ThreadPoolExecutor
import asyncio


# Thread pool cho email sending
email_executor = ThreadPoolExecutor(max_workers=2)


async def send_email_notification(to_email: str, subject: str, body_html: str, body_text: str = ""):
    """
    Gửi email thông báo
    Cấu hình SMTP từ biến môi trường:
    - SMTP_SERVER: smtp.gmail.com (mặc định)
    - SMTP_PORT: 587 (mặc định)
    - SMTP_USER: email gửi (từ biến môi trường EMAIL_USER)
    - SMTP_PASSWORD: mật khẩu/app password (từ biến môi trường EMAIL_PASSWORD)
    
    Nếu không cấu hình, sẽ chỉ log ra console.
    """
    try:
        # Đọc từ biến môi trường hoặc dùng giá trị mặc định
        SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        SMTP_USER = os.getenv("EMAIL_USER", "giangnguyendev99@gmail.com")
        SMTP_PASSWORD = os.getenv("EMAIL_PASSWORD", "rngi fbkb ogby puvt")
        
        # Nếu không cấu hình email, chỉ log và không gửi
        if not SMTP_USER or not SMTP_PASSWORD:
            print(f"⚠ Email không được cấu hình. Thông báo sẽ được gửi tới: {to_email}")
            print(f"   Subject: {subject}")
            print(f"   Body: {body_text[:200]}...")
            print(f"   💡 Để gửi email, hãy cấu hình biến môi trường EMAIL_USER và EMAIL_PASSWORD")
            return True  # Trả về True để không làm gián đoạn flow
        
        # Tạo message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        
        # Thêm text và HTML
        if body_text:
            part1 = MIMEText(body_text, "plain", "utf-8")
            msg.attach(part1)
        
        part2 = MIMEText(body_html, "html", "utf-8")
        msg.attach(part2)
        
        # Gửi email (chạy trong thread pool để không block)
        def send_sync():
            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                print(f"✅ Email đã gửi tới {to_email}")
            except Exception as e:
                print(f"❌ Lỗi gửi email tới {to_email}: {e}")
        
        # Chạy trong thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(email_executor, send_sync)
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi gửi email: {e}")
        return False

