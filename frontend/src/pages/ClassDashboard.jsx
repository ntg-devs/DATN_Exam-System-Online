// Final
// import { useState, useEffect } from "react";
// import { useSelector } from "react-redux";
// import { useNavigate, Link } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";
// import { LogOut, GraduationCap } from "lucide-react";
// import { FaPlay, FaClock, FaCheckCircle, FaPlus, FaUserPlus, FaDoorOpen, FaRegCalendarAlt } from "react-icons/fa";
// import { MdOutlineVisibility, MdOutlineVisibilityOff, MdClose } from "react-icons/md";
// import {
//   getClasses,
//   createClass,
//   getStudents,
//   addStudentsToClass,
//   getExamsByClass,
//   createExam,
//   joinClass,
// } from "../services/services";

// export default function ClassDashboard() {
//   const { userInfo } = useSelector((state) => state.user);
//   const navigate = useNavigate();

//   const [classes, setClasses] = useState([]);
//   const [showCreateClassModal, setShowCreateClassModal] = useState(false);
//   const [className, setClassName] = useState("");
//   const [classCode, setClassCode] = useState("");
//   const [classVisibility, setClassVisibility] = useState("public");
//   const [classPassword, setClassPassword] = useState("");

//   const [currentClass, setCurrentClass] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [selectedStudents, setSelectedStudents] = useState([]);
//   const [showStudentModal, setShowStudentModal] = useState(false);

//   const [exams, setExams] = useState([]);
//   const [showExamModal, setShowExamModal] = useState(false);
//   const [examName, setExamName] = useState("");
//   const [examCode, setExamCode] = useState("");
//   const [examStartTime, setExamStartTime] = useState("");
//   const [examDuration, setExamDuration] = useState("");

//   const notifySuccess = (msg) => toast.success(msg);
//   const notifyError = (msg) => toast.error(msg);

//   useEffect(() => { if (userInfo?._id) fetchClasses(); }, [userInfo]);

//   const fetchClasses = async () => {
//     try {
//       const data = await getClasses({ user_id: userInfo._id, role: userInfo.role });
//       setClasses(data?.classes || []);
//     } catch { notifyError("Không thể tải danh sách lớp học!"); }
//   };

//   const getExamStatus = (exam) => {
//     const now = Date.now();
//     const start = new Date(exam.start_time).getTime();
//     const end = start + exam.duration * 60 * 1000;
//     if (now >= start - 15 * 60 * 1000 && now <= end) return "active";
//     if (now < start - 15 * 60 * 1000) return "soon";
//     if (now > end) return "done";
//     return "";
//   };

//   const handleCreateClass = async (e) => {
//     e.preventDefault();
//     if (!className.trim() || !classCode.trim()) return notifyError("Vui lòng nhập đầy đủ thông tin!");
//     try {
//       const success = await createClass({ name: className, code: classCode, teacher_id: userInfo._id, visibility: classVisibility, password: classVisibility === "private" ? classPassword : "" });
//       if (success) {
//         notifySuccess("Tạo lớp thành công!");
//         setShowCreateClassModal(false); setClassName(""); setClassCode(""); setClassPassword(""); fetchClasses();
//       } else notifyError("❌ Lớp học đã tồn tại!");
//     } catch { notifyError("Lỗi khi tạo lớp học!"); }
//   };

//   const handleOpenStudentModal = async (cls) => {
//     setCurrentClass(cls);
//     try {
//       const data = await getStudents({});
//       setStudents(data?.students || []);
//       setSelectedStudents([]);
//       setShowStudentModal(true);
//     } catch { notifyError("Không thể tải danh sách sinh viên!"); }
//   };

//   const toggleStudentSelection = (stu) => {
//     setSelectedStudents(prev => prev.includes(stu._id) ? prev.filter(id => id !== stu._id) : [...prev, stu._id]);
//   };

//   const handleAddStudents = async () => {
//     if (!selectedStudents.length) return notifyError("Vui lòng chọn sinh viên!");
//     try {
//       const res = await addStudentsToClass({ class_id: currentClass._id, student_ids: selectedStudents });
//       if (res.success) { notifySuccess("Thêm sinh viên thành công!"); setShowStudentModal(false); fetchClasses(); }
//     } catch { notifyError("Lỗi khi thêm sinh viên!"); }
//   };

