// Final

// import { useState, useEffect } from "react";
// import { useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";
// import {
//   getClasses,
//   createClass,
//   getStudents,
//   addStudentsToClass,
//   getExamsByClass,
//   createExam,
//   joinClass, // API mới cho học sinh tham gia lớp
// } from "../services/services";

// export default function ClassDashboard() {
//   const { userInfo } = useSelector((state) => state.user);
//   const navigate = useNavigate();

//   // ====== State quản lý lớp học ======
//   const [classes, setClasses] = useState([]);
//   const [showCreateClassModal, setShowCreateClassModal] = useState(false);
//   const [className, setClassName] = useState("");
//   const [classCode, setClassCode] = useState(""); // mã lớp do giảng viên nhập
//   const [classVisibility, setClassVisibility] = useState("public"); // public/private
//   const [classPassword, setClassPassword] = useState("");

//   // ====== State chi tiết lớp ======
//   const [currentClass, setCurrentClass] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [selectedStudents, setSelectedStudents] = useState([]);
//   const [showStudentModal, setShowStudentModal] = useState(false);

//   // ====== State quản lý lịch thi ======
//   const [exams, setExams] = useState([]);
//   const [showExamModal, setShowExamModal] = useState(false);
//   const [examName, setExamName] = useState("");
//   const [examCode, setExamCode] = useState("");
//   const [examStartTime, setExamStartTime] = useState("");
//   const [examDuration, setExamDuration] = useState("");

//   // ====== Thông báo ======
//   const notifySuccess = (msg) => toast.success(msg);
//   const notifyError = (msg) => toast.error(msg);

//   // ====== Lấy danh sách lớp ======
//   useEffect(() => {
//     if (userInfo?._id) fetchClasses();
//   }, [userInfo]);

//   const fetchClasses = async () => {
//     try {
//       const data = await getClasses({
//         user_id: userInfo._id,
//         role: userInfo.role,
//       });

//       console.log("log", data);
//       setClasses(data?.classes || []);
//     } catch {
//       notifyError("Không thể tải danh sách lớp học!");
//     }
//   };

//   const getExamStatus = (exam) => {
//     const now = Date.now();
//     const start = new Date(exam.start_time).getTime();
//     const end = start + exam.duration * 60 * 1000;

//     if (now >= start - 15 * 60 * 1000 && now <= end) {
//       return "Vào giám sát";
//     }

//     if (now < start - 15 * 60 * 1000) return "Chưa đến giờ thi";
//     if (now > end) return "Đã kết thúc";

//     return "";
//   };

//   // ====== Tạo lớp mới ======
//   const handleCreateClass = async (e) => {
//     e.preventDefault();
//     if (
//       !className.trim() ||
//       !classCode.trim() ||
//       (classVisibility === "private" && !classPassword.trim())
//     ) {
//       notifyError("Vui lòng nhập đầy đủ thông tin lớp học!");
//       return;
//     }
//     try {
//       const success = await createClass({
//         name: className,
//         code: classCode, // gửi mã lớp do giảng viên nhập
//         teacher_id: userInfo._id,
//         visibility: classVisibility,
//         password: classVisibility === "private" ? classPassword : "",
//       });
//       if (success) {
//         notifySuccess("✅ Tạo lớp học thành công!");
//         setShowCreateClassModal(false);
//         setClassName("");
//         setClassCode("");
//         setClassPassword("");
//         fetchClasses();
//       } else {
//         notifyError("❌ Lớp học đã tồn tại!");
//       }
//     } catch {
//       notifyError("Không thể tạo lớp học!");
//     }
//   };

//   // ====== Mở modal thêm sinh viên ======
//   const handleOpenStudentModal = async (cls) => {
//     setCurrentClass(cls);
//     try {
//       const data = await getStudents({});
//       //    const data = await getStudents({ teacher_id: currentUser.id }); Lấy ra những sinh viên thuộc lớp của giảng viên
//       setStudents(data?.students || []);
//       setSelectedStudents([]);
//       setShowStudentModal(true);
//     } catch {
//       notifyError("Không thể tải danh sách sinh viên!");
//     }
//   };

//   const toggleStudentSelection = (student) => {
//     if (selectedStudents.includes(student._id)) {
//       setSelectedStudents(selectedStudents.filter((id) => id !== student._id));
//     } else {
//       setSelectedStudents([...selectedStudents, student._id]);
//     }
//   };

//   const handleAddStudents = async () => {
//     if (!selectedStudents.length) {
//       notifyError("Vui lòng chọn ít nhất 1 sinh viên!");
//       return;
//     }
//     try {
//       const res = await addStudentsToClass({
//         class_id: currentClass._id,
//         student_ids: selectedStudents,
//       });
//       console.log("log", res);
//       if (res.success) {
//         notifySuccess("✅ Thêm sinh viên vào lớp thành công!");
//         setShowStudentModal(false);
//         fetchClasses();
//       } else {
//         notifyError("❌ Thêm sinh viên thất bại!");
//       }
//     } catch {
//       notifyError("Lỗi khi thêm sinh viên!");
//     }
//   };

