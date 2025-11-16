import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";

import FaceRegister from "./pages/FaceRegister";
import FaceVerify from "./pages/FaceVerify";
import StudentLive from "./pages/StudentLive";
import TeacherLive from "./pages/TeacherLive";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ClassDashboard from "./pages/ClassDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentClassDetail from "./pages/StudentClassDetail";
import TeacherViolationHistory from "./pages/TeacherViolationHistory";
import StudentViolationHistory from "./pages/StudentViolationHistory";

// ✅ Component bảo vệ route theo role
function ProtectedRoute({ element, allowedRole }) {
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

  // Nếu hợp lệ → cho vào route
  return element;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Trang chung */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* ✅ Routes cho student */}
          <Route
            path="/student_live"
            element={
              <ProtectedRoute element={<StudentLive />} allowedRole="student" />
            }
          />
          <Route
            path="/student_dashboard"
            element={
              <ProtectedRoute
                element={<StudentDashboard />}
                allowedRole="student"
              />
            }
          />
          <Route
            path="/student_violation_history"
            element={
              <ProtectedRoute
                element={<StudentViolationHistory />}
                allowedRole="student"
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
            path="/dashboard"
            element={
              <ProtectedRoute element={<Dashboard />} allowedRole="teacher" />
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

          {/* Nếu không khớp route nào → quay về trang chủ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
