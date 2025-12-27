import { useEffect, useState, useRef } from "react";
import { getClasses, joinClass, changePassword, getStudentCurrentSessions } from "../../services/services.js";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, GraduationCap, Clock, Calendar } from "lucide-react";
import { FaChalkboardTeacher } from "react-icons/fa";
import { MdClass } from "react-icons/md";
import { pushNotification } from "../../redux/slices/notificationSlice";
import { useDispatch } from "react-redux";
import NotificationBell from "../../components/NotificationBell";
import { SOCKET_URL } from "../../utils/path";
import { login } from "../../redux/slices/userSlice.js";
import { setVerifyInfo } from "../../redux/slices/verifySlice.js";

export default function StudentDashboard() {
  const [myClasses, setMyClasses] = useState([]);
  const [joinedClassIds, setJoinedClassIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSessions, setCurrentSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const { userInfo } = useSelector((state) => state.user);
  const studentId = userInfo?._id;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showTeacherInfo, setShowTeacherInfo] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);


  const fetchClasses = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getClasses({ user_id: studentId, role: "student" });
      if (res.success) {
        // Lưu danh sách ID lớp đã tham gia để kiểm tra
        const joinedIds = (res?.joinedClasses || []).map(c => c._id);
        setJoinedClassIds(joinedIds);
        
        // Gộp cả lớp đã tham gia và chưa tham gia thành một danh sách
        // const allClasses = [
        //   ...(res?.joinedClasses || []),
        //   ...(res?.notJoinedClasses || [])
        const allClasses = [
          ...(res?.joinedClasses || [])
        ];
        setMyClasses(allClasses);
      } else {
        toast.error("Không thể tải danh sách lớp học!");
      }
    } catch (err) {
      toast.error("Lỗi khi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSessions = async () => {
    if (!studentId) return;
    setLoadingSessions(true);
    try {
      const res = await getStudentCurrentSessions({ student_id: studentId });
      console.log("[DEBUG] Current sessions response:", res);
      if (res.success) {
        console.log("[DEBUG] Sessions found:", res.sessions);
        setCurrentSessions(res.sessions || []);
      } else {
        console.error("[DEBUG] API returned success=false:", res);
      }
    } catch (err) {
      console.error("Lỗi khi tải ca thi hiện tại:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleEnterExam = (session) => {
    console.log(session)
    // Kiểm tra trạng thái đăng ký danh tính trước khi vào thi
    if (!userInfo.face_registered || !userInfo.face_image) {
      toast.error("Chưa hoàn thành quá trình đăng ký danh tính. Vui lòng đăng ký trước.", {
        duration: 4000,
      });
      // Chuyển đến trang đăng ký sau 1 giây
      setTimeout(() => {
        navigate("/student_register");
      }, 1000);
      return;
    }

    // Set verify info để vào phòng thi
    dispatch(setVerifyInfo({
      classId: session.class_id,
      examId: session.exam_id,
      sessionId: session._id,
      studentId: studentId,
    }));

    navigate("/face_verify");
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "Không xác định";
    const date = new Date(dateTimeStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Bỏ logic check password - tất cả lớp đều do admin quản lý

  const handleJoinClass = async (classId) => {
    try {
      const res = await joinClass(classId, studentId, "");
      if (res.success) {
        toast.success("Tham gia lớp học thành công!");
        // Cập nhật danh sách lớp đã tham gia
        setJoinedClassIds([...joinedClassIds, classId]);
        fetchClasses();
      } else {
        toast.error(res.detail || "Tham gia lớp học thất bại!");
      }
    } catch (err) {
      toast.error("Lỗi khi tham gia lớp!");
    }
  };


  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        // Không cần user_id nữa, backend lấy từ JWT token
      });

      if (res.success) {
        toast.success("Đổi mật khẩu thành công!");
        setShowChangePassword(false);
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        toast.error(res.detail || "Đổi mật khẩu thất bại!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi đổi mật khẩu!");
    } finally {
      setChangingPassword(false);
    }
  };

  const renderClassCard = (cls) => {
    // Kiểm tra xem sinh viên đã tham gia lớp này chưa
    const isJoined = joinedClassIds.includes(cls._id);
    
    return (
      <div
        key={cls._id}
        className="bg-white border rounded-2xl shadow-md p-5 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <MdClass className="text-3xl" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{cls.name}</h3>
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <FaChalkboardTeacher /> {cls.teacher_name}
            </p>
          </div>
        </div>

        <p className="text-gray-700 mb-3">
          Mã lớp: <span className="font-semibold">{cls.code}</span>
        </p>

        {isJoined ? (
          <button
            onClick={() => navigate(`/student_class_detail/${cls._id}`)}
            className="w-full mt-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition"
          >
            Xem chi tiết
          </button>
        ) : (
          <button
            onClick={() => handleJoinClass(cls._id)}
            className="w-full mt-4 py-2 rounded-xl font-semibold text-white transition bg-blue-500 hover:bg-blue-600"
          >
            Tham gia lớp
          </button>
        )}
      </div>
    );
  };

  // Bỏ logic kiểm tra face_registered khi vào trang chủ
  // Chỉ kiểm tra khi bấm vào thi

  // ⭐ Real-time WebSocket cho classes và sessions
  const wsClassesRef = useRef(null);
  const wsSessionsRef = useRef(null);

  useEffect(() => {
    if (!studentId) return;

    fetchClasses();
    fetchCurrentSessions();

    // WebSocket cho classes
    const wsClasses = new WebSocket(`${SOCKET_URL}/ws/classes`);
    wsClassesRef.current = wsClasses;

    wsClasses.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "class_updated") {
        const updatedClass = data.class;
        if (updatedClass.students.includes(studentId)) {
          setMyClasses((prev) => {
            if (prev.find((c) => c._id === updatedClass._id)) return prev;
            return [...prev, updatedClass];
          });
          // Refresh lại danh sách lớp học
          fetchClasses();
        }
      }
    };

    wsClasses.onerror = () => console.log("WS error classes");
    wsClasses.onclose = () => console.log("WS closed classes");

    // WebSocket cho sessions (realtime ca thi)
    const wsSessions = new WebSocket(`${SOCKET_URL}/ws/sessions?type=student&user_id=${studentId}`);
    wsSessionsRef.current = wsSessions;

    wsSessions.onopen = () => {
      console.log("✅ Connected to session realtime");
    };

    wsSessions.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Realtime] Session update:", data);

        if (data.type === "session_created" || data.type === "session_updated") {
          // Refresh danh sách ca thi khi có thay đổi
          fetchCurrentSessions();
          
          // Hiển thị thông báo
          if (data.type === "session_updated" && data.action === "students_added") {
            const studentIds = data.student_ids || [];
            if (studentIds.includes(studentId)) {
              toast.success(`Bạn đã được phân vào ca thi: ${data.session_name || "Ca thi mới"}`, {
                duration: 5000,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    wsSessions.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsSessions.onclose = () => {
      console.log("❌ Disconnected from session realtime");
      // Tự động reconnect sau 3 giây
      setTimeout(() => {
        if (studentId) {
          const newWs = new WebSocket(`${SOCKET_URL}/ws/sessions?type=student&user_id=${studentId}`);
          wsSessionsRef.current = newWs;
        }
      }, 3000);
    };

    // Refresh ca thi hiện tại mỗi 60 giây (realtime đã xử lý phần lớn)
    const interval = setInterval(() => {
      fetchCurrentSessions();
    }, 60000);

    return () => {
      if (wsClassesRef.current) wsClassesRef.current.close();
      if (wsSessionsRef.current) wsSessionsRef.current.close();
      clearInterval(interval);
    };
  }, [studentId]);

  // WebSocket để nhận thông báo về đăng ký khuôn mặt (chỉ để hiển thị toast)
  useEffect(() => {
    if (!studentId) return;
    
    const ws = new WebSocket(`${SOCKET_URL}/ws/student_register_video`);

    // Sau khi kết nối, gửi student_id lên
    ws.onopen = () => {
      ws.send(studentId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "face_register_success") {
        // Cập nhật Redux với thông tin đã đăng ký thành công
        dispatch(login({ 
          ...userInfo, 
          face_image: data.preview_image,
          face_registered: true,
          face_processing_status: "completed"
        }));
        toast.success(data.message);
      }

      if (data.type === "face_register_failed") {
        toast.error(data.error);
      }
    };

    ws.onerror = () => console.log("WebSocket error");
    ws.onclose = () => console.log("WebSocket closed");

    return () => ws.close();
  }, [studentId, userInfo, dispatch]);

  return (
    <div className="p-6  mx-auto">
      <Toaster position="top-right" />
      
      {/* NAVBAR */}
      <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            to="/student_dashboard"
            className="font-bold text-2xl text-indigo-600 flex items-center gap-2"
          >
            <GraduationCap size={28} /> Smart Exam
          </Link>

          <div className="flex items-center gap-6 text-gray-700 font-medium">
            <Link
              to="/student_dashboard"
              className="hover:text-indigo-600 transition"
            >
              Trang chủ
            </Link>
            <Link
              to="/student_violation_history"
              className="hover:text-indigo-600 transition"
            >
              Lịch sử vi phạm
            </Link>
            <div className="relative">
                  <div
                    className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 rounded-full cursor-pointer hover:bg-gray-200 transition"
                    onClick={() => setShowTeacherInfo(!showTeacherInfo)}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      S
                    </div>
                  </div>

                  {/* Overlay để click ra ngoài đóng popup */}
                  {showTeacherInfo && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTeacherInfo(false)}
                    />
                  )}

                  {/* 3. POP-UP HIỂN THỊ THÔNG TIN TÀI KHOẢN */}
                  {showTeacherInfo && (
                    <div className="absolute right-0 mt-2 p-4 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fade-in">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-800">Thông tin tài khoản</h3>
                          <button
                            onClick={() => setShowTeacherInfo(false)}
                            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
                            title="Đóng"
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex gap-2 items-center">
                            <div className="text-sm font-semibold text-gray-700 w-24">
                              Tên:
                            </div>
                            <div className="text-sm text-indigo-600 font-medium">
                              {userInfo.name}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="text-sm font-semibold text-gray-700 w-24">
                              Email:
                            </div>
                            <div className="text-sm text-indigo-600 font-medium">
                              {userInfo.email}
                            </div>
                          </div>
                          {userInfo.student_id && (
                            <div className="flex gap-2 items-center">
                              <div className="text-sm font-semibold text-gray-700 w-24">
                                Mã SV:
                              </div>
                              <div className="text-sm text-indigo-600 font-medium">
                                {userInfo.student_id}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Form đổi mật khẩu */}
                      {!showChangePassword ? (
                        <button
                          onClick={() => setShowChangePassword(true)}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
                        >
                          Đổi mật khẩu
                        </button>
                      ) : (
                        <div className="space-y-3 border-t pt-3">
                          <h4 className="text-sm font-semibold text-gray-700">Đổi mật khẩu</h4>
                          <input
                            type="password"
                            placeholder="Mật khẩu hiện tại"
                            value={passwordForm.current_password}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, current_password: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            placeholder="Mật khẩu mới"
                            value={passwordForm.new_password}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, new_password: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="password"
                            placeholder="Xác nhận mật khẩu mới"
                            value={passwordForm.confirm_password}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleChangePassword}
                              disabled={changingPassword}
                              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
                            >
                              {changingPassword ? "Đang xử lý..." : "Xác nhận"}
                            </button>
                            <button
                              onClick={() => {
                                setShowChangePassword(false);
                                setPasswordForm({
                                  current_password: "",
                                  new_password: "",
                                  confirm_password: "",
                                });
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            <NotificationBell studentId={userInfo._id} toast={toast} />
            <button
              onClick={() => {
                navigate("/");
              }}
              className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* CA THI HIỆN TẠI */}
      <div className="mb-6 mt-6 max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="text-indigo-600" size={28} />
          Ca thi hiện tại
        </h2>
        {loadingSessions ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Đang tải ca thi...</p>
          </div>
        ) : currentSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {currentSessions.map((session) => (
              <div
                key={session._id}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {session.exam_name || "Bài thi"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Ca thi: <span className="font-semibold">{session.name}</span>
                    </p>
                    {session.class_name && (
                      <p className="text-xs text-gray-500 mb-2">
                        Lớp: {session.class_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      session.status === "Vào phòng thi"
                        ? "bg-green-100 text-green-700"
                        : session.status === "Chưa đến thời gian thi"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={16} className="text-indigo-600" />
                    <span>
                      <strong>Bắt đầu:</strong> {formatDateTime(session.start_time)}
                    </span>
                  </div>
                  {session.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock size={16} className="text-indigo-600" />
                      <span>
                        <strong>Thời gian:</strong> {session.duration} phút
                      </span>
                    </div>
                  )}
                </div>

                {session.status === "Vào phòng thi" && (
                  <button
                    onClick={() => handleEnterExam(session)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg"
                  >
                    Vào nhanh
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <Calendar className="text-gray-400 mx-auto mb-3" size={48} />
            <p className="text-gray-600 text-lg">Hiện tại không có ca thi nào</p>
            <p className="text-gray-500 text-sm mt-2">Các ca thi sẽ hiển thị ở đây khi đến thời gian thi</p>
          </div>
        )}
      </div>

      {/* DANH SÁCH LỚP HỌC */}
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MdClass className="text-indigo-600" size={28} />
          Danh sách lớp học
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : myClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myClasses.map((cls) => renderClassCard(cls))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <MdClass className="text-gray-400 mx-auto mb-3" size={48} />
            <p className="text-gray-600 text-lg">Không có lớp học nào</p>
          </div>
        )}
      </div>


    </div>
  );
}