//   // ====== Học sinh tham gia lớp ======
//   const handleJoinClass = async (cls) => {
//     if (cls.visibility === "private") {
//       const password = prompt("Nhập mật khẩu lớp học:");
//       if (!password) return;
//       try {
//         const res = await joinClass(cls._id, userInfo._id, password);
//         if (res.success) {
//           notifySuccess("✅ Tham gia lớp thành công!");
//           fetchClasses();
//         } else {
//           notifyError("❌ Sai mật khẩu!");
//         }
//       } catch {
//         notifyError("Không thể tham gia lớp học!");
//       }
//     } else {
//       try {
//         const res = await joinClass(cls._id, userInfo._id);
//         if (res.success) {
//           notifySuccess("✅ Tham gia lớp thành công!");
//           fetchClasses();
//         }
//       } catch {
//         notifyError("Không thể tham gia lớp học!");
//       }
//     }
//   };

//   // ====== Mở chi tiết lớp ======
//   const handleOpenClassDetail = async (cls) => {
//     setCurrentClass(cls);
//     try {
//       console.log("classid", cls);
//       const data = await getExamsByClass({ class_id: cls._id });
//       console.log("log", data);
//       setExams(data?.exams || []);
//     } catch {
//       notifyError("Không thể tải lịch thi!");
//     }
//   };

//   // ====== Tạo lịch thi ======
//   const handleCreateExam = async (e) => {
//     e.preventDefault();
//     if (!currentClass) {
//       notifyError("Chưa chọn lớp học!");
//       return;
//     }
//     if (!examName || !examCode || !examStartTime || !examDuration) {
//       notifyError("Vui lòng nhập đầy đủ thông tin lịch thi!");
//       return;
//     }
//     try {
//       const success = await createExam({
//         class_id: currentClass._id,
//         name: examName,
//         code: examCode,
//         start_time: examStartTime,
//         duration: Number(examDuration),
//         created_by: userInfo._id,
//       });
//       if (success) {
//         notifySuccess("✅ Tạo lịch thi thành công!");
//         setShowExamModal(false);
//         setExamName("");
//         setExamCode("");
//         setExamStartTime("");
//         setExamDuration("");
//         handleOpenClassDetail(currentClass);
//       } else {
//         notifyError("❌ Lịch thi đã tồn tại!");
//       }
//     } catch {
//       notifyError("Không thể tạo lịch thi!");
//     }
//   };

//   return (
//     <div className="min-h-screen p-8 bg-gray-100">
//       <h1 className="text-2xl font-bold text-center mb-6">
//         🎓 Quản lý lớp học
//       </h1>

//       {/* Danh sách lớp học */}
//       {userInfo.role === "teacher" && (
//         <div className="flex justify-end mb-4">
//           <button
//             onClick={() => setShowCreateClassModal(true)}
//             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
//           >
//             ➕ Tạo lớp học
//           </button>
//         </div>
//       )}

//       <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-4">
//         {classes.length === 0 ? (
//           <p className="text-center text-gray-500">Chưa có lớp học nào.</p>
//         ) : (
//           <ul className="divide-y divide-gray-200">
//             {classes.map((cls) => (
//               <li
//                 key={cls._id}
//                 className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition"
//               >
//                 <div>
//                   <p className="font-medium">{cls.name}</p>
//                   <p className="text-sm text-gray-500">
//                     {cls.visibility === "public" ? "Công khai" : "Riêng tư"} |
//                     Mã lớp: {cls.code}
//                   </p>
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => handleOpenClassDetail(cls)}
//                     className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg"
//                   >
//                     📋 Chi tiết
//                   </button>

