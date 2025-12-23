# Cấu hình Email để gửi thông báo

Hệ thống hỗ trợ gửi email thông báo khi admin phân công giảng viên vào môn học.

## Cấu hình

### 1. Sử dụng biến môi trường (Khuyến nghị)

Tạo file `.env` trong thư mục `backend/` hoặc cấu hình biến môi trường:

```bash
# Email cấu hình
EMAIL_USER=giangnguyendev99@gmail.com
EMAIL_PASSWORD=rngi fbkb ogby puvt
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

### 2. Ví dụ với Gmail

1. Bật xác thực 2 bước cho tài khoản Gmail
2. Tạo App Password:
   - Vào Google Account → Security → 2-Step Verification → App passwords
   - Tạo app password mới cho "Mail"
   - Copy password (16 ký tự)

3. Cấu hình trong `.env`:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App password 16 ký tự (không có dấu cách)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

### 3. Ví dụ với Outlook/Hotmail

```bash
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

### 4. Ví dụ với SendGrid (Email Service)

```bash
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
```

## Lưu ý

- Nếu không cấu hình email, hệ thống vẫn hoạt động bình thường nhưng chỉ log thông báo ra console
- WebSocket notification vẫn hoạt động bình thường ngay cả khi không cấu hình email
- Để bảo mật, không commit file `.env` vào git

## Kiểm tra

Sau khi cấu hình, khi admin phân công giảng viên vào môn học:
1. Email sẽ được gửi tới giảng viên
2. Thông báo sẽ xuất hiện trong chuông NotificationBell của giảng viên







