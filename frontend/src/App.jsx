import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";

import Home from "./pages/auth/Home";
import Login from "./pages/auth/Login";

import FaceRegister from "./pages/student/FaceRegister";
import FaceVerify from "./pages/student/FaceVerify";
import StudentLive from "./pages/student/StudentLive";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClassDetail from "./pages/student/StudentClassDetail";
import StudentViolationHistory from "./pages/student/StudentViolationHistory";

import TeacherLive from "./pages/teacher/TeacherLive";
import ClassDashboard from "./pages/teacher/ClassDashboard";
import TeacherViolationHistory from "./pages/teacher/TeacherViolationHistory";

import AdminDashboard from "./pages/admin/AdminDashboard";

// ✅ Component bảo vệ route theo role
function ProtectedRoute({ element, allowedRole, requireFaceRegister = false }) {
  const userInfo = useSelector((state) => state.user.userInfo);

  if (!userInfo) {
    // Nếu chưa đăng nhập → quay về trang login
    return <Navigate to="/login" replace />;
  }

  if (userInfo.role !== allowedRole) {
    // Nếu role không khớp → chuyển hướng đúng dashboard của role hiện tại
    const redirectPath =
      userInfo.role === "teacher" ? "/class_dashboard" : "/student_dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // Kiểm tra đăng ký danh tính cho sinh viên (nếu route yêu cầu)
  if (requireFaceRegister && userInfo.role === "student") {
    if (!userInfo.face_registered && !userInfo.face_image) {
      // Chưa đăng ký danh tính → redirect đến trang đăng ký
      return <Navigate to="/student_register" replace />;
    }
  }

  // Nếu hợp lệ → cho vào route
  return element;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Trang chung */}
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/login" element={<Login />} />

          {/* ✅ Routes cho student */}
          <Route
            path="/student_live"
            element={
              <ProtectedRoute 
                element={<StudentLive />} 
                allowedRole="student"
                requireFaceRegister={true}
              />
            }
          />
          <Route
            path="/student_dashboard"
            element={
              <ProtectedRoute
                element={<StudentDashboard />}
                allowedRole="student"
                requireFaceRegister={false}
              />
            }
          />
          <Route
            path="/student_violation_history"
            element={
              <ProtectedRoute
                element={<StudentViolationHistory />}
                allowedRole="student"
                requireFaceRegister={true}
              />
            }
          />
          <Route
            path="/face_verify"
            element={
              <ProtectedRoute
                element={<FaceVerify />}
                allowedRole="student"
              />
            }
          />
          <Route
            path="/student_register"
            element={
              <ProtectedRoute
                element={<FaceRegister />}
                allowedRole="student"
              />
            }
          />
          <Route
            path="/student_class_detail/:id"
            element={
              <ProtectedRoute
                element={<StudentClassDetail />}
                allowedRole="student"
              />
            }
          />

          {/* ✅ Routes cho teacher */}
          <Route
            path="/teacher_live"
            element={
              <ProtectedRoute element={<TeacherLive />} allowedRole="teacher" />
            }
          />
          <Route
            path="/class_dashboard"
            element={
              <ProtectedRoute
                element={<ClassDashboard />}
                allowedRole="teacher"
              />
            }
          />
          <Route
            path="/violation_history"
            element={
              <ProtectedRoute
                element={<TeacherViolationHistory />}
                allowedRole="teacher"
              />
            }
          />

          {/* ✅ Route cho admin (có thể chỉnh lại allowedRole khi backend hỗ trợ role admin) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                element={<AdminDashboard />}
                allowedRole="admin"
              />
            }
          />

          {/* Nếu không khớp route nào → quay về trang chủ */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