//                   {userInfo.role === "teacher" ? (
//                     <button
//                       onClick={() => handleOpenStudentModal(cls)}
//                       className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg"
//                     >
//                       ➕ Sinh viên
//                     </button>
//                   ) : cls.students?.includes(userInfo._id) ? (
//                     <span className="px-3 py-1 rounded-lg bg-gray-200 text-gray-600">
//                       Đã tham gia
//                     </span>
//                   ) : (
//                     <button
//                       onClick={() => handleJoinClass(cls)}
//                       className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg"
//                     >
//                       🏃 Tham gia lớp
//                     </button>
//                   )}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Modal tạo lớp */}
//       {showCreateClassModal && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
//           <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
//             <h2 className="text-xl font-semibold mb-4 text-center">
//               ➕ Tạo lớp học mới
//             </h2>
//             <form onSubmit={handleCreateClass} className="space-y-4">
//               <input
//                 type="text"
//                 placeholder="Tên lớp"
//                 value={className}
//                 onChange={(e) => setClassName(e.target.value)}
//                 className="border rounded-lg p-2 w-full"
//               />
//               <input
//                 type="text"
//                 placeholder="Mã lớp"
//                 value={classCode}
//                 onChange={(e) => setClassCode(e.target.value)}
//                 className="border rounded-lg p-2 w-full"
//               />
//               <select
//                 value={classVisibility}
//                 onChange={(e) => setClassVisibility(e.target.value)}
//                 className="border rounded-lg p-2 w-full"
//               >
//                 <option value="public">Công khai (public)</option>
//                 <option value="private">Riêng tư (private)</option>
//               </select>
//               {classVisibility === "private" && (
//                 <input
//                   type="text"
//                   placeholder="Mật khẩu / Mã bảo vệ"
//                   value={classPassword}
//                   onChange={(e) => setClassPassword(e.target.value)}
//                   className="border rounded-lg p-2 w-full"
//                 />
//               )}
//               <div className="flex justify-end space-x-2 mt-4">
//                 <button
//                   type="button"
//                   onClick={() => setShowCreateClassModal(false)}
//                   className="bg-gray-300 px-4 py-2 rounded-lg"
//                 >
//                   ❌ Hủy
//                 </button>
//                 <button
//                   type="submit"
//                   className="bg-blue-500 text-white px-4 py-2 rounded-lg"
//                 >
//                   ✅ Tạo lớp
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Modal thêm sinh viên */}
//       {showStudentModal && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
//           <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-lg max-h-[80vh] overflow-y-auto">
//             <h2 className="text-xl font-semibold mb-4 text-center">
//               ➕ Thêm sinh viên vào {currentClass?.name}
//             </h2>
//             <ul className="divide-y divide-gray-200 mb-4">
//               {students.map((stu) => (
//                 <li
//                   key={stu._id}
//                   className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 transition"
//                 >
//                   <div>
//                     <p className="font-medium">{stu.name}</p>
//                     <p className="text-sm text-gray-500">{stu.student_id}</p>
//                   </div>
//                   <input
//                     type="checkbox"
//                     checked={selectedStudents.includes(stu._id)}
//                     onChange={() => toggleStudentSelection(stu)}
//                   />
//                 </li>
//               ))}
//             </ul>
//             <div className="flex justify-end space-x-2">
//               <button
//                 type="button"
//                 onClick={() => setShowStudentModal(false)}
//                 className="bg-gray-300 px-4 py-2 rounded-lg"
//               >
//                 ❌ Hủy
//               </button>
//               <button
//                 type="button"
//                 onClick={handleAddStudents}
//                 className="bg-purple-500 text-white px-4 py-2 rounded-lg"
//               >
//                 ✅ Thêm sinh viên
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Chi tiết lớp - quản lý lịch thi */}
//       {currentClass && (
//         <div className="mt-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md p-4">
//           <h2 className="text-lg font-semibold mb-4">
//             📋 Chi tiết lớp: {currentClass.name}
//           </h2>

//           <div className="flex justify-between mb-4">
//             <h3 className="font-medium">Lịch thi</h3>
//             {userInfo.role === "teacher" && (
//               <button
//                 onClick={() => setShowExamModal(true)}
//                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
//               >
//                 ➕ Tạo lịch thi
//               </button>
//             )}
//           </div>

//           {/* {exams.length === 0 ? (
//             <p className="text-gray-500">Chưa có lịch thi nào.</p>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {exams.map((ex) => (
//                 <li
//                   key={ex._id}
//                   className="py-2 px-2 flex justify-between hover:bg-gray-50 transition"
//                 >
//                   <div>
//                     <p className="font-medium">{ex.name}</p>
//                     <p className="text-sm text-gray-500">Mã: {ex.code}</p>
//                     <p className="text-sm text-gray-400">
//                       🕒{" "}
//                       {new Date(ex.start_time).toLocaleString("vi-VN", {
//                         dateStyle: "short",
//                         timeStyle: "short",
//                       })}{" "}
//                       ⏳ {ex.duration} phút
//                     </p>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )} */}

//           {exams.length === 0 ? (
//             <p className="text-gray-500">Chưa có lịch thi nào.</p>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {exams.map((ex) => {
//                 const status = getExamStatus(ex);
//                 return (
//                   <li
//                     key={ex._id}
//                     className="py-2 px-2 flex justify-between hover:bg-gray-50 transition"
//                   >
//                     <div>
//                       <p className="font-medium">{ex.name}</p>
//                       <p className="text-sm text-gray-500">Mã: {ex.code}</p>
//                       <p className="text-sm text-gray-400">
//                         🕒{" "}
//                         {new Date(ex.start_time).toLocaleString("vi-VN", {
//                           dateStyle: "short",
//                           timeStyle: "short",
//                         })}{" "}
//                         ⏳ {ex.duration} phút
//                       </p>
//                     </div>

