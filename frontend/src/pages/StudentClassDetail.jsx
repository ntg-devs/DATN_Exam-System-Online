// Final

// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useSelector } from "react-redux";
// import toast, { Toaster } from "react-hot-toast";
// import { getClassById } from "../services/services";

// import { useDispatch } from "react-redux";
// import { setVerifyInfo } from "../redux/slices/verifySlice";

// export default function StudentClassDetail() {
//   const { id } = useParams(); // classId
//   const navigate = useNavigate();
//   const { userInfo } = useSelector((state) => state.user);
//   const studentId = userInfo?._id;

//   const [cls, setCls] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [showStudents, setShowStudents] = useState(false);

//   const dispatch = useDispatch();

//   const wsRef = useRef(null);

//   const fetchClassDetail = async () => {
//     if (!studentId) return;
//     setLoading(true);
//     try {
//       const res = await getClassById(id);
//       if (res.success) {
//         const hasJoined = res.class.students.some((s) => s._id === studentId);
//         if (!hasJoined) {
//           toast.error("Bạn chưa tham gia lớp học này!");
//           setCls(null);
//           return;
//         }
//         setCls(res.class);
//       } else {
//         toast.error("Không thể tải thông tin lớp học!");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Lỗi khi tải thông tin lớp học!");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // =========================
//   // WebSocket realtime exam
//   // =========================
//   useEffect(() => {
//     // Kết nối WS khi student đã tham gia lớp
//     if (!studentId || !cls) return;

//     const ws = new WebSocket(`ws://localhost:8000/ws/exams`); // đổi URL theo backend
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log("✅ Connected to exams WS");
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       if (data.type === "exam_created") {
//         // Nếu exam thuộc lớp hiện tại
//         if (data.exam.class_id === id) {
//           setCls((prev) => ({
//             ...prev,
//             exams: [...(prev.exams || []), data.exam]
//           }));
//           toast.success(`Có lịch thi mới: ${data.exam.name}`);
//         }
//       }
//     };

//     ws.onclose = () => {
//       console.log("❌ Disconnected from exams WS");
//     };

//     return () => {
//       ws.close();
//     };
//   }, [studentId, cls, id]);

//   useEffect(() => {
//     fetchClassDetail();
//   }, [id, studentId]);

//   if (loading) return <p className="p-6">Đang tải thông tin lớp học...</p>;
//   if (!cls) return null;

//   const getExamStatus = (exam) => {
//     const start = new Date(exam.start_time).getTime();
//     const end = start + exam.duration * 60 * 1000;
//     const now = Date.now();

//     if (now < start - 15 * 60 * 1000) return "Chưa đến thời gian thi";
//     if (now < start + 30 * 60 * 1000) return "Vào phòng thi";
//     if (now < end) return "Đã quá thời gian tham gia thi";
//     return "Đã kết thúc";
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <Toaster position="top-right" />

//       <h1 className="text-3xl font-bold mb-4">{cls.name}</h1>
//       <p>Mã lớp: <span className="font-medium">{cls.code}</span></p>
//       <p>Giảng viên: <span className="font-medium">{cls.teacher_name}</span></p>
//       <p>
//         Loại lớp:{" "}
//         <span className={`font-semibold ${cls.visibility === "public" ? "text-green-700" : "text-red-700"}`}>
//           {cls.visibility.toUpperCase()}
//         </span>
//       </p>

//       <button
//         className="mt-4 mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
//         onClick={() => setShowStudents(!showStudents)}
//       >
//         {showStudents ? "Ẩn danh sách sinh viên" : "Xem danh sách sinh viên"}
//       </button>

//       {showStudents && (
//         <div>
//           <h2 className="text-2xl font-bold mb-2 border-b pb-1">👨‍🎓 Sinh viên trong lớp</h2>
//           {cls.students.length ? (
//             <ul className="mb-4 list-disc list-inside">
//               {cls.students.map((stu) => (
//                 <li key={stu._id}>
//                   {stu.name} - {stu.student_id}
//                 </li>
//               ))}
//             </ul>
//           ) : <p>Chưa có sinh viên nào trong lớp.</p>}
//         </div>
//       )}

//       <h2 className="text-2xl font-bold mb-2 border-b pb-1">📅 Lịch thi</h2>
//       {cls.exams?.length ? (
//         <ul className="mb-4 list-disc list-inside">
//           {cls.exams.map((exam) => {
//             const status = getExamStatus(exam);
//             return (
//               <li key={exam._id} className="mb-2">
//                 <div className="flex flex-col md:flex-row md:items-center md:justify-between">
//                   <span>
//                     {exam.name} ({exam.code}) - {new Date(exam.start_time).toLocaleString()} ({exam.duration} phút)
//                   </span>
//                   {status === "Vào phòng thi" ? (
//                     <button
//                       className="mt-2 md:mt-0 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
//                       onClick={() => {
//                         dispatch(setVerifyInfo({ classCode: exam.code, classId: cls.code }));
//                         navigate('/face_verify');
//                       }}
//                     >
//                       {status}
//                     </button>
//                   ) : (
//                     <span className="mt-2 md:mt-0 text-gray-500 font-medium">{status}</span>
//                   )}
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       ) : <p>Chưa có lịch thi nào.</p>}
//     </div>
//   );
// }

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { getClassById } from "../services/services";
import { setVerifyInfo } from "../redux/slices/verifySlice";
import { motion } from "framer-motion";
import { LogOut, CalendarDays, GraduationCap } from "lucide-react";
import { FaUserGraduate, FaChalkboardTeacher, FaUsers } from "react-icons/fa";

