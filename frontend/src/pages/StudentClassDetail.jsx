// Final
// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { useSelector, useDispatch } from "react-redux";
// import { toast } from "sonner";
// import { getClassById } from "../services/services";
// import { setVerifyInfo } from "../redux/slices/verifySlice";
// import { motion } from "framer-motion";
// import { LogOut, CalendarDays, GraduationCap } from "lucide-react";
// import { FaUserGraduate, FaChalkboardTeacher, FaUsers } from "react-icons/fa";

// export default function StudentClassDetail() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const { userInfo } = useSelector((state) => state.user);
//   const studentId = userInfo?._id;

//   const [cls, setCls] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [showStudents, setShowStudents] = useState(false);

//   const wsRef = useRef(null);

//   const fetchClassDetail = async () => {
//     if (!studentId) return;
//     setLoading(true);
//     try {
//       const res = await getClassById(id);
//       if (res.success) {
//         const joined = res.class.students.some((s) => s._id === studentId);
//         if (!joined) {
//           toast.error("Bạn chưa tham gia lớp học này!");
//           setCls(null);
//           return;
//         }
//         setCls(res.class);
//       } else toast.error("Không thể tải thông tin lớp học!");
//     } catch {
//       toast.error("Lỗi khi tải thông tin lớp học!");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!studentId || !cls) return;

//     const ws = new WebSocket("ws://localhost:8000/ws/exams");
//     wsRef.current = ws;

//     ws.onmessage = (ev) => {
//       const data = JSON.parse(ev.data);
//       if (data.type === "exam_created" && data.exam.class_id === id) {
//         setCls((prev) => ({
//           ...prev,
//           exams: [...(prev.exams || []), data.exam],
//         }));
//         toast.success(`📌 Lịch thi mới: ${data.exam.name}`);
//       }
//     };

//     return () => ws.close();
//   }, [studentId, cls, id]);

//   useEffect(() => {
//     fetchClassDetail();
//   }, [id, studentId]);

//   const logout = () => navigate("/login");

//   const getExamStatus = (exam) => {
//     const start = new Date(exam.start_time).getTime();
//     const end = start + exam.duration * 60 * 1000;
//     const now = Date.now();

//     if (now < start - 15 * 60 * 1000) return "Chưa đến thời gian thi";
//     if (now < start + 30 * 60 * 1000) return "Vào phòng thi";
//     if (now < end) return "Đã quá thời gian tham gia thi";
//     return "Đã kết thúc";
//   };

//   if (loading) return <p className="p-6">Đang tải thông tin lớp học...</p>;
//   if (!cls) return null;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
//       {/* ================= NAVBAR ================= */}
//       <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
//         <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
//           <Link
//             to="/student_dashboard"
//             className="font-bold text-2xl text-indigo-600 flex items-center gap-2"
//           >
//             <GraduationCap size={28} />
//             Smart Exam
//           </Link>

//           <div className="flex items-center gap-6 text-gray-700 font-medium">
//             <Link
//               to="/student_dashboard"
//               className="hover:text-indigo-600 transition"
//             >
//               Trang chủ
//             </Link>

//             <Link
//               to="/violation_history"
//               className="hover:text-indigo-600 transition"
//             >
//               Lịch sử vi phạm
//             </Link>

//             <button
//               onClick={logout}
//               className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
//             >
//               <LogOut size={18} /> Đăng xuất
//             </button>
//           </div>
//         </div>
//       </nav>

//       {/* ================= CONTENT ================= */}
//       <div className="max-w-4xl mx-auto p-6">
//         {/* ===== HEADER CARD ===== */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-6 border border-indigo-100"
//         >
//           <h1 className="text-3xl font-bold text-gray-800 mb-3">{cls.name}</h1>

//           <div className="space-y-1 text-gray-700">
//             <p>
//               Mã lớp: <span className="font-semibold">{cls.code}</span>
//             </p>
//             <p>
//               Giảng viên:{" "}
//               <span className="font-semibold">{cls.teacher_name}</span>
//             </p>
//             <p>
//               Loại lớp:{" "}
//               <span
//                 className={`font-semibold px-2 py-1 rounded-lg ${
//                   cls.visibility === "public"
//                     ? "bg-green-100 text-green-700"
//                     : "bg-red-100 text-red-700"
//                 }`}
//               >
//                 {cls.visibility.toUpperCase()}
//               </span>
//             </p>
//           </div>

//           <button
//             className="mt-5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow transition flex items-center gap-2"
//             onClick={() => setShowStudents(!showStudents)}
//           >
//             <FaUsers size={18} />
//             {showStudents
//               ? "Ẩn danh sách sinh viên"
//               : "Xem danh sách sinh viên"}
//           </button>

//           {showStudents && (
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               className="mt-5 bg-gray-50 rounded-xl p-4 border"
//             >
//               <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
//                 <FaUserGraduate className="text-indigo-500 w-6 h-6" /> Sinh viên
//                 trong lớp
//               </h2>

