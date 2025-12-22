import { useSearchParams, Link } from "react-router-dom";
import {
  LogOut,
  GraduationCap,
  X,
  Search,
  Bell,
  User,
  Grid,
  List,
  Users,
} from "lucide-react";
import { FaCamera } from "react-icons/fa";
import { useSelector } from "react-redux";
import { getStudentsInSession } from "../../services/services";
import { useEffect, useState } from "react";
import { SOCKET_URL } from "../../utils/path";

// Lightbox component đơn giản (không cần thư viện)
const Lightbox = ({ src, onClose }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-8"
    onClick={onClose}
  >
    <div className="relative max-w-4xl max-h-full">
      <button
        onClick={onClose}
        className="absolute -top-12 right-0 text-white text-4xl hover:text-red-400 transition"
      >
        ×
      </button>
      <img
        src={src}
        alt="Phóng to"
        className="max-w-screen-lg max-h-screen object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export default function TeacherLive() {
  const [params] = useSearchParams();
  const examId = params.get("exam");
  const sessionId = params.get("session");
  const [wsConnected, setWsConnected] = useState(false);
  const [students, setStudents] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [listStudents, setListStudents] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const [showTeacherInfo, setShowTeacherInfo] = useState(false);

  const verifyInfo = useSelector((state) => state.verify.verifyInfo);

  const userInfo = useSelector((state) => state.user.userInfo);

  const behaviorMap = {
    hand_move: "Di chuyển tay bất thường",
    mobile_use: "Sử dụng điện thoại",
    side_watching: "Nghiêng mặt sang hướng khác",
    mouth_open: "Mở miệng trao đổi",
    eye_movement: "Liếc mắt nhiều hướng",
  };
  const faceLabelMap = {
    unknown: "Người lạ",
    other_student: "Thi hộ – Phát hiện người khác",
    multiple_faces: "Nhiều hơn 1 khuôn mặt",
    no_face: "Không thấy khuôn mặt",
    looking_away: "Nhìn ra chỗ khác quá lâu",
    phone_detected: "Phát hiện điện thoại trong khung hình",
  };
  const reasonMap = {
    multi_face: "Phát hiện nhiều khuôn mặt",
    no_face: "Không phát hiện khuôn mặt",
    mismatch: "Khuôn mặt không khớp",
    unknown: "Lý do không xác định",
  };

  const getBehaviorText = (label) => {
    return (
      behaviorMap[label] || faceLabelMap[label] || reasonMap[label] || label
    );
  };

  // Logic xử lý vi phạm (giữ nguyên)
  function handleViolation(msg) {
    const item = {
      student: msg.student,
      behavior: msg.behavior,
      duration: msg.duration || 0,
      ts: msg.timestamp || Date.now(),
      evidence: msg.evidence,
    };
    setNotifications((prev) => [item, ...prev]);
    setStudents((prev) => {
      const next = { ...prev };
      const sid = msg.student;
      const entry = next[sid] || { alerts: [] };
      entry.alerts = [
        {
          ts: msg.timestamp || Date.now(),
          behavior: msg.behavior,
          duration: msg.duration || 0,
          evidence: msg.evidence,
        },
        ...entry.alerts,
      ];
      next[sid] = entry;
      return next;
    });
  }

  const getListStudentsFromExamSession = async () => {
    const res = await getStudentsInSession(sessionId);
    if (res.success) setListStudents(res.students);
  };

  useEffect(() => {
    getListStudentsFromExamSession();
    // const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);
    const ws = new WebSocket(`${SOCKET_URL}/ws/teacher?exam=${examId}`);
    // const ws = new WebSocket(`wss://103.142.24.110:8000/ws/teacher?exam=${examId}`);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "violation_detected") handleViolation(msg);
        if (msg.type === "face_alert")
          handleViolation({
            student: msg.student,
            behavior: msg.reason || "unknown_face_persistent",
            duration: msg.duration || 0,
            timestamp: msg.ts,
            evidence: msg.evidence,
          });
        if (msg.type === "student_frame") {
          setStudents((prev) => {
            const next = { ...prev };
            const entry = next[msg.student] || { alerts: [] };
            entry.frame_b64 = msg.frame_b64;
            entry.detections = msg.detections || [];
            entry.violation_rate = msg.violation_rate;
            entry.ts = msg.ts;
            next[msg.student] = entry;
            return next;
          });
        }
        if (msg.type === "student_joined") {
          setStudents((prev) => {
            if (prev[msg.student]) return prev;
            return { ...prev, [msg.student]: { alerts: [] } };
          });
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    };
    return () => ws.close();
  }, [examId]);

  console.log(listStudents);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* NAVBAR HIỆN ĐẠI */}
        <nav className="backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/teacher_dashboard" className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Smart Exam
              </span>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6 text-gray-700 font-medium">
                <Link
                  to="/teacher_dashboard"
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
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="relative" // <-- Cần relative để pop-up absolute hoạt động đúng
                  onMouseLeave={() => setShowTeacherInfo(false)} // Tự động ẩn khi di chuột ra ngoài
                >
                  <div
                    className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 rounded-full cursor-pointer hover:bg-gray-200 transition"
                    onClick={() => setShowTeacherInfo(!showTeacherInfo)} // <-- Logic BẬT/TẮT
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      G
                    </div>
                  </div>

                  {/* 3. POP-UP HIỂN THỊ GMAIL */}
                  {showTeacherInfo && (
                    <div className="absolute right-0 mt-2 p-3 w-max max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fade-in">
                      <div className="flex gap-2 mb-2 items-center">
                        <div className="text-sm font-semibold text-gray-700">
                          Tài khoản giảng viên:
                        </div>
                        <div
                          className="text-base text-indigo-600 font-medium hover:text-indigo-800 transition"
                        >
                          {userInfo.name}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="text-sm font-semibold text-gray-700">
                          Email:
                        </div>
                        <div
                          className="text-base text-indigo-600 font-medium hover:text-indigo-800 transition"
                        >
                          {userInfo.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow transition">
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-8xl mx-auto px-4 py-4">
          {/* HEADER + TRẠNG THÁI */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 justify-between bg-white/20 backdrop-blur-md rounded-2xl px-2 py-2 border border-white/50 flex items-center gap-6">
              <div className="flex justify-center items-center">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mr-4">
                  <FaCamera className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className=" font-bold text-gray-800">
                    {verifyInfo?.examName} — {verifyInfo?.sessionName}
                  </h1>
                  <p className="text-gray-600 mt-1 font-mono">
                    Lớp:{" "}
                    <span className="font-semibold">
                      {verifyInfo?.className}
                    </span>{" "}
                    | Mã bài thi:{" "}
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono">
                      {examId}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowStudentList(true)}
                  className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Users size={20} />
                  Danh sách SV
                </button>

                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-white shadow-lg ${
                    wsConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      wsConnected ? "bg-white animate-pulse" : "bg-white/50"
                    }`}
                  />
                  {wsConnected ? "Đang kết nối" : "Mất kết nối"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* DANH SÁCH SINH VIÊN LIVE */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-300px)] pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(students).map(([sid, info]) => {
                  const risk = info.violation_rate || 0;
                  const riskLevel =
                    risk > 0.6 ? "high" : risk > 0.3 ? "medium" : "low";
                  return (
                    <div
                      key={sid}
                      className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-4 transition-all
                        ${
                          riskLevel === "high"
                            ? "border-red-500"
                            : riskLevel === "medium"
                            ? "border-yellow-400"
                            : "border-emerald-500"
                        }
                      `}
                    >
                      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {Math.round(risk * 100)}%
                      </div>

                      <div className="p-4 pb-0">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <User size={20} /> {sid}
                        </h3>
                      </div>

                      <div className="relative bg-gray-900 aspect-video overflow-hidden">
                        {info.frame_b64 ? (
                          <img
                            src={info.frame_b64}
                            alt={sid}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setLightboxSrc(info.frame_b64)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            Chưa có hình ảnh
                          </div>
                        )}
                      </div>

                      {/* <div className="p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Vi phạm gần đây
                        </p>
                        <div className="text-xs space-y-1 max-h-28 overflow-y-auto">
                          {info.alerts.length === 0 ? (
                            <p className="text-gray-400 italic">
                              Chưa có vi phạm
                            </p>
                          ) : (
                            info.alerts.slice(0, 4).map((a, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs"
                              >
                                <span className="font-medium text-red-600">
                                  {a.behavior}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(a.ts).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div> */}

                      {/* ALERT HISTORY */}
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-1">
                          🚨 Vi phạm gần đây
                        </h4>

                        <div className="max-h-24 overflow-y-auto bg-gray-50 border rounded-md p-2 text-xs space-y-2">
                          {info.alerts.length ? (
                            info.alerts.map((a, i) => (
                              <div className="flex justify-between">
                                <div key={i} className="border-b pb-1">
                                  <div className="flex gap-2">
                                    <span className="">
                                      Nhãn:{" "}
                                      <span className="text-red-500">
                                        {a.behavior}
                                      </span>
                                    </span>
                                  </div>
                                  <div>
                                    <span>
                                      Hành vi: {getBehaviorText(a.behavior)}
                                    </span>
                                  </div>
                                  <div className="text-gray-600">
                                    Thời gian: {(a.duration / 1000).toFixed(1)}s
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Ghi nhận lúc:{" "}
                                      {new Date(a.ts).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {a.evidence && (
                                    <img
                                      src={a.evidence}
                                      className="w-20 mt-1 rounded cursor-pointer hover:scale-150 transition"
                                    />
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="italic text-gray-400">Không có</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT THÔNG BÁO */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className=" font-medium flex items-center gap-3 text-gray-800">
                  <Bell className="text-indigo-600" size={24} />
                  Thông báo vi phạm
                </h3>
                <button
                  onClick={() => setShowNotiModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[390px]">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 italic">
                    Chưa có thông báo nào
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl shadow-md border-l-4 transition-all
                        ${
                          ["unknown_face_persistent", "multi_face"].includes(
                            n.behavior
                          )
                            ? "border-red-500 bg-red-50"
                            : "border-orange-500 bg-orange-50"
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-lg">{n.student}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(n.ts).toLocaleTimeString()}
                          </div>
                        </div>
                        {n.duration > 0 && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            Thời lượng: {(n.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mt-2 text-gray-800">
                        Nhãn: {n.behavior}
                      </p>
                      <p className="font-semibold mt-2 text-gray-800">
                        Hành vi: {getBehaviorText(n.behavior)}
                      </p>
                      {n.evidence && (
                        <img
                          src={n.evidence}
                          alt="Bằng chứng"
                          className="mt-3 w-full rounded-lg shadow cursor-pointer hover:scale-105 transition"
                          onClick={() => setLightboxSrc(n.evidence)}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL TẤT CẢ THÔNG BÁO */}
        {showNotiModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-200 p-3   text-white">
                <div className="flex items-center justify-between">
                  <h2 className=" font-bold flex items-center gap-4">
                    <Bell size={24} /> Tất cả thông báo vi phạm
                  </h2>
                  <button
                    onClick={() => {
                      setShowNotiModal(false);
                      setSearch("");
                    }}
                    className="text-4xl hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-3  bg-gray-50">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Tìm theo mã sinh viên..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-6 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-2 py-1 rounded-xl flex items-center gap-2 transition ${
                        viewMode === "list"
                          ? "bg-emerald-400 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <List size={16} /> Danh sách
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-2 py-1 rounded-xl flex items-center gap-2 transition ${
                        viewMode === "grid"
                          ? "bg-emerald-400 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <Grid size={16} /> Lưới ảnh
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Nội dung giữ nguyên logic lọc và hiển thị */}
                {notifications.filter((n) =>
                  n.student.toLowerCase().includes(search.toLowerCase())
                ).length === 0 ? (
                  <p className="text-center py-20 text-gray-500 text-xl">
                    Không tìm thấy thông báo nào
                  </p>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {notifications
                      .filter((n) =>
                        n.student.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((n, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl overflow-hidden shadow-xl border-2 ${
                            ["unknown_face_persistent", "multi_face"].includes(
                              n.behavior
                            )
                              ? "border-red-500"
                              : "border-blue-500"
                          }`}
                        >
                          {n.evidence ? (
                            <img
                              src={n.evidence}
                              alt="evidence"
                              className="w-full h-56 object-cover cursor-pointer"
                              onClick={() => setLightboxSrc(n.evidence)}
                            />
                          ) : (
                            <div className="bg-gray-200 h-56 flex items-center justify-center">
                              Không có ảnh
                            </div>
                          )}
                          <div className="p-4 bg-white">
                            <p className="font-semibold text-sm">
                              Mã SV: {n.student}
                            </p>
                            <p className="text-xs text-gray-600">
                              Ghi nhận lúc: {new Date(n.ts).toLocaleString()}
                            </p>
                            <div className="flex text-xs items-center gap-2 mt-2">
                              <p>Nhãn: </p>
                              <p className=" text-red-600">{n.behavior}</p>
                            </div>
                            <div className="flex text-xs items-center gap-2 mt-2">
                              <p>Hành vi: </p>
                              <p className="text-red-600">
                                {getBehaviorText(n.behavior)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {notifications
                      .filter((n) =>
                        n.student.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((n, i) => (
                        <div
                          key={i}
                          className={`p-6 rounded-2xl shadow-lg border-l-8 ${
                            ["unknown_face_persistent", "multi_face"].includes(
                              n.behavior
                            )
                              ? "border-red-500 bg-red-50"
                              : "border-orange-500 bg-orange-50"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-2xl font-bold">
                                Mã sinh viên: {n.student}
                              </h4>
                              <p className="text-gray-600">
                                Ghi nhận lúc: {new Date(n.ts).toLocaleString()}
                              </p>
                            </div>
                            {n.duration > 0 && (
                              <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                                Thời lượng: {(n.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                          <div className="flex font-semibold items-center gap-2 mt-2">
                            <p>Nhãn: </p>
                            <p className=" text-red-600">{n.behavior}</p>
                          </div>
                          <div className="flex font-semibold items-center gap-2 mt-2">
                            <p>Hành vi: </p>
                            <p className="text-red-600">
                              {getBehaviorText(n.behavior)}
                            </p>
                          </div>
                          {n.evidence && (
                            <img
                              src={n.evidence}
                              alt="Bằng chứng"
                              className="mt-4 w-full max-h-96 object-contain rounded-xl shadow-lg cursor-pointer hover:scale-[1.02] transition"
                              onClick={() => setLightboxSrc(n.evidence)}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DANH SÁCH SINH VIÊN */}
        {showStudentList && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold flex items-center gap-4">
                    <Users size={36} /> Danh sách sinh viên tham gia
                  </h2>
                  <button
                    onClick={() => setShowStudentList(false)}
                    className="text-4xl hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {listStudents.length === 0 ? (
                  <p className="text-center text-gray-500 py-20 text-xl">
                    Chưa có sinh viên nào tham gia
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {listStudents.map((st) => (
                      <div
                        key={st._id}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg text-center hover:shadow-2xl transition"
                      >
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl mb-4">
                          {st.face_image ? (
                            <img
                              src={`data:image/jpeg;base64,${st.face_image}`}
                              alt={st.name}
                              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition"
                              onClick={() =>
                                setLightboxSrc(
                                  `data:image/jpeg;base64,${st.face_image}`
                                )
                              }
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                              No Image
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800">{st.name}</h4>
                        <div>Mã SV: {st.student_id}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          Liên hệ qua: {st.email}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxSrc && (
          <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        )}
      </div>
    </>
  );
}