export default function StudentClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.user);
  const studentId = userInfo?._id;

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showStudents, setShowStudents] = useState(false);

  const wsRef = useRef(null);

  const fetchClassDetail = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getClassById(id);
      if (res.success) {
        const joined = res.class.students.some((s) => s._id === studentId);
        if (!joined) {
          toast.error("Bạn chưa tham gia lớp học này!");
          setCls(null);
          return;
        }
        setCls(res.class);
      } else toast.error("Không thể tải thông tin lớp học!");
    } catch {
      toast.error("Lỗi khi tải thông tin lớp học!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentId || !cls) return;

    const ws = new WebSocket("ws://localhost:8000/ws/exams");
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "exam_created" && data.exam.class_id === id) {
        setCls((prev) => ({
          ...prev,
          exams: [...(prev.exams || []), data.exam],
        }));
        toast.success(`📌 Lịch thi mới: ${data.exam.name}`);
      }
    };

    return () => ws.close();
  }, [studentId, cls, id]);

  useEffect(() => {
    fetchClassDetail();
  }, [id, studentId]);

  const logout = () => navigate("/login");

  const getExamStatus = (exam) => {
    const start = new Date(exam.start_time).getTime();
    const end = start + exam.duration * 60 * 1000;
    const now = Date.now();

    if (now < start - 15 * 60 * 1000) return "Chưa đến thời gian thi";
    if (now < start + 30 * 60 * 1000) return "Vào phòng thi";
    if (now < end) return "Đã quá thời gian tham gia thi";
    return "Đã kết thúc";
  };

  if (loading) return <p className="p-6">Đang tải thông tin lớp học...</p>;
  if (!cls) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* ================= NAVBAR ================= */}
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

            <button
              onClick={logout}
              className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* ================= CONTENT ================= */}
      <div className="max-w-4xl mx-auto p-6">
        {/* ===== HEADER CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-6 border border-indigo-100"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{cls.name}</h1>

          <div className="space-y-1 text-gray-700">
            <p>
              Mã lớp: <span className="font-semibold">{cls.code}</span>
            </p>
            <p>
              Giảng viên:{" "}
              <span className="font-semibold">{cls.teacher_name}</span>
            </p>
            <p>
              Loại lớp:{" "}
              <span
                className={`font-semibold px-2 py-1 rounded-lg ${
                  cls.visibility === "public"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {cls.visibility.toUpperCase()}
              </span>
            </p>
          </div>

          <button
            className="mt-5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow transition flex items-center gap-2"
            onClick={() => setShowStudents(!showStudents)}
          >
            <FaUsers size={18} />
            {showStudents
              ? "Ẩn danh sách sinh viên"
              : "Xem danh sách sinh viên"}
          </button>

          {showStudents && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 bg-gray-50 rounded-xl p-4 border"
            >
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <FaUserGraduate className="text-indigo-500 w-6 h-6" /> Sinh viên
                trong lớp
              </h2>

              {cls.students.length ? (
                <ol className="list-decimal list-inside text-gray-700 space-y-1">
                  {cls.students.map((stu, index) => (
                    <li
                      key={stu._id}
                      className="px-3 py-1 bg-white rounded-lg shadow-sm hover:bg-indigo-50 transition"
                    >
                      {stu.name} – {stu.student_id}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-600">Chưa có sinh viên nào.</p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* ===== EXAM LIST ===== */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2">
            <CalendarDays size={24} /> Lịch thi
          </h2>

          {cls.exams?.length ? (
            <div className="space-y-4">
              {cls.exams.map((exam, index) => {
                const status = getExamStatus(exam);
                const statusColor =
                  status === "Vào phòng thi"
                    ? "bg-green-100 text-green-800"
                    : status === "Chưa đến thời gian thi"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-500";

                return (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/90 border border-indigo-100 p-5 rounded-2xl shadow hover:shadow-lg transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <FaChalkboardTeacher className="w-8 h-8 text-indigo-500" />
                      <div>
                        <p className="font-semibold text-lg text-gray-800">
                          {exam.name} ({exam.code})
                        </p>
                        <p className="text-gray-600 text-sm">
                          {new Date(exam.start_time).toLocaleString()} –{" "}
                          {exam.duration} phút
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full font-medium text-sm ${statusColor}`}
                      >
                        {status}
                      </span>

                      {status === "Vào phòng thi" && (
                        <button
                          className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow transition text-sm mt-2 md:mt-0"
                          onClick={() => {
                            dispatch(
                              setVerifyInfo({
                                classCode: exam.code,
                                classId: cls.code,
                              })
                            );
                            navigate("/face_verify");
                          }}
                        >
                          Vào phòng thi
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600">Chưa có lịch thi nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