//   const handleJoinClass = async (cls) => {
//     if (cls.visibility === "private") {
//       const pass = prompt("Nhập mật khẩu lớp:"); if (!pass) return;
//       try { const res = await joinClass(cls._id, userInfo._id, pass); res.success ? notifySuccess("Tham gia thành công!") : notifyError("Sai mật khẩu!"); fetchClasses(); } catch { notifyError("Không thể tham gia lớp!"); }
//     } else {
//       try { const res = await joinClass(cls._id, userInfo._id); res.success && notifySuccess("Đã tham gia lớp!"); fetchClasses(); } catch { notifyError("Không thể tham gia lớp!"); }
//     }
//   };

//   const handleOpenClassDetail = async (cls) => {
//     setCurrentClass(cls);
//     try { const data = await getExamsByClass({ class_id: cls._id }); setExams(data?.exams || []); } catch { notifyError("Không thể tải lịch thi!"); }
//   };

//   const handleCreateExam = async (e) => {
//     e.preventDefault();
//     if (!examName || !examCode || !examDuration || !examStartTime) return notifyError("Vui lòng nhập đầy đủ!");
//     try {
//       const success = await createExam({ class_id: currentClass._id, name: examName, code: examCode, start_time: examStartTime, duration: Number(examDuration), created_by: userInfo._id });
//       if (success) { notifySuccess("Tạo lịch thi thành công!"); setShowExamModal(false); setExamName(""); setExamCode(""); setExamStartTime(""); setExamDuration(""); handleOpenClassDetail(currentClass); }
//     } catch { notifyError("Lỗi khi tạo lịch thi!"); }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* NAVBAR */}
//       <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
//         <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
//           <Link to="/student_dashboard" className="font-bold text-2xl text-indigo-600 flex items-center gap-2"><GraduationCap size={28} /> Smart Exam</Link>
//           <div className="flex items-center gap-6 text-gray-700 font-medium">
//             <Link to="/student_dashboard" className="hover:text-indigo-600 transition">Trang chủ</Link>
//             <Link to="/violation_history" className="hover:text-indigo-600 transition">Lịch sử vi phạm</Link>
//             <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"><LogOut size={18} /> Đăng xuất</button>
//           </div>
//         </div>
//       </nav>

//       <div className="p-8 max-w-6xl mx-auto">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Cột 1 — Danh sách lớp */}
//           <div className="bg-white shadow-lg rounded-xl p-5 max-h-[80vh] overflow-y-auto">
//             {userInfo.role === "teacher" && (
//               <div className="flex justify-end mb-4">
//                 <button onClick={() => setShowCreateClassModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"><FaPlus /> Tạo lớp học</button>
//               </div>
//             )}
//             <h2 className="text-xl font-bold mb-4 text-indigo-600">Danh sách lớp học</h2>
//             {classes.length === 0 ? (
//               <p className="text-center text-gray-500">Chưa có lớp học nào.</p>
//             ) : (
//               <div className="space-y-3">
//                 {classes.map(cls => (
//                   <div key={cls._id} className="p-4 rounded-lg border hover:shadow-md hover:border-indigo-300 transition bg-white">
//                     <div className="flex justify-between items-center">
//                       <div>
//                         <p className="text-lg font-semibold text-gray-800">{cls.name}</p>
//                         <p className="text-sm text-gray-500 mt-1">Mã lớp: <span className="font-semibold">{cls.code}</span></p>
//                         {cls.visibility === "public" ? <p className="flex items-center gap-1 text-green-600 text-sm"><MdOutlineVisibility /> Công khai</p> : <p className="flex items-center gap-1 text-yellow-600 text-sm"><MdOutlineVisibilityOff /> Riêng tư</p>}
//                       </div>
//                       <div className="flex flex-col gap-2">
//                         <button onClick={() => handleOpenClassDetail(cls)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"><FaRegCalendarAlt /> Chi tiết</button>
//                         {userInfo.role === "teacher" ? (
//                           <button onClick={() => handleOpenStudentModal(cls)} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"><FaUserPlus /> Sinh viên</button>
//                         ) : cls.students?.includes(userInfo._id) ? (
//                           <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-center text-sm">Đã tham gia</div>
//                         ) : (
//                           <button onClick={() => handleJoinClass(cls)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm"><FaDoorOpen /> Tham gia</button>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Cột 2 — Chi tiết lớp */}
//           <div className="bg-white shadow-lg rounded-xl p-6 min-h-[60vh]">
//             {!currentClass ? (
//               <p className="text-gray-400 text-center mt-10">Chọn một lớp để xem chi tiết.</p>
//             ) : (
//               <>
//                 <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Chi tiết lớp: {currentClass.name}</h2>
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="font-medium text-lg flex items-center gap-2"><FaRegCalendarAlt /> Bài thi</h3>
//                   {userInfo.role === "teacher" && (
//                     <button onClick={() => setShowExamModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><FaPlus /> Tạo bài thi</button>
//                   )}
//                 </div>