//               {cls.students.length ? (
//                 <ol className="list-decimal list-inside text-gray-700 space-y-1">
//                   {cls.students.map((stu, index) => (
//                     <li
//                       key={stu._id}
//                       className="px-3 py-1 bg-white rounded-lg shadow-sm hover:bg-indigo-50 transition"
//                     >
//                       {stu.name} – {stu.student_id}
//                     </li>
//                   ))}
//                 </ol>
//               ) : (
//                 <p className="text-gray-600">Chưa có sinh viên nào.</p>
//               )}
//             </motion.div>
//           )}
//         </motion.div>

//         {/* ===== EXAM LIST ===== */}
//         <div className="mt-10">
//           <h2 className="text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2">
//             <CalendarDays size={24} /> Bài thi
//           </h2>

//           {cls.exams?.length ? (
//             <div className="space-y-4">
//               {cls.exams.map((exam, index) => {
//                 const status = getExamStatus(exam);
//                 const statusColor =
//                   status === "Vào phòng thi"
//                     ? "bg-green-100 text-green-800"
//                     : status === "Chưa đến thời gian thi"
//                     ? "bg-yellow-100 text-yellow-800"
//                     : "bg-gray-100 text-gray-500";

//                 return (
//                   <motion.div
//                     key={exam._id}
//                     initial={{ opacity: 0, x: -20 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     transition={{ delay: index * 0.05 }}
//                     className="bg-white/90 border border-indigo-100 p-5 rounded-2xl shadow hover:shadow-lg transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
//                   >
//                     <div className="flex items-center gap-3">
//                       <FaChalkboardTeacher className="w-8 h-8 text-indigo-500" />
//                       <div>
//                         <p className="font-semibold text-lg text-gray-800">
//                           {exam.name} ({exam.code})
//                         </p>
//                         <p className="text-gray-600 text-sm">
//                           {new Date(exam.start_time).toLocaleString()} –{" "}
//                           {exam.duration} phút
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
//                       {status !== "Vào phòng thi" && (
//                         <span className={`px-3 py-1 rounded-full font-medium text-sm ${statusColor}`}>
//                           {status}
//                         </span>
//                       )}

