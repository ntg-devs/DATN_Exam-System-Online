import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { getStudentViolations } from "../../services/services.js";
import { FiSearch } from "react-icons/fi";
import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
import { GraduationCap, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import toast, { Toaster } from "react-hot-toast";

export default function StudentViolationHistory() {
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [showTeacherInfo, setShowTeacherInfo] = useState(false);

  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.user.userInfo);

  const behaviorMap = {
    hand_move: "Cử động tay bất thường",
    mobile_use: "Sử dụng điện thoại trong khi thi",
    side_watching: "Nghiêng mặt / Xoay mặt sang hướng khác",
    mouth_open: "Mở miệng bất thường / Có dấu hiệu trao đổi",
    eye_movement: "Đảo mắt bất thường / Nhìn ra ngoài màn hình",
    look_away: "Đảo mắt bất thường / Nhìn ra ngoài màn hình",
    multi_face: "Phát hiện nhiều người trong khung hình",
    mismatch_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    unknown_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
  };

  const faceLabelMap = {
    unknown: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    other_student: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    multiple_faces: "Phát hiện nhiều người trong khung hình",
    no_face: "Không phát hiện khuôn mặt",
    looking_away: "Đảo mắt bất thường / Nhìn ra ngoài màn hình",
    phone_detected: "Sử dụng điện thoại trong khi thi",
  };

  const reasonMap = {
    multi_face: "Phát hiện nhiều người trong khung hình",
    no_face: "Không phát hiện khuôn mặt",
    mismatch: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    mismatch_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    unknown_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
    unknown: "Lý do không xác định",
  };

  // Fetch dữ liệu vi phạm của sinh viên
  useEffect(() => {
    const fetchViolations = async () => {
      setIsLoading(true);
      const res = await getStudentViolations(userInfo.student_id);
      setViolations(res.violations || []);
      setIsLoading(false);
    };
    fetchViolations();
  }, [userInfo]);

  // Khi searchTerm thay đổi, clear selectedClass và selectedExam
  useEffect(() => {
    if (searchTerm.trim()) {
      setSelectedClass(null);
      setSelectedExam(null);
    }
  }, [searchTerm]);

  // Nhóm theo lớp -> kỳ thi
  const classesData = useMemo(() => {
    const map = {};
    violations.forEach((v) => {
      const className = v.class_name || "Không rõ";
      const examName = v.exam_name || "Không rõ";
      if (!map[className]) map[className] = {};
      if (!map[className][examName]) map[className][examName] = [];
      map[className][examName].push(v);
    });
    return Object.entries(map).map(([class_name, examsObj]) => ({
      class_name,
      exams: Object.entries(examsObj).map(([exam_name, violations]) => ({
        exam_name,
        violations,
      })),
    }));
  }, [violations]);

  // Filter lớp/kỳ thi theo searchTerm
  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classesData;
    const term = searchTerm.toLowerCase();
    return classesData.filter(
      (cls) =>
        cls.class_name.toLowerCase().includes(term) ||
        cls.exams.some((exam) => exam.exam_name.toLowerCase().includes(term))
    );
  }, [classesData, searchTerm]);

  const filteredExams = useMemo(() => {
    if (!selectedClass) return [];
    if (!searchTerm.trim()) return selectedClass.exams;

    const term = searchTerm.toLowerCase();
    return selectedClass.exams.filter(
      (exam) =>
        selectedClass.class_name.toLowerCase().includes(term) ||
        exam.exam_name.toLowerCase().includes(term)
    );
  }, [selectedClass, searchTerm]);

  // Lấy danh sách loại vi phạm, lý do và nhãn duy nhất
  const violationTypes = useMemo(
    () => [...new Set(violations.map((v) => v.type).filter(Boolean))],
    [violations]
  );
  const violationReasons = useMemo(
    () => [...new Set(violations.map((v) => v.reason).filter(Boolean))],
    [violations]
  );
  const violationLabels = useMemo(() => {
    const labels = violations.flatMap(
      (v) => v.faces?.map((f) => f.label) || []
    );
    return [...new Set(labels.filter(Boolean))];
  }, [violations]);

  // Lọc violations theo các filter
  const filteredViolations = useMemo(() => {
    if (!selectedExam) return [];
    return selectedExam.violations.filter((v) => {
      const matchType = filterType ? v.type === filterType : true;
      const matchReason = filterReason ? v.reason === filterReason : true;
      const matchLabel = filterLabel
        ? v.faces?.some((f) => f.label === filterLabel)
        : true;
      return matchType && matchReason && matchLabel;
    });
  }, [selectedExam, filterType, filterReason, filterLabel]);

  const getViolationStyle = (violation) => {
    if (violation.behavior) {
      switch (violation.behavior.toLowerCase()) {
        case "cheating":
        case "gian lận":
          return {
            color: "bg-red-100 text-red-600",
            icon: <FaExclamationTriangle className="inline mr-1" />,
          };
        case "late":
        case "muộn":
          return {
            color: "bg-yellow-100 text-yellow-600",
            icon: <FaClock className="inline mr-1" />,
          };
        default:
          return {
            color: "bg-gray-100 text-gray-600",
            icon: <FaExclamationTriangle className="inline mr-1" />,
          };
      }
    } else if (violation.reason) {
      return {
        color: "bg-orange-100 text-orange-600",
        icon: <FaExclamationTriangle className="inline mr-1" />,
      };
    } else {
      return {
        color: "bg-gray-100 text-gray-600",
        icon: <FaExclamationTriangle className="inline mr-1" />,
      };
    }
  };

  const paginateViolations = (list) => {
    const start = (currentPage - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  };

  const SkeletonCard = () => (
    <div className="bg-gray-100 rounded-xl p-4 shadow-md animate-pulse flex flex-col gap-3">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-32 bg-gray-300 rounded-xl"></div>
    </div>
  );

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setSelectedExam(cls.exams[0] || null);
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto font-sans p-6 h-screen flex flex-col">
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
            <NotificationBell studentId={userInfo._id} toast={toast} />
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

      {/* HEADER SEARCH */}
      <div className=" top-0 bg-white py-2 px-6 flex justify-end items-center border-b border-gray-200">
        {!isSearchOpen && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-400/80 transition flex items-center gap-2"
          >
            <FiSearch className="text-white text-xl" />{" "}
            <span className="text-white">Tìm kiếm</span>
          </button>
        )}
        {isSearchOpen && (
          <div className="flex gap-3 w-full md:w-auto items-center flex-wrap">
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Tìm lớp hoặc kỳ thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition placeholder-gray-400 text-sm"
                autoFocus
              />
            </div>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchTerm("");
              }}
              className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex flex-1 gap-6 overflow-hidden px-10 mb-6 mt-6">
        {/* Sidebar lớp */}
        <div className="md:w-1/4 bg-white shadow-lg rounded-2xl p-4 overflow-y-auto flex flex-col gap-4 max-h-full">
          <h2 className="font-semibold mb-3 text-lg text-gray-700 sticky top-0 bg-white z-10 flex items-center gap-2">
            <FaBook className="text-blue-500" /> Lớp học
          </h2>

          {filteredClasses.length === 0 ? (
            <p className="text-gray-400 italic text-sm">
              Không tìm thấy lớp nào
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.class_name}
                  onClick={() => handleSelectClass(cls)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 ${
                    selectedClass?.class_name === cls.class_name
                      ? "bg-blue-50 font-semibold shadow-md border-blue-200 text-blue-600"
                      : "bg-white"
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 text-lg font-bold">
                    {cls.class_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {cls.class_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="md:flex-1 flex flex-col gap-5 overflow-y-auto max-h-full">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 12 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          ) : selectedClass ? (
            <>
              {/* Tabs kỳ thi + Bộ lọc vi phạm */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                {filteredExams.map((exam) => (
                  <button
                    key={exam.exam_name || exam.code}
                    onClick={() => setSelectedExam(exam)}
                    className={`px-4 py-2 rounded-full font-medium transition ${
                      selectedExam?.exam_name === exam.exam_name
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {exam.exam_name || "Không rõ"}
                  </button>
                ))}

                {/* Bộ lọc loại vi phạm */}
                {/* Bộ lọc loại vi phạm */}
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="
      px-4 py-2 
      pr-10
      rounded-xl 
      border border-gray-300 
      bg-white
      text-sm 
      shadow-sm 
      focus:outline-none 
      focus:ring-2 
      focus:ring-blue-400 
      focus:border-blue-400 
      cursor-pointer
      transition-all
      appearance-none
    "
                  >
                    <option value="">Tất cả loại vi phạm</option>
                    {violationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {/* Icon mũi tên */}
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {/* Bộ lọc lý do vi phạm */}
                <div className="relative">
                  <select
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="
      px-4 py-2 
      pr-10
      rounded-xl 
      border border-gray-300 
      bg-white
      text-sm 
      shadow-sm 
      focus:outline-none 
      focus:ring-2 
      focus:ring-blue-400 
      focus:border-blue-400 
      cursor-pointer
      transition-all
      appearance-none
    "
                  >
                    <option value="">Tất cả lý do vi phạm</option>
                    {violationReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>

                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {/* Bộ lọc nhãn vi phạm */}
                <div className="relative">
                  <select
                    value={filterLabel}
                    onChange={(e) => setFilterLabel(e.target.value)}
                    className="
      px-4 py-2 
      pr-10
      rounded-xl 
      border border-gray-300 
      bg-white
      text-sm 
      shadow-sm 
      focus:outline-none 
      focus:ring-2 
      focus:ring-blue-400 
      focus:border-blue-400 
      cursor-pointer
      transition-all
      appearance-none
    "
                  >
                    <option value="">Tất cả nhãn</option>
                    {violationLabels.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Hiển thị vi phạm */}
              {selectedExam ? (
                filteredViolations.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">
                    Không có vi phạm
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginateViolations(filteredViolations).map((v, idx) => {
                      const { color, icon } = getViolationStyle(v);
                      return (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
                        >
                          <p className="font-semibold text-gray-800 text-sm">
                            Mã sinh viên:{" "}
                            <span className="text-blue-600">{v.student}</span>
                          </p>

                          {v.behavior && (
                            <p
                              className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
                            >
                              {icon} Hành vi:{" "}
                              {behaviorMap[v.behavior] || v.behavior}
                            </p>
                          )}

                          <p>Điểm: {v.score?.toFixed(2)} </p>

                          {v.reason && (
                            <div
                              className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex flex-col gap-1`}
                            >
                              {icon} Lý do: {reasonMap[v.reason] || v.reason}
                              {v.faces?.map((f, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-gray-700 flex justify-between"
                                >
                                  <span>
                                    Label: {faceLabelMap[f.label] || f.label}
                                  </span>
                                  <span>
                                    Độ tương đồng: {f.similarity.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-gray-500 text-xs">
                            Ghi nhận:{" "}
                            {new Date(
                              new Date(v.timestamp).getTime() +
                                7 * 60 * 60 * 1000
                            ).toLocaleString()}
                          </p>

                          {v.evidence && (
                            <img
                              src={v.evidence}
                              alt="evidence"
                              className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
                              onClick={() => window.open(v.evidence, "_blank")}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <p className="text-gray-500 italic text-sm">
                  Chọn kỳ thi để xem vi phạm
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic text-sm">
              Chọn lớp để xem lịch sử vi phạm
            </p>
          )}
        </div>
      </div>

      {/* Scroll to top */}
      {selectedClass && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