//                 {exams.length === 0 ? <p className="text-gray-500">Chưa có bài thi nào.</p> : (
//                   <ul className="space-y-3">
//                     {exams.map(ex => {
//                       const status = getExamStatus(ex);
//                       return (
//                         <li key={ex._id} className="p-4 border rounded-lg hover:shadow transition flex justify-between items-center">
//                           <div>
//                             <p className="font-semibold">{ex.name}</p>
//                             <p className="text-sm text-gray-500">Mã: {ex.code}</p>
//                             <p className="text-sm text-gray-400">{new Date(ex.start_time).toLocaleString("vi-VN")} — {ex.duration} phút</p>
//                           </div>
//                           {status === "active" && <button onClick={() => navigate(`/teacher_live?exam=${ex.code}`)} className="flex items-center gap-2 cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl shadow-md transition-all"><FaPlay className="text-sm" />Vào giám sát</button>}
//                           {status === "soon" && <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border border-gray-300 shadow-sm"><FaClock className="text-gray-500" />Chưa đến giờ thi</span>}
//                           {status === "done" && <span className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 shadow-sm"><FaCheckCircle className="text-red-600" />Đã kết thúc</span>}
//                         </li>
//                       );
//                     })}
//                   </ul>
//                 )}
//               </>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Modal tạo lớp */}
//       {showCreateClassModal && (
//         <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
//           <div className="bg-white rounded-xl p-6 w-96 relative">
//             <button onClick={() => setShowCreateClassModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
//             <h2 className="text-xl font-semibold mb-4">Tạo lớp học mới</h2>
//             <form onSubmit={handleCreateClass} className="flex flex-col gap-3">
//               <input value={className} onChange={e => setClassName(e.target.value)} placeholder="Tên lớp" className="border px-3 py-2 rounded-lg w-full"/>
//               <input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Mã lớp" className="border px-3 py-2 rounded-lg w-full"/>
//               <select value={classVisibility} onChange={e => setClassVisibility(e.target.value)} className="border px-3 py-2 rounded-lg w-full">
//                 <option value="public">Công khai</option>
//                 <option value="private">Riêng tư</option>
//               </select>
//               {classVisibility === "private" && <input value={classPassword} onChange={e => setClassPassword(e.target.value)} placeholder="Mật khẩu" className="border px-3 py-2 rounded-lg w-full"/>}
//               <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Tạo lớp</button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Modal thêm sinh viên */}
//       {showStudentModal && (
//         <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
//           <div className="bg-white rounded-xl p-6 w-96 relative">
//             <button onClick={() => setShowStudentModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
//             <h2 className="text-xl font-semibold mb-4">Thêm sinh viên cho {currentClass.name}</h2>
//             <ul className="max-h-64 overflow-y-auto space-y-2">
//               {students.map(stu => (
//                 <li key={stu._id} className="flex items-center justify-between border rounded px-3 py-2">
//                   <span>{stu.name}</span>
//                   <input type="checkbox" checked={selectedStudents.includes(stu._id)} onChange={() => toggleStudentSelection(stu)} />
//                 </li>
//               ))}
//             </ul>
//             <button onClick={handleAddStudents} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Thêm sinh viên</button>
//           </div>
//         </div>
//       )}

