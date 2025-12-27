import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { getInfoViolation } from "../../services/services.js";
import { FiSearch } from "react-icons/fi";
import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
import { LogOut, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

// ====== Map / helper dùng chung ======
const getReasonText = (reason) => {
  switch (reason) {
    case "multi_face":
      return "Phát hiện nhiều người trong khung hình";
    case "no_face":
      return "Không phát hiện khuôn mặt";
    case "mismatch_face":
    case "unknown_face":
      return "Khuôn mặt không khớp / Nghi vấn thi hộ";
    case "look_away":
      return "Đảo mắt bất thường / Nhìn ra ngoài màn hình";
    case "cheating":
      return "Gian lận";
    default:
      return reason || "Không xác định";
  }
};

const behaviorMap = {
  hand_move: "Cử động tay bất thường",
  mobile_use: "Sử dụng điện thoại trong khi thi",
  side_watching: "Nghiêng mặt / xoay mặt sang hướng khác",
  mouth_open: "Mở miệng bất thường / Có dấu hiệu trao đổi",
  eye_movement: "Đảo mắt bất thường / Nhìn ra ngoài màn hình",
  look_away: "Đảo mắt bất thường / Nhìn ra ngoài màn hình",
  multi_face: "Phát hiện nhiều người trong khung hình",
  mismatch_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
  unknown_face: "Khuôn mặt không khớp / Nghi vấn thi hộ",
};

export default function TeacherViolationHistory() {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // chứa studentGroup khi mở modal
  const [showTeacherInfo, setShowTeacherInfo] = useState(false);

  const userInfo = useSelector((state) => state.user.userInfo);

  // Fetch dữ liệu vi phạm
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getInfoViolation({ teacher_id: userInfo?._id });
      setData(res);
      setIsLoading(false);
    };
    if (userInfo) fetchData();
  }, [userInfo]);

  const filteredClasses = useMemo(() => {
    if (!data) return [];
    return data.classes.filter(
      (cls) =>
        cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.exams.some((exam) =>
          exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [data, searchTerm]);

  const filteredExams = useMemo(() => {
    if (!selectedClass) return [];
    // Khi đã chọn lớp, hiển thị tất cả exams của lớp đó (không filter theo searchTerm)
    // Vì searchTerm chỉ dùng để tìm lớp, không dùng để filter exams trong lớp đã chọn
    return selectedClass.exams;
  }, [selectedClass]);

  const filteredViolationsByStudent = useMemo(() => {
    if (!data || !searchStudent.trim()) return [];
    const violations = [];
    data.classes.forEach((cls) => {
      cls.exams.forEach((exam) => {
        exam.violations.forEach((v) => {
          if (v.student.toLowerCase().includes(searchStudent.toLowerCase())) {
            violations.push({
              ...v,
              class_name: cls.class_name,
              exam_name: exam.exam_name,
            });
          }
        });
      });
    });
    return violations;
  }, [data, searchStudent]);

  const getBehaviorStyle = (behavior) => {
    const b = (behavior || "").toString().toLowerCase();
    switch (b) {
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
  };

  const paginateViolations = (violations) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return violations.slice(startIndex, endIndex);
  };

  const SkeletonCard = () => (
    <div className="bg-gray-100 rounded-xl p-4 shadow-md animate-pulse flex flex-col gap-3">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-32 bg-gray-300 rounded-xl"></div>
    </div>
  );

  return (
    <div className="mx-auto font-sans h-screen flex flex-col">
      {/* NAVBAR */}
      <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            to="/student_dashboard"
            className="font-bold text-2xl text-indigo-600 flex items-center gap-2"
          >
            <GraduationCap size={28} />
            Smart Exam
          </Link>

          <div className="flex items-center gap-6 text-gray-700 font-medium">
            <Link
              to="/student_dashboard"
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
            <div className="relative">
              <div
                className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 rounded-full cursor-pointer hover:bg-gray-200 transition"
                onClick={() => setShowTeacherInfo(!showTeacherInfo)}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
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
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white py-2 px-6 flex justify-end items-center">
        {!isSearchOpen ? (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-400/80 transition flex items-center gap-4"
            title="Tìm kiếm"
          >
            <FiSearch className="text-white text-xl" />{" "}
            <span className="text-white">Tìm kiếm</span>
          </button>
        ) : (
          <div className="flex gap-3 w-full md:w-auto items-center">
            {/* Search lớp/kỳ thi */}
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

            {/* Search sinh viên */}
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã sinh viên..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition placeholder-gray-400 text-sm"
              />
            </div>

            {/* Close search */}
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchTerm("");
                setSearchStudent("");
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
        {/* Sidebar */}
        {searchStudent.trim() === "" && (
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
                {filteredClasses.map((cls) => {
                  // Tìm lớp gốc từ data.classes để đảm bảo có đầy đủ thông tin
                  const originalClass = data?.classes.find(c => c.class_code === cls.class_code) || cls;
                  
                  return (
                    <div
                      key={cls.class_code}
                      onClick={() => {
                        setSelectedClass(originalClass);
                        setSelectedExam(null);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 ${
                        selectedClass?.class_code === cls.class_code
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
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {cls.class_code}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="md:flex-1 flex flex-col gap-5 overflow-y-auto max-h-full">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 12 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          ) : searchStudent.trim() !== "" ? (
            filteredViolationsByStudent.length === 0 ? (
              <p className="text-gray-500 italic text-sm">
                Không tìm thấy vi phạm của sinh viên này
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginateViolations(filteredViolationsByStudent).map(
                  (v, idx) => {
                    const { color, icon } = getBehaviorStyle(v.behavior);
                    return (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
                      >
                        <p className="font-semibold text-gray-800 text-sm">
                          Học sinh:{" "}
                          <span className="text-blue-600">{v.student}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Lớp: {v.class_name} | Kỳ thi: {v.exam_name}
                        </p>

                        <div
                          className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
                        >
                          {icon} Hành vi:{" "}
                          {v.behavior || "Phát hiện khuôn mặt khác"}
                        </div>

                        {v.reason && (
                          <p className="text-gray-700 text-sm">
                            Lý do: {getReasonText(v.reason)}
                          </p>
                        )}

                        <p className="text-gray-700 text-sm">
                          Điểm: {v.score?.toFixed(2)}
                        </p>
                        <p className="text-gray-700 text-sm">
                          Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
                        </p>
                        <p className="text-gray-500 text-xs">
                          Ghi nhận: {new Date(v.timestamp).toLocaleString()}
                        </p>
                        {v.evidence && (
                          <img
                            src={v.evidence}
                            alt="evidence"
                            loading="lazy"
                            className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
                            onClick={() => window.open(v.evidence, "_blank")}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )
          ) : selectedClass ? (
            <>
              {/* Tabs kỳ thi */}
              <div className="flex flex-wrap gap-3 mb-4">
                {filteredExams.map((exam) => (
                  <button
                    key={exam.exam}
                    onClick={() => setSelectedExam(exam)}
                    className={`px-4 py-2 rounded-full font-medium transition ${
                      selectedExam?.exam === exam.exam
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {exam.exam_name}
                  </button>
                ))}
              </div>

              {/* Hiển thị vi phạm với nhóm sinh viên */}
              {selectedExam ? (
                selectedExam.violations.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">
                    Không có vi phạm
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Object.values(
                      selectedExam.violations.reduce((acc, v) => {
                        if (!acc[v.student])
                          acc[v.student] = {
                            student: v.student,
                            violations: [],
                          };
                        acc[v.student].violations.push(v);
                        return acc;
                      }, {})
                    ).map((studentGroup) => (
                      <StudentViolationCard
                        key={studentGroup.student}
                        studentGroup={studentGroup}
                        getBehaviorStyle={getBehaviorStyle}
                        onViewAll={(group) => setModalData(group)}
                      />
                    ))}
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
      {(selectedClass || searchStudent.trim() !== "") && (
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

      {/* MODAL */}
      {modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-lg relative max-h-[80vh]">
            <button
              onClick={() => setModalData(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-lg"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Vi phạm của:{" "}
              <span className="text-blue-600">{modalData.student}</span>
            </h2>
            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {modalData.violations.map((v, idx) => {
                const { color, icon } = getBehaviorStyle(
                  v.behavior || "unknown"
                );
                return (
                  <div
                    key={idx}
                    className="flex flex-col md:flex-row gap-4 border-b pb-4 last:border-b-0"
                  >
                    {/* Thông tin */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div
                        className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
                      >
                        {icon} Hành vi:{" "}
                        {behaviorMap[v.behavior] ||
                          "Phát hiện nhiều khuôn mặt khác"}
                      </div>

                      {v.reason && (
                        <p className="text-gray-700 text-sm">
                          Lý do: {getReasonText(v.reason)}
                        </p>
                      )}

                      {v.score !== undefined && (
                        <p className="text-gray-700 text-sm">
                          Điểm: {v.score.toFixed(2)}
                        </p>
                      )}
                      {v.duration_ms !== undefined && (
                        <p className="text-gray-700 text-sm">
                          Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
                        </p>
                      )}
                      <p className="text-gray-500 text-xs">
                        Ghi nhận:{" "}
                        {new Date(
                          new Date(v.timestamp).getTime() + 7 * 60 * 60 * 1000
                        ).toLocaleString()}
                      </p>

                      {/* Hiển thị faces */}
                      {v.faces && v.faces.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {v.faces.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="border rounded-md p-1 flex flex-col items-center text-xs bg-gray-50"
                            >
                              <div className="text-gray-600">
                                Face {fIdx + 1}
                              </div>
                              <div>
                                Độ tương đồng: {f.similarity.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ảnh evidence */}
                    {v.evidence && (
                      <img
                        src={v.evidence}
                        alt="evidence"
                        className="w-full md:w-64 h-48 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
                        onClick={() => window.open(v.evidence, "_blank")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component con: hiển thị violation theo sinh viên với toggle "Xem tất cả"
function StudentViolationCard({ studentGroup, getBehaviorStyle, onViewAll }) {
  const [firstViolation, ...restViolations] = studentGroup.violations;
  const { color, icon } = getBehaviorStyle(
    firstViolation.behavior || "unknown"
  );

  return (
    <div className="bg-gray-50 rounded-xl p-4 shadow-sm flex flex-col gap-2">
      <p className="font-semibold text-gray-800 text-sm">
        Học sinh:{" "}
        <span className="text-blue-600">{firstViolation.student}</span>
      </p>

      {/* Lý do / Hành vi */}
      {firstViolation.reason ? (
        <div
          className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
        >
          <span className="text-gray-700 text-xs">
            Lý do: {getReasonText(firstViolation.reason)}
          </span>
        </div>
      ) : (
        <div
          className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
        >
          Hành vi: {behaviorMap[firstViolation.behavior] || v.behavior}
        </div>
      )}

      {firstViolation.score !== undefined && (
        <p className="text-gray-700 text-sm">
          Điểm: {firstViolation.score.toFixed(2)}
        </p>
      )}
      {firstViolation.duration_ms !== undefined && (
        <p className="text-gray-700 text-sm">
          Thời gian: {(firstViolation.duration_ms / 1000).toFixed(2)}s
        </p>
      )}

      {/* Faces thumbnail */}
      {firstViolation.faces && firstViolation.faces.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {firstViolation.faces.map((f, idx) => (
            <div key={idx} className="px-1 py-0.5 bg-red-100 rounded text-xs">
              Face {idx + 1} - {f.similarity.toFixed(2)}
            </div>
          ))}
        </div>
      )}

      {restViolations.length > 0 && (
        <button
          onClick={() => onViewAll(studentGroup)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Xem tất cả ({restViolations.length + 1})
        </button>
      )}
    </div>
  );
}
