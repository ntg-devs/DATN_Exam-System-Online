# 🔒 Hướng Dẫn Bảo Mật - Online Exam System

## ✅ Các Cải Thiện Đã Triển Khai

### 1. JWT Authentication ✅
- Login endpoint trả về JWT token
- Token được lưu ở frontend và gửi trong mọi request
- Backend verify token trước khi cho phép truy cập

### 2. Rate Limiting ✅
- Giới hạn 5 lần đăng nhập sai trong 5 phút
- Giới hạn 100 requests/phút cho các endpoint khác
- Chống brute force attacks

### 3. Password Security ✅
- Yêu cầu mật khẩu mạnh (8+ ký tự, chữ hoa, thường, số, ký tự đặc biệt)
- Password được hash với bcrypt (12 rounds)
- Không còn default password "123456"

### 4. Input Validation ✅
- Sanitize tất cả user inputs
- Validate email format
- Validate student ID format

### 5. CORS Security ✅
- Chỉ cho phép các origins được cấu hình
- Không còn `allow_origins=["*"]`

### 6. Environment Variables ✅
- Tất cả credentials được lưu trong `.env`
- Không hardcode trong code

### 7. Security Headers ✅
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (production)

### 8. Role-Based Access Control ✅
- Admin endpoints yêu cầu admin role
- User chỉ có thể đổi mật khẩu của chính mình

## 🚀 Cách Sử Dụng

### Bước 1: Cài Đặt Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Bước 2: Tạo File .env

```bash
# Copy file example
cp .env.example .env

# Chỉnh sửa với các giá trị thực tế
nano .env
```

**QUAN TRỌNG:**
- Thay đổi `JWT_SECRET_KEY` thành chuỗi ngẫu nhiên mạnh (ít nhất 32 ký tự)
- Cập nhật `ALLOWED_ORIGINS` với domain frontend của bạn
- Cập nhật `MONGO_URI` với thông tin database thực tế

### Bước 3: Cập Nhật Frontend

#### 3.1. Lưu JWT Token sau Login

Trong `frontend/src/services/services.js`:

```javascript
export const teacherLogin = async (payload) => {
  try {
    const res = await fetch(`${URL_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    
    if (data.success && data.access_token) {
      // Lưu token
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    
    return data;
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    return { success: false, detail: "Lỗi server" };
  }
};
```

#### 3.2. Gửi Token trong Mọi Request

Tạo helper function trong `frontend/src/utils/api.js`:

```javascript
import { URL_API } from './path';

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${URL_API}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Xử lý 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }
  
  return response.json();
}
```

#### 3.3. Sử Dụng apiCall

Thay thế các `fetch` calls:

```javascript
// Trước:
const res = await fetch(API_URL + "endpoint", {...});

// Sau:
const data = await apiCall("/endpoint", {
  method: "POST",
  body: JSON.stringify(payload)
});
```

## 📋 Endpoints Đã Được Bảo Vệ

### Yêu Cầu Authentication:
- `/api/change-password` - Yêu cầu login
- `/api/update-user` - Yêu cầu login

### Yêu Cầu Admin Role:
- `/api/delete-user` - Chỉ admin
- `/api/admin/*` - Tất cả admin endpoints

## ⚠️ Lưu Ý

1. **File `.env` không được commit vào git**
2. **JWT_SECRET_KEY phải khác nhau giữa các môi trường**
3. **CORS chỉ cho phép các origins cần thiết**
4. **HTTPS bắt buộc trong production**

## 🧪 Test

1. **Test Login:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

2. **Test Protected Endpoint:**
```bash
curl -X POST http://localhost:8000/api/get-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{}'
```

3. **Test Rate Limiting:**
- Thử đăng nhập sai 6 lần liên tiếp
- Lần thứ 6 sẽ bị chặn

## 🆘 Troubleshooting

### Lỗi: "Token không hợp lệ"
- Kiểm tra token có được gửi trong header `Authorization: Bearer <token>`
- Kiểm tra token chưa hết hạn
- Kiểm tra `JWT_SECRET_KEY` đúng

### Lỗi: "CORS policy"
- Kiểm tra `ALLOWED_ORIGINS` trong `.env`
- Đảm bảo frontend URL được thêm vào

### Lỗi: "Rate limit exceeded"
- Đợi 5 phút
- Hoặc thay đổi IP