//       {/* Modal tạo lịch thi */}
//       {showExamModal && (
//         <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
//           <div className="bg-white rounded-xl p-6 w-96 relative">
//             <button onClick={() => setShowExamModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
//             <h2 className="text-xl font-semibold mb-4">Tạo bài thi</h2>
//             <form onSubmit={handleCreateExam} className="flex flex-col gap-3">
//               <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Tên bài thi" className="border px-3 py-2 rounded-lg w-full"/>
//               <input value={examCode} onChange={e => setExamCode(e.target.value)} placeholder="Mã bài thi" className="border px-3 py-2 rounded-lg w-full"/>
//               <input type="datetime-local" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} className="border px-3 py-2 rounded-lg w-full"/>
//               <input type="number" value={examDuration} onChange={e => setExamDuration(e.target.value)} placeholder="Thời lượng (phút)" className="border px-3 py-2 rounded-lg w-full"/>
//               <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Tạo bài thi</button>
//             </form>
//           </div>
//         </div>
//       )}

//       <Toaster position="top-right" />
//     </div>
//   );
// }

// ClassDashboard.jsx
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { LogOut, GraduationCap } from "lucide-react";
import {
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaPlus,
  FaUserPlus,
  FaDoorOpen,
  FaRegCalendarAlt,
} from "react-icons/fa";
import {
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdClose,
} from "react-icons/md";
import {
  getClasses,
  createClass,
  getStudents,
  addStudentsToClass,
  getExamsByClass,
  createExam,
  joinClass,
  // New service functions expected from backend
  getExamSessions,
  createExamSession,
  addStudentsToExamSession,
  getStudentsNotInClass,
  getStudentsNotInSession,
  getStudentsInSession,
} from "../services/services";

import { useDispatch } from "react-redux";
import { setVerifyInfo } from "../redux/slices/verifySlice";