//                       {status === "Vào phòng thi" && (
//                         <button
//                           className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow transition text-sm mt-2 md:mt-0"
//                           onClick={() => {
//                             dispatch(
//                               setVerifyInfo({
//                                 classCode: exam.code,
//                                 classId: cls.code,
//                               })
//                             );
//                             navigate("/face_verify");
//                           }}
//                         >
//                           Vào phòng thi
//                         </button>
//                       )}
//                     </div>
//                   </motion.div>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-gray-600">Chưa có lịch thi nào.</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getClassById } from "../services/services";
import { setVerifyInfo } from "../redux/slices/verifySlice";
import { motion } from "framer-motion";
import { LogOut, CalendarDays, GraduationCap } from "lucide-react";
import { FaUserGraduate, FaChalkboardTeacher, FaUsers } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import { pushNotification } from "../redux/slices/notificationSlice";

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

  // Fetch class detail
  const fetchClassDetail = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getClassById({
        class_id: id,
        student_id: userInfo._id,
      });

      if (res.success) {
        const joined = res.class.students.some((s) => s._id === studentId);
        if (!joined) {
          toast.error("Bạn chưa tham gia lớp học này!");
          setCls(null);
          return;
        }
        setCls(res.class);
      } else {
        toast.error("Không thể tải thông tin lớp học!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải thông tin lớp học!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, studentId]);

  // WebSocket — chỉ mở/đóng 1 lần (không phụ thuộc vào `cls`)
  useEffect(() => {
    if (!studentId) return;

    const ws = new WebSocket("ws://localhost:8000/ws/exams");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("ws opened");
      // nếu backend cần thông tin subscribe, có thể gửi ở đây
      ws.send(JSON.stringify({ type: "subscribe", classId: id }));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // ví dụ backend gửi { type: 'exam_created', exam: {...} }
        if (data.type === "exam_created" && data.exam?.class_id === id) {
          setCls((prev) => ({
            ...(prev || {}),
            exams: [...((prev && prev.exams) || []), data.exam],
          }));
          toast.success(`📌 Lịch thi mới: ${data.exam.name}`);
        }
        // nếu backend gửi update cho 1 exam (ví dụ add student_session), bạn có thể xử lý thêm ở đây

        if (data.type === "added_to_session") {
          console.log(data.student_ids.map(String).includes(String(studentId)));
          if (data.student_ids.map(String).includes(String(studentId))) {
            // toast.success(
            //   "Bạn đã được phân vào ca thi! Hãy vào làm bài ngay!",
            //   {
            //     duration: 5000,
            //   }
            // );
            // Tùy chọn: reload để cập nhật danh sách ca thi
            fetchClassDetail?.();
          }
        }
      } catch (err) {
        console.error("ws message parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("ws error", err);
    };

    return () => {
      try {
        ws.close();
      } catch (err) {
        /* ignore */
      }
    };
    // chỉ phụ thuộc vào studentId và id (không include cls)
  }, [studentId, id]);

  const logout = () => navigate("/login");

  // =============================
  //  UTILS: kiểm tra trạng thái ca / bài thi
  // =============================
  const computeSessionStatus = (start_time, duration) => {
    if (!start_time) return "Không xác định";
    const start = new Date(start_time).getTime();
    const end = start + (duration || 0) * 60 * 1000;
    const now = Date.now();

    if (now < start - 15 * 60 * 1000) return "Chưa đến thời gian thi";
    if (now >= start - 15 * 60 * 1000 && now <= start + 30 * 60 * 1000)
      return "Vào phòng thi";
    if (now > start + 30 * 60 * 1000 && now < end)
      return "Đã quá thời gian vào thi";
    if (now >= end) return "Đã kết thúc";

    return "Không xác định";
  };

  // Trả về trạng thái tổng quan của 1 exam
  const getExamStatus = (exam) => {
    if (Array.isArray(exam.student_sessions)) {
      if (exam.student_sessions.length === 0) return "Chưa có sinh viên";

      const statuses = exam.student_sessions.map((s) =>
        computeSessionStatus(s.start_time, s.duration ?? exam.duration)
      );

      if (statuses.includes("Vào phòng thi")) return "Vào phòng thi";
      if (statuses.includes("Chưa đến thời gian thi"))
        return "Chưa đến thời gian thi";
      if (statuses.includes("Đã quá thời gian vào thi"))
        return "Đã quá thời gian vào thi";
      if (statuses.includes("Đã kết thúc")) return "Đã kết thúc";

      return statuses[0] || "Không xác định";
    }

    return computeSessionStatus(exam.start_time, exam.duration);
  };

  // Lấy session (nếu có) đang "VÀO PHÒNG THI" để dùng khi vào verify
  const findActiveSessionForExam = (exam) => {
    if (
      !Array.isArray(exam.student_sessions) ||
      exam.student_sessions.length === 0
    )
      return null;

    for (const s of exam.student_sessions) {
      const st = computeSessionStatus(
        s.start_time,
        s.duration ?? exam.duration
      );
      if (st === "Vào phòng thi") return s;
    }
    return null;
  };

  if (loading) return <p className="p-6">Đang tải thông tin lớp học...</p>;
  if (!cls) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
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

            <button
              onClick={logout}
              className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto p-6">
        {/* CLASS HEADER */}
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
                {cls.visibility?.toUpperCase?.() ?? ""}
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
                  {cls.students.map((stu) => (
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

        {/* EXAM LIST */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2">
            <CalendarDays size={24} /> Bài thi
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
                    : status === "Chưa có sinh viên"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500";

                const sessions = Array.isArray(exam.student_sessions)
                  ? exam.student_sessions
                  : [];

                return (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/90 border border-indigo-100 p-5 rounded-2xl shadow hover:shadow-lg transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      <FaChalkboardTeacher className="w-8 h-8 text-indigo-500" />
                      <div>
                        <p className="font-semibold text-lg text-gray-800">
                          {exam.name} ({exam.code})
                        </p>
                        <p className="text-gray-600 text-sm">
                          {new Date(exam.start_time).toLocaleString()} –{" "}
                          {exam.duration} phút
                        </p>

                        {/* Hiển thị thông tin ca thi, dù rỗng */}
                        {sessions.length > 0 ? (
                          <ul className="list-inside list-disc ml-4 text-sm text-gray-600">
                            {sessions.map((s) => {
                              const hasStudent =
                                !s.student_ids || s.student_ids.length > 0;
                              return (
                                <li key={s._id}>
                                  {s.name ?? "Ca không tên"} —{" "}
                                  {new Date(s.start_time).toLocaleString()} (
                                  {s.duration ?? exam.duration} phút)
                                  {!hasStudent && (
                                    <span className="text-red-500 ml-2">
                                      (Chưa có sinh viên)
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-red-500 text-sm mt-2">
                            Chưa có sinh viên trong ca thi
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                      {status !== "Vào phòng thi" && (
                        <span
                          className={`px-3 py-1 rounded-full font-medium text-sm ${statusColor}`}
                        >
                          {status}
                        </span>
                      )}

                      {status === "Vào phòng thi" && (
                        <button
                          className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow transition text-sm mt-2 md:mt-0"
                          onClick={() => {
                            const activeSession =
                              findActiveSessionForExam(exam);
                            dispatch(
                              setVerifyInfo({
                                classId: cls._id,
                                examId: exam._id,
                                sessionId: activeSession
                                  ? activeSession._id
                                  : null,
                                studentId: userInfo._id,
                              })
                            );
                            navigate("/face_verify");
                          }}
                          disabled={
                            !sessions.some(
                              (s) =>
                                !s.student_ids ||
                                s.student_ids.includes(studentId)
                            )
                          }
                          title={
                            !sessions.some(
                              (s) =>
                                !s.student_ids ||
                                s.student_ids.includes(studentId)
                            )
                              ? "Ca thi chưa có sinh viên"
                              : ""
                          }
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

      <Toaster position="top-right" />
    </div>
  );
}
