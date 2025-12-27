import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { LogOut, GraduationCap } from "lucide-react";
import {
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaUser,
  FaRegCalendarAlt,
  FaBook,
} from "react-icons/fa";
import { MdClose } from "react-icons/md";
import {
  getClasses,
  getExamsByClass,
  getExamSessions,
  getStudentsInClass,
  getStudentsInSession,
  changePassword,
} from "../../services/services.js";

import { useDispatch } from "react-redux";
import { setVerifyInfo } from "../../redux/slices/verifySlice.js";
import NotificationBell from "../../components/NotificationBell";
import { SOCKET_URL } from "../../utils/path";

export default function ClassDashboard() {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const verifyInfo = useSelector((state) => state.verify.verifyInfo);

  const [classes, setClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [showTeacherInfo, setShowTeacherInfo] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showStudentsInSessionModal, setShowStudentsInSessionModal] =
    useState(false);
  const [studentsInSession, setStudentsInSession] = useState([]);
  const [exams, setExams] = useState([]);
  const [panelMode, setPanelMode] = useState("exam");
  const [listStudentsInClass, setListStudentsInClass] = useState([]);

  // Exam detail + sessions (chỉ xem)
  const [showExamDetailModal, setShowExamDetailModal] = useState(false);
  const [examDetail, setExamDetail] = useState(null);
  const [examSessions, setExamSessions] = useState([]);

  // Thống kê ca thi
  const [allSessions, setAllSessions] = useState([]);

  // Popup ca thi đang diễn ra
  const [showActiveSessionsModal, setShowActiveSessionsModal] = useState(false);

  const notifySuccess = (msg) => toast.success(msg);
  const notifyError = (msg) => toast.error(msg);

  const handleChangePassword = async () => {
    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      notifyError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      notifyError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notifyError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
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
        notifySuccess("Đổi mật khẩu thành công!");
        setShowChangePassword(false);
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        notifyError(res.detail || "Đổi mật khẩu thất bại!");
      }
    } catch (error) {
      console.error(error);
      notifyError("Lỗi khi đổi mật khẩu!");
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    if (userInfo?._id) fetchClasses();
  }, [userInfo]);

  useEffect(() => {
    if (!currentClass) return;
    loadStudentData();
  }, [currentClass]);

  const loadStudentData = async () => {
    try {
      const data = await getStudentsInClass({ class_id: currentClass._id });
      setListStudentsInClass(data?.students || []);
    } catch {
      notifyError("Không thể tải danh sách sinh viên!");
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await getClasses({
        user_id: userInfo._id,
        role: userInfo.role,
      });
      setClasses(data?.classes || []);
    } catch {
      notifyError("Không thể tải danh sách lớp học!");
    }
  };

  // WebSocket connection cho realtime updates
  const wsRef = useRef(null);

  // Load tất cả ca thi để thống kê
  const loadAllSessions = async () => {
    if (classes.length === 0) {
      setAllSessions([]);
      return;
    }
    const allSessionsData = [];
    for (const cls of classes) {
      try {
        const examsData = await getExamsByClass({ class_id: cls._id });
        for (const exam of examsData?.exams || []) {
          try {
            const sessionsData = await getExamSessions({ exam_id: exam._id });
            for (const session of sessionsData?.sessions || []) {
              allSessionsData.push({
                ...session,
                exam: exam,
                class: cls,
              });
            }
          } catch (err) {
            console.error("Lỗi load sessions cho exam:", err);
          }
        }
      } catch (err) {
        console.error("Lỗi load exams cho class:", err);
      }
    }
    setAllSessions(allSessionsData);
  };

  useEffect(() => {
    if (userInfo?._id) {
      loadAllSessions();
    }
  }, [classes, userInfo]);

  // Kết nối WebSocket cho realtime session updates
  useEffect(() => {
    if (userInfo?._id && userInfo?.role === "teacher") {
      const ws = new WebSocket(
        `${SOCKET_URL}/ws/sessions?type=teacher&user_id=${userInfo._id}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Teacher connected to session realtime");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Realtime] Session update:", data);

          if (
            data.type === "session_created" ||
            data.type === "session_updated"
          ) {
            // Refresh danh sách ca thi khi có thay đổi
            loadAllSessions();

            // Hiển thị thông báo
            if (data.type === "session_created") {
              toast.success(`Ca thi mới: ${data.session?.name || "Ca thi"}`, {
                duration: 3000,
              });
            } else if (data.type === "session_updated") {
              toast.info(
                `Ca thi đã được cập nhật: ${data.session_name || "Ca thi"}`,
                {
                  duration: 3000,
                }
              );
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("❌ Teacher disconnected from session realtime");
        // Tự động reconnect sau 3 giây
        setTimeout(() => {
          if (userInfo?._id) {
            const newWs = new WebSocket(
              `${SOCKET_URL}/ws/sessions?type=teacher&user_id=${userInfo._id}`
            );
            wsRef.current = newWs;
          }
        }, 3000);
      };

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [userInfo?._id]);

  const handleOpenClassDetail = async (cls) => {
    setCurrentClass(cls);
    try {
      const data = await getExamsByClass({ class_id: cls._id });
      setExams(data?.exams || []);
    } catch {
      notifyError("Không thể tải lịch thi!");
    }
  };

  const handleOpenClassDetailListStudent = (cls) => {
    setCurrentClass(cls);
    setPanelMode("student");
  };

  // Hàm kiểm tra trạng thái bài thi
  const getExamStatus = (exam) => {
    if (!exam.start_time) return "";
    const now = Date.now();
    const start = new Date(exam.start_time).getTime();
    const end = start + (exam.duration || 0) * 60 * 1000;
    if (now >= start - 15 * 60 * 1000 && now <= end) return "active";
    if (now < start - 15 * 60 * 1000) return "soon";
    if (now > end) return "done";
    return "";
  };

  // Tính toán thống kê ca thi
  const getSessionsStats = () => {
    const OFFSET = 7 * 60 * 60 * 1000;
    const now = Date.now();
    let activeCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    allSessions.forEach((session) => {
      const start = new Date(session.start_time).getTime() + OFFSET;
      const end = start + session.duration * 60 * 1000;
      if (now >= start && now <= end) {
        activeCount++;
      } else if (now < start) {
        upcomingCount++;
      } else {
        completedCount++;
      }
    });

    return { activeCount, upcomingCount, completedCount };
  };

  // -------------------------------
  // Exam detail & sessions (chỉ xem)
  // -------------------------------
  const openExamDetail = async (exam) => {
    setExamDetail(exam);
    try {
      const data = await getExamSessions({ exam_id: exam?._id });
      setExamSessions(data?.sessions || []);
      setShowExamDetailModal(true);
    } catch (err) {
      console.error(err);
      notifyError("Không thể tải ca thi của bài thi!");
    }
  };

  const handleViewStudentsInSession = async (session) => {
    try {
      const data = await getStudentsInSession(session._id);
      setStudentsInSession(data?.students || []);
      setShowStudentsInSessionModal(true);
    } catch (err) {
      console.error(err);
      notifyError("Không thể tải danh sách sinh viên trong ca thi!");
    }
  };

  const getSessionStatus = (session) => {
    const OFFSET = 7 * 60 * 60 * 1000;

    const now = Date.now();
    console.log("now:", new Date(now).toLocaleString());

    const start = new Date(session.start_time).getTime() + OFFSET;
    console.log("start:", new Date(start).toLocaleString());

    const end = start + session.duration * 60 * 1000;

    if (now >= start && now <= end) return "active"; // đang diễn ra
    if (now < start) return "soon"; // chưa đến giờ
    if (now > end) return "done"; // đã kết thúc
    return "";
  };

  // Lấy danh sách ca thi đang diễn ra
  const getActiveSessions = () => {
    return allSessions.filter(
      (session) => getSessionStatus(session) === "active"
    );
  };

  console.log(exams);

  return (
    <div className="min-h-screen bg-gray-100">
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
              to="/class_dashboard"
              className="hover:text-indigo-600 transition"
            >
              Trang chủ
            </Link>
            <Link
              to="/violation_history"
              className="hover:text-indigo-600 transition"
            >
              Lịch sử vi phạm
            </Link>
            <NotificationBell teacherId={userInfo._id} toast={toast} />
            <div className="relative">
              <div
                className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 rounded-full cursor-pointer hover:bg-gray-200 transition"
                onClick={() => setShowTeacherInfo(!showTeacherInfo)}
              >
                <div className="w-6 h-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  G
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
                      <h3 className="text-lg font-bold text-gray-800">
                        Thông tin tài khoản
                      </h3>
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
                      <h4 className="text-sm font-semibold text-gray-700">
                        Đổi mật khẩu
                      </h4>
                      <input
                        type="password"
                        placeholder="Mật khẩu hiện tại"
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            current_password: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="password"
                        placeholder="Mật khẩu mới"
                        value={passwordForm.new_password}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            new_password: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="password"
                        placeholder="Xác nhận mật khẩu mới"
                        value={passwordForm.confirm_password}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirm_password: e.target.value,
                          })
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

      <div className="p-8 max-w-7xl mx-auto">
        {/* Thống kê ca thi */}
        {(() => {
          const stats = getSessionsStats();
          console.log(stats);
          const activeSessions = getActiveSessions();
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div
                className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
                onClick={() => {
                  if (activeSessions.length > 0) {
                    setShowActiveSessionsModal(true);
                  } else {
                    toast.info("Hiện tại không có ca thi nào đang diễn ra");
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-green-700 mb-1">
                      Ca thi đang diễn ra
                    </p>
                    <p className="text-3xl font-bold text-green-900">
                      {stats.activeCount}
                    </p>
                    {activeSessions.length > 0 && (
                      <p className="text-xs text-green-600 mt-1 cursor-pointer hover:underline">
                        Bấm để xem chi tiết →
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <FaPlay className="text-green-700" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700 mb-1">
                      Ca thi sắp tới
                    </p>
                    <p className="text-3xl font-bold text-blue-900">
                      {stats.upcomingCount}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <FaClock className="text-blue-700" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-700 mb-1">
                      Ca thi đã hoàn thành
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats.completedCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-200 rounded-lg">
                    <FaCheckCircle className="text-slate-700" size={24} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột 1 — Danh sách lớp (môn học) */}
          <div className="bg-white shadow-lg rounded-xl p-6 max-h-[80vh]">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600 flex items-center gap-2">
              <FaBook className="text-indigo-500" /> Môn học của tôi
            </h2>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <FaBook className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500 text-lg">Chưa có lớp học nào</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {classes.map((cls) => (
                  <div
                    key={cls._id}
                    className="group relative overflow-hidden p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-400 bg-gradient-to-br from-white to-indigo-50/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full -mr-12 -mt-12 opacity-50 group-hover:opacity-70 transition-opacity"></div>

                    <div className="relative flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                            <FaBook className="text-indigo-600" size={20} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                            {cls.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 ml-11 mb-3">
                          Mã lớp học:{" "}
                          <span className="font-semibold text-indigo-600">
                            {cls.code}
                          </span>
                        </p>
                        <div className="flex items-center gap-4 ml-11">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FaUser className="text-gray-400" size={14} />
                            <span className="font-medium">
                              {cls.students?.length || 0} sinh viên
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClassDetailListStudent(cls);
                            setPanelMode("student");
                          }}
                          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          <FaUser size={14} /> Sinh viên
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClassDetail(cls);
                            setPanelMode("exam");
                          }}
                          className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          <FaRegCalendarAlt size={14} /> Lịch thi
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cột 2 — Chi tiết lớp */}
          <div className="bg-white shadow-lg rounded-xl p-6 min-h-[60vh]">
            {!currentClass ? (
              <p className="text-gray-400 text-center mt-10">
                Chọn một lớp để xem chi tiết.
              </p>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-indigo-600 mb-4">
                  Chi tiết lớp: {currentClass.name} - Mã lớp:{" "}
                  {currentClass.code}
                </h2>
                {panelMode === "exam" ? (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      <FaRegCalendarAlt /> Lịch thi
                    </h3>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium text-lg flex items-center gap-2 mb-2">
                      <FaUser />
                      Danh sách sinh viên
                    </h3>
                  </div>
                )}

                {panelMode === "exam" ? (
                  /* ================== HIỂN THỊ LỊCH THI (giữ nguyên) ================== */
                  exams.length === 0 ? (
                    <p className="text-gray-500">Chưa có lịch nào.</p>
                  ) : (
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {exams.map((ex) => {
                        const status = getExamStatus(ex);
                        return (
                          <li
                            key={ex._id}
                            className="p-4 border rounded-lg hover:shadow-md transition-all flex justify-between items-center bg-white"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-800">
                                  {ex.name}
                                </p>
                                {status === "active" && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    Đang diễn ra
                                  </span>
                                )}
                                {status === "soon" && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    Sắp tới
                                  </span>
                                )}
                                {status === "done" && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                    Đã kết thúc
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                Mã: <span className="font-mono">{ex.code}</span>
                              </p>
                              {ex.start_time && (
                                <p className="text-sm text-gray-500">
                                  {new Date(
                                    new Date(ex.start_time).getTime()
                                  ).toLocaleString()}{" "}
                                  {/* — {ex.duration} phút */}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => openExamDetail(ex)}
                              className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Chi tiết
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : (
                  /* ================== HIỂN THỊ DANH SÁCH SINH VIÊN ================== */
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {listStudentsInClass.length === 0 ? (
                      <p className="text-gray-500">Lớp chưa có sinh viên.</p>
                    ) : (
                      listStudentsInClass.map((stu) => (
                        <div
                          key={stu._id}
                          className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50 shadow-sm"
                        >
                          <img
                            src={
                              stu.face_image
                                ? `data:image/jpeg;base64,${stu.face_image}`
                                : "https://via.placeholder.com/60"
                            }
                            className="w-14 h-14 rounded-full object-cover border"
                          />

                          <div className="flex-1">
                            <p className="font-semibold">{stu.name}</p>
                            <p className="text-sm text-gray-600">
                              Mã sinh viên: {stu.student_id}
                            </p>
                            <p className="text-sm text-gray-600">{stu.email}</p>
                            <p className="text-xs text-gray-400">
                              Ngày tạo:{" "}
                              {new Date(stu.created_at).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal chi tiết bài thi (liệt kê ca thi) */}
      {showExamDetailModal && examDetail && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-[720px] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowExamDetailModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Chi tiết lịch thi: {examDetail.name}
            </h2>

            <div className="mb-4">
              <h3 className="font-medium mb-2">Danh sách ca thi</h3>
              {examSessions.length === 0 ? (
                <p className="text-gray-500">Chưa có ca thi nào.</p>
              ) : (
                <div className="space-y-3">
                  {examSessions.map((s) => {
                    const status = getSessionStatus(s);
                    return (
                      <div
                        key={s._id}
                        className="border p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">Ca: {s.name}</p>
                          <p className="font-semibold">
                            Bắt đầu:{" "}
                            {s.start_time
                              ? new Date(
                                  new Date(s.start_time).getTime() +
                                    7 * 60 * 60 * 1000
                                ).toLocaleString()
                              : "-"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Thời lượng: {s.duration} phút
                          </p>
                          {s.room && (
                            <p className="text-sm text-gray-500">
                              Phòng: {s.room}
                            </p>
                          )}
                          {s.students_count !== undefined && (
                            <p className="text-sm text-gray-500">
                              Số sinh viên: {s.students_count}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {status === "active" && (
                            <button
                              onClick={() => {
                                dispatch(
                                  setVerifyInfo({
                                    examName: examDetail.name,
                                    sessionName: s.name,
                                    className: currentClass.name,
                                  })
                                );
                                navigate(
                                  `/teacher_live?exam=${examDetail._id}&session=${s._id}`
                                );
                              }}
                              className="flex items-center gap-2 cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl shadow-md transition-all"
                            >
                              <FaPlay className="text-sm" /> Vào giám sát
                            </button>
                          )}
                          {status === "soon" && (
                            <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border border-gray-300 shadow-sm">
                              <FaClock className="text-gray-500" /> Chưa đến giờ
                              thi
                            </span>
                          )}
                          {status === "done" && (
                            <span className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 shadow-sm">
                              <FaCheckCircle className="text-red-600" /> Đã kết
                              thúc
                            </span>
                          )}

                          <button
                            onClick={() => handleViewStudentsInSession(s)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Xem sinh viên
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExamDetailModal(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentsInSessionModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-156 relative">
            <button
              onClick={() => setShowStudentsInSessionModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Danh sách sinh viên trong ca thi
            </h2>
            {studentsInSession.length === 0 ? (
              <p className="text-gray-500">Chưa có sinh viên nào.</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto space-y-2">
                {studentsInSession.map((stu) => (
                  <li
                    key={stu._id}
                    className="flex items-center justify-between border rounded px-3 py-2"
                  >
                    <span>
                      {stu.name} - {stu.student_id}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowStudentsInSessionModal(false)}
                className="px-4 py-2 border rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ca thi đang diễn ra */}
      {showActiveSessionsModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowActiveSessionsModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-2xl font-semibold mb-4 text-indigo-600 flex items-center gap-2">
              <FaPlay className="text-green-600" /> Ca thi đang diễn ra
            </h2>

            {getActiveSessions().length === 0 ? (
              <div className="text-center py-12">
                <FaClock className="text-gray-400 mx-auto mb-3" size={48} />
                <p className="text-gray-500 text-lg">
                  Hiện tại không có ca thi nào đang diễn ra
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getActiveSessions().map((session) => (
                  <div
                    key={session._id}
                    className="border border-green-200 bg-gradient-to-r from-green-50 to-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {session.exam?.name || "Bài thi"}
                          </h3>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            Đang diễn ra
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Ca thi:</span>{" "}
                          {session.name}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Lớp:</span>{" "}
                          {session.class?.name || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Mã lớp:</span>{" "}
                          {session.class?.code || "N/A"}
                        </p>
                        {session.start_time && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-semibold">Bắt đầu:</span>{" "}
                            {new Date(
                              new Date(session.start_time).getTime() +
                                7 * 60 * 60 * 1000
                            ).toLocaleString()}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Thời lượng:</span>{" "}
                          {session.duration} phút
                        </p>
                        {session.students?.length !== undefined && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-semibold">Số sinh viên:</span>{" "}
                            {session.students.length}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => {
                            dispatch(
                              setVerifyInfo({
                                examName: session.exam?.name,
                                sessionName: session.name,
                                className: session.class?.name,
                              })
                            );
                            navigate(
                              `/teacher_live?exam=${
                                session.exam?._id || session.exam_id
                              }&session=${session._id}`
                            );
                            setShowActiveSessionsModal(false);
                          }}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md transition-all font-semibold"
                        >
                          <FaPlay /> Vào giám sát
                        </button>
                        <button
                          onClick={() => {
                            handleViewStudentsInSession(session);
                            setShowActiveSessionsModal(false);
                          }}
                          className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg transition-all text-sm"
                        >
                          <FaUser /> Xem sinh viên
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowActiveSessionsModal(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