//                     {status && (
//                       <span
//                         onClick={() => {
//                           if (status === "Vào giám sát") {
//                             navigate(`/teacher_live?exam=${ex.code}`); // 👉 chuyển hướng tới trang dashboard
//                           }
//                         }}
//                         className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition ${
//                           status === "Vào giám sát"
//                             ? "bg-green-100 text-green-800 hover:bg-green-200"
//                             : status === "Chưa đến giờ thi"
//                             ? "bg-gray-100 text-gray-500 cursor-default"
//                             : "bg-red-100 text-red-800 cursor-default"
//                         }`}
//                       >
//                         {status}
//                       </span>
//                     )}
//                   </li>
//                 );
//               })}
//             </ul>
//           )}

//           {/* Modal tạo lịch thi */}
//           {showExamModal && (
//             <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
//               <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
//                 <h2 className="text-xl font-semibold mb-4 text-center">
//                   ➕ Tạo lịch thi
//                 </h2>
//                 <form onSubmit={handleCreateExam} className="space-y-4">
//                   <input
//                     type="text"
//                     placeholder="Mã lịch thi"
//                     value={examCode}
//                     onChange={(e) => setExamCode(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                   />
//                   <input
//                     type="text"
//                     placeholder="Tên lịch thi"
//                     value={examName}
//                     onChange={(e) => setExamName(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                   />
//                   <input
//                     type="datetime-local"
//                     value={examStartTime}
//                     onChange={(e) => setExamStartTime(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                   />
//                   <input
//                     type="number"
//                     min="1"
//                     placeholder="Thời lượng (phút)"
//                     value={examDuration}
//                     onChange={(e) => setExamDuration(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                   />
//                   <div className="flex justify-end space-x-2 mt-4">
//                     <button
//                       type="button"
//                       onClick={() => setShowExamModal(false)}
//                       className="bg-gray-300 px-4 py-2 rounded-lg"
//                     >
//                       ❌ Hủy
//                     </button>
//                     <button
//                       type="submit"
//                       className="bg-blue-500 text-white px-4 py-2 rounded-lg"
//                     >
//                       ✅ Tạo lịch thi
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       <Toaster position="top-right" />
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { LogOut, GraduationCap } from "lucide-react";
import { FaPlay, FaClock, FaCheckCircle, FaPlus, FaUserPlus, FaDoorOpen, FaRegCalendarAlt } from "react-icons/fa";
import { MdOutlineVisibility, MdOutlineVisibilityOff, MdClose } from "react-icons/md";
import {
  getClasses,
  createClass,
  getStudents,
  addStudentsToClass,
  getExamsByClass,
  createExam,
  joinClass,
} from "../services/services";