export default function ClassDashboard() {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const verifyInfo = useSelector((state) => state.verify.verifyInfo);


  const [classes, setClasses] = useState([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classVisibility, setClassVisibility] = useState("public");
  const [classPassword, setClassPassword] = useState("");

  const [currentClass, setCurrentClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentNotInSession, setStudentNotInSession] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);

  const [showStudentsInSessionModal, setShowStudentsInSessionModal] =
    useState(false);
  const [studentsInSession, setStudentsInSession] = useState([]);

  const [exams, setExams] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);

  // Exam form fields
  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examStartTime, setExamStartTime] = useState("");
  const [examDuration, setExamDuration] = useState("");

  // New: sessions within create-exam modal
  const [sessions, setSessions] = useState([
    // default one session row
    { start_time: "", duration: "", room: "" },
  ]);

  // Exam detail + sessions
  const [showExamDetailModal, setShowExamDetailModal] = useState(false);
  const [examDetail, setExamDetail] = useState(null);
  const [examSessions, setExamSessions] = useState([]);

  // Add session modal (used from exam detail)
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    start_time: "",
    duration: "",
    room: "",
  });

  console.log(examDetail)

  // Add students to session
  const [showAddStudentsToSessionModal, setShowAddStudentsToSessionModal] =
    useState(false);
  const [targetSessionForStudents, setTargetSessionForStudents] =
    useState(null);
  const [selectedStudentsForSession, setSelectedStudentsForSession] = useState(
    []
  );

  const notifySuccess = (msg) => toast.success(msg);
  const notifyError = (msg) => toast.error(msg);

  useEffect(() => {
    if (userInfo?._id) fetchClasses();
  }, [userInfo]);

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

  const getExamStatus = (exam) => {
    const now = Date.now();
    const start = new Date(exam.start_time).getTime();
    const end = start + exam.duration * 60 * 1000;
    if (now >= start - 15 * 60 * 1000 && now <= end) return "active";
    if (now < start - 15 * 60 * 1000) return "soon";
    if (now > end) return "done";
    return "";
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim())
      return notifyError("Vui lòng nhập đầy đủ thông tin!");
    try {
      const success = await createClass({
        name: className,
        code: classCode,
        teacher_id: userInfo._id,
        visibility: classVisibility,
        password: classVisibility === "private" ? classPassword : "",
      });
      if (success) {
        notifySuccess("Tạo lớp thành công!");
        setShowCreateClassModal(false);
        setClassName("");
        setClassCode("");
        setClassPassword("");
        fetchClasses();
      } else notifyError("❌ Lớp học đã tồn tại!");
    } catch {
      notifyError("Lỗi khi tạo lớp học!");
    }
  };

  const handleOpenStudentModal = async (cls) => {
    setCurrentClass(cls);
    try {
      const data = await getStudentsNotInClass({ class_id: cls._id });
      setStudents(data?.students || []);
      setSelectedStudents([]);
      setShowStudentModal(true);
    } catch {
      notifyError("Không thể tải danh sách sinh viên!");
    }
  };

  const toggleStudentSelection = (stu) => {
    setSelectedStudents((prev) =>
      prev.includes(stu._id)
        ? prev.filter((id) => id !== stu._id)
        : [...prev, stu._id]
    );
  };

  const handleAddStudents = async () => {
    if (!selectedStudents.length)
      return notifyError("Vui lòng chọn sinh viên!");
    try {
      const res = await addStudentsToClass({
        class_id: currentClass._id,
        student_ids: selectedStudents,
      });
      if (res.success) {
        notifySuccess("Thêm sinh viên thành công vào lớp học!");
        setShowStudentModal(false);
        fetchClasses();
      }
    } catch {
      notifyError("Lỗi khi thêm sinh viên vào lớp học!");
    }
  };

  const handleJoinClass = async (cls) => {
    if (cls.visibility === "private") {
      const pass = prompt("Nhập mật khẩu lớp:");
      if (!pass) return;
      try {
        const res = await joinClass(cls._id, userInfo._id, pass);
        res.success
          ? notifySuccess("Tham gia thành công!")
          : notifyError("Sai mật khẩu!");
        fetchClasses();
      } catch {
        notifyError("Không thể tham gia lớp!");
      }
    } else {
      try {
        const res = await joinClass(cls._id, userInfo._id);
        res.success && notifySuccess("Đã tham gia lớp!");
        fetchClasses();
      } catch {
        notifyError("Không thể tham gia lớp!");
      }
    }
  };

  const handleOpenClassDetail = async (cls) => {
    setCurrentClass(cls);
    try {
      const data = await getExamsByClass({ class_id: cls._id });
      setExams(data?.exams || []);
    } catch {
      notifyError("Không thể tải lịch thi!");
    }
  };

  // -------------------------------
  // Create Exam (with sessions)
  // -------------------------------
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examName || !examCode)
      return notifyError("Vui lòng nhập tên và mã bài thi!");
    // validate sessions: at least one with start_time and duration
    const validSessions = sessions.filter((s) => s.start_time && s.duration);
    if (!validSessions.length)
      return notifyError(
        "Vui lòng thêm ít nhất 1 ca thi với thời gian và thời lượng!"
      );

    try {
      // create exam first
      const examRes = await createExam({
        class_id: currentClass._id,
        name: examName,
        code: examCode,
        start_time: examStartTime || validSessions[0].start_time, // legacy: keep optional single start_time
        duration: Number(examDuration) || Number(validSessions[0].duration),
        created_by: userInfo._id,
      });

      if (examRes.success != true) {
        notifyError("Không tạo được bài thi!");
        return;
      }

      const examId = examRes?.exam._id;

      // Create sessions for this exam
      for (const s of validSessions) {
        try {
          await createExamSession({
            exam_id: examId,
            name: `Ca thi ${sessions.indexOf(s) + 1}`,
            start_time: s.start_time,
            duration: Number(s.duration),
            // room: s.room || ""
          });
        } catch (err) {
          // continue creating other sessions, but notify
          console.error("Lỗi tạo ca thi:", err);
        }
      }

      notifySuccess("Tạo bài thi và ca thi thành công!");
      // reset form
      setShowExamModal(false);
      setExamName("");
      setExamCode("");
      setExamStartTime("");
      setExamDuration("");
      setSessions([{ start_time: "", duration: "", room: "" }]);
      // refresh exams list for current class
      handleOpenClassDetail(currentClass);
    } catch (err) {
      console.error(err);
      notifyError("Lỗi khi tạo bài thi!");
    }
  };

  // Handlers for sessions inside create-exam modal
  const updateSessionField = (index, field, value) => {
    const copy = [...sessions];
    copy[index] = { ...copy[index], [field]: value };
    setSessions(copy);
  };
  const addSessionRow = () =>
    setSessions((prev) => [
      ...prev,
      { start_time: "", duration: "", room: "" },
    ]);
  const removeSessionRow = (index) => {
    const copy = [...sessions];
    copy.splice(index, 1);
    setSessions(
      copy.length ? copy : [{ start_time: "", duration: "", room: "" }]
    );
  };

  // -------------------------------
  // Exam detail & sessions
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

  // Add session from exam detail
  const handleAddSessionToExam = async () => {
    if (!newSessionForm.start_time || !newSessionForm.duration)
      return notifyError("Vui lòng nhập thời gian và thời lượng ca thi!");
    try {
      const res = await createExamSession({
        exam_id: examDetail._id,
        name: `Ca thi ${examSessions.length + 1}`,
        start_time: newSessionForm.start_time,
        duration: Number(newSessionForm.duration),
        // room: newSessionForm.room || ""
      });
      if (res.success == true) {
        notifySuccess("Thêm ca thi thành công!");
        setShowAddSessionModal(false);
        setNewSessionForm({ start_time: "", duration: "", room: "" });
        // refresh sessions
        const data = await getExamSessions({ exam_id: res?.session.exam_id });
        setExamSessions(data?.sessions || []);
      } else notifyError("Không thêm được ca thi!");
    } catch (err) {
      console.error(err);
      notifyError("Lỗi khi thêm ca thi!");
    }
  };

  // -------------------------------
  // Add students to session
  // -------------------------------
  const openAddStudentsToSession = async ({ session, exam }) => {
    setTargetSessionForStudents(session);
    try {
      const data = await getStudentsNotInSession({
        session_id: session._id,
        class_id: exam.class_id,
      });
      // setStudents(data?.students || []);
      setStudentNotInSession(data?.students || []);
      setSelectedStudentsForSession([]);
      setShowAddStudentsToSessionModal(true);
    } catch (err) {
      console.error(err);
      notifyError("Không thể tải danh sách sinh viên!");
    }
  };

  const toggleStudentSelectionForSession = (stu) => {
    setSelectedStudentsForSession((prev) =>
      prev.includes(stu._id)
        ? prev.filter((id) => id !== stu._id)
        : [...prev, stu._id]
    );
  };

  const handleAddStudentsToSession = async () => {
    if (!selectedStudentsForSession.length)
      return notifyError("Vui lòng chọn sinh viên!");
    try {
      const res = await addStudentsToExamSession({
        session_id: targetSessionForStudents._id,
        student_ids: selectedStudentsForSession,
      });
      if (res && res.success) {
        notifySuccess("Đã thêm sinh viên vào ca thi!");
        setShowAddStudentsToSessionModal(false);
        // refresh sessions list (to update counts if backend returns such info)
        const data = await getExamSessions({ exam_id: examDetail._id });
        setExamSessions(data?.sessions || []);
      } else notifyError("Thêm sinh viên vào ca thi thất bại!");
    } catch (err) {
      console.error(err);
      notifyError("Lỗi khi thêm sinh viên vào ca thi!");
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
    const now = Date.now();
    const start = new Date(session.start_time).getTime();
    const end = start + session.duration * 60 * 1000;

    if (now >= start && now <= end) return "active"; // đang diễn ra
    if (now < start) return "soon"; // chưa đến giờ
    if (now > end) return "done"; // đã kết thúc
    return "";
  };

  console.log(examDetail)

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
            <button onClick={() => {navigate("/")}} className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột 1 — Danh sách lớp */}
          <div className="bg-white shadow-lg rounded-xl p-5 max-h-[80vh]">
            {userInfo.role === "teacher" && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowCreateClassModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
                >
                  <FaPlus /> Tạo lớp học
                </button>
              </div>
            )}
            <h2 className="text-xl font-bold mb-4 text-indigo-600">
              Danh sách lớp học
            </h2>
            {classes.length === 0 ? (
              <p className="text-center text-gray-500">Chưa có lớp học nào.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto ">
                {classes.map((cls) => (
                  <div
                    key={cls._id}
                    className="p-4 rounded-lg border hover:shadow-md hover:border-indigo-300 transition bg-white"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold text-gray-800">
                          {cls.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Mã lớp:{" "}
                          <span className="font-semibold">{cls.code}</span>
                        </p>
                        {cls.visibility === "public" ? (
                          <p className="flex items-center gap-1 text-green-600 text-sm">
                            <MdOutlineVisibility /> Công khai
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-yellow-600 text-sm">
                            <MdOutlineVisibilityOff /> Riêng tư
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenClassDetail(cls)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            <FaRegCalendarAlt /> Chi tiết
                          </button>
                          <button
                            onClick={() => handleOpenClassDetail(cls)}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            Lịch thi
                          </button>
                        </div>
                        {userInfo.role === "teacher" ? (
                          <button
                            onClick={() => handleOpenStudentModal(cls)}
                            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            <FaUserPlus /> Sinh viên
                          </button>
                        ) : cls.students?.includes(userInfo._id) ? (
                          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-center text-sm">
                            Đã tham gia
                          </div>
                        ) : (
                          <button
                            onClick={() => handleJoinClass(cls)}
                            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            <FaDoorOpen /> Tham gia
                          </button>
                        )}
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
                  Chi tiết lớp: {currentClass.name}
                </h2>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <FaRegCalendarAlt /> Bài thi
                  </h3>
                  {userInfo.role === "teacher" && (
                    <button
                      onClick={() => setShowExamModal(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      <FaPlus /> Tạo bài thi
                    </button>
                  )}
                </div>

                {exams.length === 0 ? (
                  <p className="text-gray-500">Chưa có bài thi nào.</p>
                ) : (
                  <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {exams.map((ex) => {
                      const status = getExamStatus(ex);
                      return (
                        <li
                          key={ex._id}
                          className="p-4 border rounded-lg hover:shadow transition flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold">{ex.name}</p>
                            <p className="text-sm text-gray-500">
                              Mã: {ex.code}
                            </p>
                            <p className="text-sm text-gray-400">
                              {ex.start_time
                                ? new Date(ex.start_time).toLocaleString(
                                    "vi-VN"
                                  )
                                : ""}{" "}
                              — {ex.duration} phút
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openExamDetail(ex)}
                              className="text-indigo-600 underline text-sm"
                            >
                              Chi tiết bài thi
                            </button>
                            {/* {status === "active" && (
                              <button
                                onClick={() =>
                                  navigate(`/teacher_live?exam=${ex.code}`)
                                }
                                className="flex items-center gap-2 cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl shadow-md transition-all"
                              >
                                <FaPlay className="text-sm" />
                                Vào giám sát
                              </button>
                            )}
                            {status === "soon" && (
                              <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border border-gray-300 shadow-sm">
                                <FaClock className="text-gray-500" />
                                Chưa đến giờ thi
                              </span>
                            )}
                            {status === "done" && (
                              <span className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 shadow-sm">
                                <FaCheckCircle className="text-red-600" />
                                Đã kết thúc
                              </span>
                            )} */}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal tạo lớp */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 relative">
            <button
              onClick={() => setShowCreateClassModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Tạo lớp học mới</h2>
            <form onSubmit={handleCreateClass} className="flex flex-col gap-3">
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Tên lớp"
                className="border px-3 py-2 rounded-lg w-full"
              />
              <input
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="Mã lớp"
                className="border px-3 py-2 rounded-lg w-full"
              />
              <select
                value={classVisibility}
                onChange={(e) => setClassVisibility(e.target.value)}
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option value="public">Công khai</option>
                <option value="private">Riêng tư</option>
              </select>
              {classVisibility === "private" && (
                <input
                  value={classPassword}
                  onChange={(e) => setClassPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="border px-3 py-2 rounded-lg w-full"
                />
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Tạo lớp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal thêm sinh viên (vào lớp) */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-156 relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Thêm sinh viên cho {currentClass.name}
            </h2>
            <ul className="max-h-64 overflow-y-auto space-y-2">
              {students.map((stu) => (
                <li
                  key={stu._id}
                  className="flex items-center justify-between border rounded px-3 py-2"
                >
                  <span>
                    Họ và tên: {stu.name} - Mã sinh viên: {stu.student_id}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(stu._id)}
                    onChange={() => toggleStudentSelection(stu)}
                  />
                </li>
              ))}
            </ul>
            <button
              onClick={handleAddStudents}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Thêm sinh viên
            </button>
          </div>
        </div>
      )}

      {/* Modal tạo bài thi (mở rộng: có thể thêm nhiều ca thi) */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-[640px] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowExamModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Tạo bài thi</h2>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-3">
              <input
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="Tên bài thi"
                className="border px-3 py-2 rounded-lg w-full"
              />
              <input
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                placeholder="Mã bài thi"
                className="border px-3 py-2 rounded-lg w-full"
              />

              {/* Sessions list */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Ca thi</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addSessionRow}
                      className="px-3 py-1 rounded bg-green-500 text-white text-sm flex items-center gap-2"
                    >
                      <FaPlus /> Thêm ca thi
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {sessions.map((ses, idx) => (
                    <div key={idx} className="border p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Ca {idx + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeSessionRow(idx)}
                          className="text-sm text-red-600"
                        >
                          Xóa
                        </button>
                      </div>

                      <input
                        type="datetime-local"
                        className="border px-3 py-2 rounded-lg w-full mb-2"
                        value={ses.start_time}
                        onChange={(e) =>
                          updateSessionField(idx, "start_time", e.target.value)
                        }
                      />

                      <input
                        type="number"
                        className="border px-3 py-2 rounded-lg w-full mb-2"
                        placeholder="Thời lượng (phút)"
                        value={ses.duration}
                        onChange={(e) =>
                          updateSessionField(idx, "duration", e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-lg border"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Tạo bài thi & ca thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Chi tiết bài thi: {examDetail.name}
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
                              ? new Date(s.start_time).toLocaleString("vi-VN")
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
                            onClick={() =>
                              openAddStudentsToSession({
                                session: s,
                                exam: examDetail,
                              })
                            }
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                          >
                            Thêm sinh viên
                          </button>
                          <button
                            onClick={() => handleViewStudentsInSession(s)}
                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
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
                onClick={() => setShowAddSessionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaPlus /> Thêm ca thi
              </button>
              <button
                onClick={() => setShowExamDetailModal(false)}
                className="px-4 py-2 rounded-lg border"
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

      {/* Modal thêm ca thi cho bài thi (từ chi tiết bài thi) */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 relative">
            <button
              onClick={() => setShowAddSessionModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Thêm ca thi cho {examDetail?.name}
            </h2>
            <div className="flex flex-col gap-3">
              <input
                type="datetime-local"
                value={newSessionForm.start_time}
                onChange={(e) =>
                  setNewSessionForm((prev) => ({
                    ...prev,
                    start_time: e.target.value,
                  }))
                }
                className="border px-3 py-2 rounded-lg w-full"
              />
              <input
                type="number"
                value={newSessionForm.duration}
                onChange={(e) =>
                  setNewSessionForm((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                placeholder="Thời lượng (phút)"
                className="border px-3 py-2 rounded-lg w-full"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 rounded border"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddSessionToExam}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Thêm ca thi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm sinh viên vào ca thi */}
      {showAddStudentsToSessionModal && targetSessionForStudents && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-156  relative">
            <button
              onClick={() => setShowAddStudentsToSessionModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Thêm sinh viên vào ca thi
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Ca:{" "}
              {targetSessionForStudents.start_time
                ? new Date(targetSessionForStudents.start_time).toLocaleString(
                    "vi-VN"
                  )
                : "-"}
            </p>

            <ul className="max-h-64 overflow-y-auto space-y-2">
              {studentNotInSession.map((stu) => (
                <li
                  key={stu._id}
                  className="flex items-center justify-between border rounded px-3 py-2"
                >
                  <span>
                    Tên sinh viên: {stu.name} - Mã sinh viên: {stu.student_id}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedStudentsForSession.includes(stu._id)}
                    onChange={() => toggleStudentSelectionForSession(stu)}
                  />
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddStudentsToSessionModal(false)}
                className="px-4 py-2 rounded border"
              >
                Hủy
              </button>
              <button
                onClick={handleAddStudentsToSession}
                className="px-4 py-2 bg-purple-600 text-white rounded"
              >
                Thêm sinh viên
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