export default function ClassDashboard() {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classVisibility, setClassVisibility] = useState("public");
  const [classPassword, setClassPassword] = useState("");

  const [currentClass, setCurrentClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);

  const [exams, setExams] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examStartTime, setExamStartTime] = useState("");
  const [examDuration, setExamDuration] = useState("");

  const notifySuccess = (msg) => toast.success(msg);
  const notifyError = (msg) => toast.error(msg);

  useEffect(() => { if (userInfo?._id) fetchClasses(); }, [userInfo]);

  const fetchClasses = async () => {
    try {
      const data = await getClasses({ user_id: userInfo._id, role: userInfo.role });
      setClasses(data?.classes || []);
    } catch { notifyError("Không thể tải danh sách lớp học!"); }
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
    if (!className.trim() || !classCode.trim()) return notifyError("Vui lòng nhập đầy đủ thông tin!");
    try {
      const success = await createClass({ name: className, code: classCode, teacher_id: userInfo._id, visibility: classVisibility, password: classVisibility === "private" ? classPassword : "" });
      if (success) {
        notifySuccess("Tạo lớp thành công!");
        setShowCreateClassModal(false); setClassName(""); setClassCode(""); setClassPassword(""); fetchClasses();
      } else notifyError("❌ Lớp học đã tồn tại!");
    } catch { notifyError("Lỗi khi tạo lớp học!"); }
  };

  const handleOpenStudentModal = async (cls) => {
    setCurrentClass(cls);
    try {
      const data = await getStudents({});
      setStudents(data?.students || []);
      setSelectedStudents([]);
      setShowStudentModal(true);
    } catch { notifyError("Không thể tải danh sách sinh viên!"); }
  };

  const toggleStudentSelection = (stu) => {
    setSelectedStudents(prev => prev.includes(stu._id) ? prev.filter(id => id !== stu._id) : [...prev, stu._id]);
  };

  const handleAddStudents = async () => {
    if (!selectedStudents.length) return notifyError("Vui lòng chọn sinh viên!");
    try {
      const res = await addStudentsToClass({ class_id: currentClass._id, student_ids: selectedStudents });
      if (res.success) { notifySuccess("Thêm sinh viên thành công!"); setShowStudentModal(false); fetchClasses(); }
    } catch { notifyError("Lỗi khi thêm sinh viên!"); }
  };

  const handleJoinClass = async (cls) => {
    if (cls.visibility === "private") {
      const pass = prompt("Nhập mật khẩu lớp:"); if (!pass) return;
      try { const res = await joinClass(cls._id, userInfo._id, pass); res.success ? notifySuccess("Tham gia thành công!") : notifyError("Sai mật khẩu!"); fetchClasses(); } catch { notifyError("Không thể tham gia lớp!"); }
    } else {
      try { const res = await joinClass(cls._id, userInfo._id); res.success && notifySuccess("Đã tham gia lớp!"); fetchClasses(); } catch { notifyError("Không thể tham gia lớp!"); }
    }
  };

  const handleOpenClassDetail = async (cls) => {
    setCurrentClass(cls);
    try { const data = await getExamsByClass({ class_id: cls._id }); setExams(data?.exams || []); } catch { notifyError("Không thể tải lịch thi!"); }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examName || !examCode || !examDuration || !examStartTime) return notifyError("Vui lòng nhập đầy đủ!");
    try {
      const success = await createExam({ class_id: currentClass._id, name: examName, code: examCode, start_time: examStartTime, duration: Number(examDuration), created_by: userInfo._id });
      if (success) { notifySuccess("Tạo lịch thi thành công!"); setShowExamModal(false); setExamName(""); setExamCode(""); setExamStartTime(""); setExamDuration(""); handleOpenClassDetail(currentClass); }
    } catch { notifyError("Lỗi khi tạo lịch thi!"); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/student_dashboard" className="font-bold text-2xl text-indigo-600 flex items-center gap-2"><GraduationCap size={28} /> Smart Exam</Link>
          <div className="flex items-center gap-6 text-gray-700 font-medium">
            <Link to="/student_dashboard" className="hover:text-indigo-600 transition">Trang chủ</Link>
            <Link to="/violation_history" className="hover:text-indigo-600 transition">Lịch sử vi phạm</Link>
            <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"><LogOut size={18} /> Đăng xuất</button>
          </div>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột 1 — Danh sách lớp */}
          <div className="bg-white shadow-lg rounded-xl p-5 max-h-[80vh] overflow-y-auto">
            {userInfo.role === "teacher" && (
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowCreateClassModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"><FaPlus /> Tạo lớp học</button>
              </div>
            )}
            <h2 className="text-xl font-bold mb-4 text-indigo-600">Danh sách lớp học</h2>
            {classes.length === 0 ? (
              <p className="text-center text-gray-500">Chưa có lớp học nào.</p>
            ) : (
              <div className="space-y-3">
                {classes.map(cls => (
                  <div key={cls._id} className="p-4 rounded-lg border hover:shadow-md hover:border-indigo-300 transition bg-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold text-gray-800">{cls.name}</p>
                        <p className="text-sm text-gray-500 mt-1">Mã lớp: <span className="font-semibold">{cls.code}</span></p>
                        {cls.visibility === "public" ? <p className="flex items-center gap-1 text-green-600 text-sm"><MdOutlineVisibility /> Công khai</p> : <p className="flex items-center gap-1 text-yellow-600 text-sm"><MdOutlineVisibilityOff /> Riêng tư</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleOpenClassDetail(cls)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"><FaRegCalendarAlt /> Chi tiết</button>
                        {userInfo.role === "teacher" ? (
                          <button onClick={() => handleOpenStudentModal(cls)} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"><FaUserPlus /> Sinh viên</button>
                        ) : cls.students?.includes(userInfo._id) ? (
                          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-center text-sm">Đã tham gia</div>
                        ) : (
                          <button onClick={() => handleJoinClass(cls)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm"><FaDoorOpen /> Tham gia</button>
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
              <p className="text-gray-400 text-center mt-10">Chọn một lớp để xem chi tiết.</p>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Chi tiết lớp: {currentClass.name}</h2>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg flex items-center gap-2"><FaRegCalendarAlt /> Lịch thi</h3>
                  {userInfo.role === "teacher" && (
                    <button onClick={() => setShowExamModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><FaPlus /> Tạo lịch thi</button>
                  )}
                </div>

                {exams.length === 0 ? <p className="text-gray-500">Chưa có lịch thi.</p> : (
                  <ul className="space-y-3">
                    {exams.map(ex => {
                      const status = getExamStatus(ex);
                      return (
                        <li key={ex._id} className="p-4 border rounded-lg hover:shadow transition flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{ex.name}</p>
                            <p className="text-sm text-gray-500">Mã: {ex.code}</p>
                            <p className="text-sm text-gray-400">{new Date(ex.start_time).toLocaleString("vi-VN")} — {ex.duration} phút</p>
                          </div>
                          {status === "active" && <button onClick={() => navigate(`/teacher_live?exam=${ex.code}`)} className="flex items-center gap-2 cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl shadow-md transition-all"><FaPlay className="text-sm" />Vào giám sát</button>}
                          {status === "soon" && <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border border-gray-300 shadow-sm"><FaClock className="text-gray-500" />Chưa đến giờ thi</span>}
                          {status === "done" && <span className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 shadow-sm"><FaCheckCircle className="text-red-600" />Đã kết thúc</span>}
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
            <button onClick={() => setShowCreateClassModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
            <h2 className="text-xl font-semibold mb-4">Tạo lớp học mới</h2>
            <form onSubmit={handleCreateClass} className="flex flex-col gap-3">
              <input value={className} onChange={e => setClassName(e.target.value)} placeholder="Tên lớp" className="border px-3 py-2 rounded-lg w-full"/>
              <input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Mã lớp" className="border px-3 py-2 rounded-lg w-full"/>
              <select value={classVisibility} onChange={e => setClassVisibility(e.target.value)} className="border px-3 py-2 rounded-lg w-full">
                <option value="public">Công khai</option>
                <option value="private">Riêng tư</option>
              </select>
              {classVisibility === "private" && <input value={classPassword} onChange={e => setClassPassword(e.target.value)} placeholder="Mật khẩu" className="border px-3 py-2 rounded-lg w-full"/>}
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Tạo lớp</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal thêm sinh viên */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-96 relative">
            <button onClick={() => setShowStudentModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
            <h2 className="text-xl font-semibold mb-4">Thêm sinh viên cho {currentClass.name}</h2>
            <ul className="max-h-64 overflow-y-auto space-y-2">
              {students.map(stu => (
                <li key={stu._id} className="flex items-center justify-between border rounded px-3 py-2">
                  <span>{stu.name}</span>
                  <input type="checkbox" checked={selectedStudents.includes(stu._id)} onChange={() => toggleStudentSelection(stu)} />
                </li>
              ))}
            </ul>
            <button onClick={handleAddStudents} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Thêm sinh viên</button>
          </div>
        </div>
      )}

      {/* Modal tạo lịch thi */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 relative">
            <button onClick={() => setShowExamModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><MdClose size={24} /></button>
            <h2 className="text-xl font-semibold mb-4">Tạo lịch thi</h2>
            <form onSubmit={handleCreateExam} className="flex flex-col gap-3">
              <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Tên bài thi" className="border px-3 py-2 rounded-lg w-full"/>
              <input value={examCode} onChange={e => setExamCode(e.target.value)} placeholder="Mã bài thi" className="border px-3 py-2 rounded-lg w-full"/>
              <input type="datetime-local" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} className="border px-3 py-2 rounded-lg w-full"/>
              <input type="number" value={examDuration} onChange={e => setExamDuration(e.target.value)} placeholder="Thời lượng (phút)" className="border px-3 py-2 rounded-lg w-full"/>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Tạo lịch thi</button>
            </form>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}


// import { useState, useEffect } from "react";
// import { useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";
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

//   // ====== State quản lý lớp học ======
//   const [classes, setClasses] = useState([]);
//   const [showCreateClassModal, setShowCreateClassModal] = useState(false);
//   const [className, setClassName] = useState("");
//   const [classCode, setClassCode] = useState("");
//   const [classVisibility, setClassVisibility] = useState("public");
//   const [classPassword, setClassPassword] = useState("");

//   // ====== State chi tiết lớp ======
//   const [currentClass, setCurrentClass] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [selectedStudents, setSelectedStudents] = useState([]);
//   const [showStudentModal, setShowStudentModal] = useState(false);

//   // ====== State quản lý lịch thi ======
//   const [exams, setExams] = useState([]);
//   const [showExamModal, setShowExamModal] = useState(false);
//   const [examName, setExamName] = useState("");
//   const [examCode, setExamCode] = useState("");
//   const [examStartTime, setExamStartTime] = useState("");
//   const [examDuration, setExamDuration] = useState("");

//   // ====== Thông báo ======
//   const notifySuccess = (msg) => toast.success(msg);
//   const notifyError = (msg) => toast.error(msg);

//   // ====== Lấy danh sách lớp ======
//   useEffect(() => {
//     if (userInfo?._id) fetchClasses();
//   }, [userInfo]);

//   const fetchClasses = async () => {
//     try {
//       const data = await getClasses({
//         user_id: userInfo._id,
//         role: userInfo.role,
//       });
//       setClasses(data?.classes || []);
//     } catch {
//       notifyError("Không thể tải danh sách lớp học!");
//     }
//   };

//   // ====== Tạo lớp mới ======
//   const handleCreateClass = async (e) => {
//     e.preventDefault();
//     if (
//       !className.trim() ||
//       !classCode.trim() ||
//       (classVisibility === "private" && !classPassword.trim())
//     ) {
//       notifyError("Vui lòng nhập đầy đủ thông tin lớp học!");
//       return;
//     }
//     try {
//       const success = await createClass({
//         name: className,
//         code: classCode,
//         teacher_id: userInfo._id,
//         visibility: classVisibility,
//         password: classVisibility === "private" ? classPassword : "",
//       });
//       if (success) {
//         notifySuccess("✅ Tạo lớp học thành công!");
//         setShowCreateClassModal(false);
//         setClassName("");
//         setClassCode("");
//         setClassPassword("");
//         fetchClasses();
//       } else {
//         notifyError("❌ Lớp học đã tồn tại!");
//       }
//     } catch {
//       notifyError("Không thể tạo lớp học!");
//     }
//   };

//   // ====== Mở modal thêm sinh viên ======
//   const handleOpenStudentModal = async (cls) => {
//     setCurrentClass(cls);
//     try {
//       const data = await getStudents({});
//       setStudents(data?.students || []);
//       setSelectedStudents([]);
//       setShowStudentModal(true);
//     } catch {
//       notifyError("Không thể tải danh sách sinh viên!");
//     }
//   };

//   const toggleStudentSelection = (student) => {
//     if (selectedStudents.includes(student._id)) {
//       setSelectedStudents(selectedStudents.filter((id) => id !== student._id));
//     } else {
//       setSelectedStudents([...selectedStudents, student._id]);
//     }
//   };

//   const handleAddStudents = async () => {
//     if (!selectedStudents.length) {
//       notifyError("Vui lòng chọn ít nhất 1 sinh viên!");
//       return;
//     }
//     try {
//       const res = await addStudentsToClass({
//         class_id: currentClass._id,
//         student_ids: selectedStudents,
//       });
//       if (res.success) {
//         notifySuccess("✅ Thêm sinh viên vào lớp thành công!");
//         setShowStudentModal(false);
//         fetchClasses();
//       } else {
//         notifyError("❌ Thêm sinh viên thất bại!");
//       }
//     } catch {
//       notifyError("Lỗi khi thêm sinh viên!");
//     }
//   };

//   // ====== Học sinh tham gia lớp ======
//   const handleJoinClass = async (cls) => {
//     if (cls.visibility === "private") {
//       const password = prompt("Nhập mật khẩu lớp học:");
//       if (!password) return;
//       try {
//         const res = await joinClass(cls._id, userInfo._id, password);
//         if (res.success) {
//           notifySuccess("✅ Tham gia lớp thành công!");
//           fetchClasses();
//         } else {
//           notifyError("❌ Sai mật khẩu!");
//         }
//       } catch {
//         notifyError("Không thể tham gia lớp học!");
//       }
//     } else {
//       try {
//         const res = await joinClass(cls._id, userInfo._id);
//         if (res.success) {
//           notifySuccess("✅ Tham gia lớp thành công!");
//           fetchClasses();
//         }
//       } catch {
//         notifyError("Không thể tham gia lớp học!");
//       }
//     }
//   };

//   // ====== Mở chi tiết lớp ======
//   const handleOpenClassDetail = async (cls) => {
//     setCurrentClass(cls);
//     try {
//       const data = await getExamsByClass({ class_id: cls._id });
//       setExams(data?.exams || []);
//     } catch {
//       notifyError("Không thể tải lịch thi!");
//     }
//   };

//   // ====== Tạo lịch thi ======
//   const handleCreateExam = async (e) => {
//     e.preventDefault();
//     if (!currentClass) {
//       notifyError("Chưa chọn lớp học!");
//       return;
//     }
//     if (!examName || !examCode || !examStartTime || !examDuration) {
//       notifyError("Vui lòng nhập đầy đủ thông tin lịch thi!");
//       return;
//     }
//     try {
//       const success = await createExam({
//         class_id: currentClass._id,
//         name: examName,
//         code: examCode,
//         start_time: examStartTime,
//         duration: Number(examDuration),
//         created_by: userInfo._id,
//       });
//       if (success) {
//         notifySuccess("✅ Tạo lịch thi thành công!");
//         setShowExamModal(false);
//         setExamName("");
//         setExamCode("");
//         setExamStartTime("");
//         setExamDuration("");
//         handleOpenClassDetail(currentClass);
//       } else {
//         notifyError("❌ Lịch thi đã tồn tại!");
//       }
//     } catch {
//       notifyError("Không thể tạo lịch thi!");
//     }
//   };

//   // ====== Hàm tính trạng thái thi ======
//   const getExamStatus = (exam) => {
//     const now = Date.now();
//     const start = new Date(exam.start_time).getTime();
//     const end = start + exam.duration * 60 * 1000;

//     if (now >= start - 15 * 60 * 1000 && now <= end) {
//       return "Vào giám sát";
//     }

//     if (now < start - 15 * 60 * 1000) return "Chưa đến giờ thi";
//     if (now > end) return "Đã kết thúc";

//     return "";
//   };

//   return (
//     <div className="min-h-screen p-8 bg-gray-100">
//       <h1 className="text-2xl font-bold text-center mb-6">
//         🎓 Quản lý lớp học
//       </h1>

//       {/* Danh sách lớp học */}
//       {userInfo.role === "teacher" && (
//         <div className="flex justify-end mb-4">
//           <button
//             onClick={() => setShowCreateClassModal(true)}
//             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
//           >
//             ➕ Tạo lớp học
//           </button>
//         </div>
//       )}

//       <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-4">
//         {classes.length === 0 ? (
//           <p className="text-center text-gray-500">Chưa có lớp học nào.</p>
//         ) : (
//           <ul className="divide-y divide-gray-200">
//             {classes.map((cls) => (
//               <li
//                 key={cls._id}
//                 className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition"
//               >
//                 <div>
//                   <p className="font-medium">{cls.name}</p>
//                   <p className="text-sm text-gray-500">
//                     {cls.visibility === "public" ? "Công khai" : "Riêng tư"} |
//                     Mã lớp: {cls.code}
//                   </p>
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => handleOpenClassDetail(cls)}
//                     className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg"
//                   >
//                     📋 Chi tiết
//                   </button>

//                   {userInfo.role === "teacher" ? (
//                     <button
//                       onClick={() => handleOpenStudentModal(cls)}
//                       className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg"
//                     >
//                       ➕ Sinh viên
//                     </button>
//                   ) : cls.students?.includes(userInfo._id) ? (
//                     <span className="px-3 py-1 rounded-lg bg-gray-200 text-gray-600">
//                       Đã tham gia
//                     </span>
//                   ) : (
//                     <button
//                       onClick={() => handleJoinClass(cls)}
//                       className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg"
//                     >
//                       🏃 Tham gia lớp
//                     </button>
//                   )}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Chi tiết lớp - quản lý lịch thi */}
//       {currentClass && (
//         <div className="mt-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md p-4">
//           <h2 className="text-lg font-semibold mb-4">
//             📋 Chi tiết lớp: {currentClass.name}
//           </h2>

//           <div className="flex justify-between mb-4">
//             <h3 className="font-medium">Lịch thi</h3>
//             {userInfo.role === "teacher" && (
//               <button
//                 onClick={() => setShowExamModal(true)}
//                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
//               >
//                 ➕ Tạo lịch thi
//               </button>
//             )}
//           </div>

//           {exams.length === 0 ? (
//             <p className="text-gray-500">Chưa có lịch thi nào.</p>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {exams.map((ex) => {
//                 const status = getExamStatus(ex);
//                 return (
//                   <li
//                     key={ex._id}
//                     className="py-2 px-2 flex justify-between hover:bg-gray-50 transition"
//                   >
//                     <div>
//                       <p className="font-medium">{ex.name}</p>
//                       <p className="text-sm text-gray-500">Mã: {ex.code}</p>
//                       <p className="text-sm text-gray-400">
//                         🕒{" "}
//                         {new Date(ex.start_time).toLocaleString("vi-VN", {
//                           dateStyle: "short",
//                           timeStyle: "short",
//                         })}{" "}
//                         ⏳ {ex.duration} phút
//                       </p>
//                     </div>

//                     {status && (
//                       <span
//                         onClick={() => {
//                           if (status === "Vào giám sát") {
//                             navigate(`/teacher_live?exam=${ex.code}`); // 👉 chuyển hướng tới trang dashboard
//                           }
//                         }}
//                         className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition ${
//                           status === "Vào giám sát"
//                             ? "bg-green-100 text-green-800 hover:bg-green-200"
//                             : status === "Chưa đến giờ thi"
//                             ? "bg-gray-100 text-gray-500 cursor-default"
//                             : "bg-red-100 text-red-800 cursor-default"
//                         }`}
//                       >
//                         {status}
//                       </span>
//                     )}
//                   </li>
//                 );
//               })}
//             </ul>
//           )}
//         </div>
//       )}

//       <Toaster position="top-right" />
//     </div>
//   );
// }
