// Final

// import { useEffect, useState } from "react";
// import { useSelector } from "react-redux";
// import {getInfoViolation} from "../services/services";

// export default function TeacherViolationHistory() {
//   const [data, setData] = useState(null);

//   const userInfo = useSelector((state) => state.user.userInfo);
//   const fetchData = async () => {
//     const res = await getInfoViolation({teacher_id: userInfo?._id});
//     console.log("log", res)
//     setData(res);
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   if (!data) return <div>Loading...</div>;

//   return (
//     <div className="p-4">
//       <h1 className="text-2xl font-bold mb-4">Lịch sử vi phạm - {data.teacher}</h1>

//       {data.classes.map(cls => (
//         <div key={cls.class_code} className="mb-6 border p-4 rounded-lg shadow-sm">
//           <h2 className="text-xl font-semibold mb-2">{cls.class_name} ({cls.class_code})</h2>

//           {cls.exams.map(exam => (
//             <div key={exam.exam} className="mb-4 border-t pt-2">
//               <h3 className="text-lg font-medium mb-2">{exam.exam_name} ({exam.exam}) - {new Date(exam.start_time).toLocaleString()}</h3>

//               {exam.violations.length === 0 ? (
//                 <p className="text-gray-500">Không có vi phạm</p>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {exam.violations.map((v, idx) => (
//                     <div key={idx} className="border p-2 rounded shadow-sm">
//                       <p><strong>Học sinh:</strong> {v.student}</p>
//                       <p><strong>Hành vi:</strong> {v.behavior}</p>
//                       <p><strong>Điểm:</strong> {v.score.toFixed(2)}</p>
//                       <p><strong>Thời gian:</strong> {v.duration_ms} ms</p>
//                       <p><strong>Thời gian ghi nhận:</strong> {new Date(v.timestamp).toLocaleString()}</p>
//                       {v.evidence && (
//                         <img src={v.evidence} alt="evidence" className="mt-2 w-full h-auto rounded border"/>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       ))}
//     </div>
//   );
// }

// Final
// import { useEffect, useState, useMemo } from "react";
// import { useSelector } from "react-redux";
// import { getInfoViolation } from "../services/services";
// import { FiSearch } from "react-icons/fi";
// import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
// import { LogOut, CalendarDays, GraduationCap } from "lucide-react";
// import { Link } from "react-router-dom";

// export default function TeacherViolationHistory() {
//   const [data, setData] = useState(null);
//   const [searchTerm, setSearchTerm] = useState(""); // Gộp search lớp + kỳ thi
//   const [searchStudent, setSearchStudent] = useState(""); // Search theo mã sinh viên
//   const [selectedClass, setSelectedClass] = useState(null);
//   const [selectedExam, setSelectedExam] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 12;
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSearchOpen, setIsSearchOpen] = useState(false);

//   const userInfo = useSelector((state) => state.user.userInfo);

//   // Fetch dữ liệu vi phạm
//   useEffect(() => {
//     const fetchData = async () => {
//       setIsLoading(true);
//       const res = await getInfoViolation({ teacher_id: userInfo?._id });

//       console.log(res)
//       setData(res);
//       setIsLoading(false);
//     };
//     fetchData();
//   }, [userInfo]);

//   // Filter lớp theo searchTerm
//   const filteredClasses = useMemo(() => {
//     if (!data) return [];
//     return data.classes.filter(
//       (cls) =>
//         cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         cls.exams.some((exam) =>
//           exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//         )
//     );
//   }, [data, searchTerm]);

//   // Filter kỳ thi khi lớp được chọn
//   const filteredExams = useMemo(() => {
//     if (!selectedClass) return [];
//     return selectedClass.exams.filter((exam) =>
//       exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [selectedClass, searchTerm]);

//   // Lọc vi phạm theo sinh viên
//   const filteredViolationsByStudent = useMemo(() => {
//     if (!data || !searchStudent.trim()) return [];
//     const violations = [];
//     data.classes.forEach((cls) => {
//       cls.exams.forEach((exam) => {
//         exam.violations.forEach((v) => {
//           if (v.student.toLowerCase().includes(searchStudent.toLowerCase())) {
//             violations.push({
//               ...v,
//               class_name: cls.class_name,
//               exam_name: exam.exam_name,
//             });
//           }
//         });
//       });
//     });
//     return violations;
//   }, [data, searchStudent]);

//   const getBehaviorStyle = (behavior) => {
//     switch (behavior.toLowerCase()) {
//       case "cheating":
//       case "gian lận":
//         return {
//           color: "bg-red-100 text-red-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//       case "late":
//       case "muộn":
//         return {
//           color: "bg-yellow-100 text-yellow-600",
//           icon: <FaClock className="inline mr-1" />,
//         };
//       default:
//         return {
//           color: "bg-gray-100 text-gray-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//     }
//   };

//   const paginateViolations = (violations) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return violations.slice(startIndex, endIndex);
//   };

//   const SkeletonCard = () => (
//     <div className="bg-gray-100 rounded-xl p-4 shadow-md animate-pulse flex flex-col gap-3">
//       <div className="h-4 bg-gray-300 rounded w-3/4"></div>
//       <div className="h-4 bg-gray-300 rounded w-1/2"></div>
//       <div className="h-32 bg-gray-300 rounded-xl"></div>
//     </div>
//   );

//   return (
//     <div className="mx-auto font-sans h-screen flex flex-col">
//       {/* NAVBAR */}
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

//             <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
//               <LogOut size={18} /> Đăng xuất
//             </button>
//           </div>
//         </div>
//       </nav>

//       {/* HEADER: chỉ icon search */}
//       <div className="sticky top-0 z-50 bg-white  py-2 px-6 flex justify-end items-center">
//         {!isSearchOpen && (
//           <button
//             onClick={() => setIsSearchOpen(true)}
//             className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-400/80 transition flex items-center gap-4"
//             title="Tìm kiếm"
//           >
//             <FiSearch className="text-white text-xl" /> <span className="text-white">Tìm kiếm</span>
//           </button>
//         )}

//         {isSearchOpen && (
//           <div className="flex gap-3 w-full md:w-auto items-center">
//             {/* Search lớp/kỳ thi */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm lớp hoặc kỳ thi..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition placeholder-gray-400 text-sm"
//                 autoFocus
//               />
//             </div>

//             {/* Search sinh viên */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm mã sinh viên..."
//                 value={searchStudent}
//                 onChange={(e) => setSearchStudent(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition placeholder-gray-400 text-sm"
//               />
//             </div>

//             {/* Close search */}
//             <button
//               onClick={() => {
//                 setIsSearchOpen(false);
//                 setSearchTerm("");
//                 setSearchStudent("");
//               }}
//               className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
//             >
//               Đóng
//             </button>
//           </div>
//         )}
//       </div>

//       {/* BODY: Sidebar + Main Content */}
//       <div className="flex flex-1 gap-6 overflow-hidden px-10 mb-6 mt-6">
//         {/* Sidebar */}
//         {searchStudent.trim() === "" && (
//           <div className="md:w-1/4 bg-white shadow-lg rounded-2xl p-4 overflow-y-auto flex flex-col gap-4 max-h-full">
//             <h2 className="font-semibold mb-3 text-lg text-gray-700 sticky top-0 bg-white z-10 flex items-center gap-2">
//               <FaBook className="text-blue-500" /> Lớp học
//             </h2>

//             {filteredClasses.length === 0 ? (
//               <p className="text-gray-400 italic text-sm">
//                 Không tìm thấy lớp nào
//               </p>
//             ) : (
//               <div className="flex flex-col gap-3">
//                 {filteredClasses.map((cls) => (
//                   <div
//                     key={cls.class_code}
//                     onClick={() => {
//                       setSelectedClass(cls);
//                       setSelectedExam(null);
//                       setCurrentPage(1);
//                     }}
//                     className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 ${
//                       selectedClass?.class_code === cls.class_code
//                         ? "bg-blue-50 font-semibold shadow-md border-blue-200 text-blue-600"
//                         : "bg-white"
//                     }`}
//                   >
//                     <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 text-lg font-bold">
//                       {cls.class_name.charAt(0).toUpperCase()}
//                     </div>
//                     <div className="flex-1">
//                       <span className="text-sm font-medium">
//                         {cls.class_name}
//                       </span>
//                       <span className="block text-xs text-gray-500 mt-0.5">
//                         {cls.class_code}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* Main Content */}
//         <div className="md:flex-1 flex flex-col gap-5 overflow-y-auto max-h-full">
//           {isLoading ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//               {Array.from({ length: 12 }).map((_, idx) => (
//                 <SkeletonCard key={idx} />
//               ))}
//             </div>
//           ) : searchStudent.trim() !== "" ? (
//             filteredViolationsByStudent.length === 0 ? (
//               <p className="text-gray-500 italic text-sm">
//                 Không tìm thấy vi phạm của sinh viên này
//               </p>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                 {paginateViolations(filteredViolationsByStudent).map(
//                   (v, idx) => {
//                     const { color, icon } = getBehaviorStyle(v.behavior);
//                     return (
//                       <div
//                         key={idx}
//                         className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
//                       >
//                         <p className="font-semibold text-gray-800 text-sm">
//                           Học sinh:{" "}
//                           <span className="text-blue-600">{v.student}</span>
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           Lớp: {v.class_name} | Kỳ thi: {v.exam_name}
//                         </p>
//                         <p
//                           className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
//                         >
//                           {icon} Hành vi: {v.behavior}
//                         </p>
//                         <p className="text-gray-700 text-sm">
//                           Điểm: {v.score.toFixed(2)}
//                         </p>
//                         <p className="text-gray-700 text-sm">
//                           Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
//                         </p>
//                         <p className="text-gray-500 text-xs">
//                           Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//                         </p>
//                         {v.evidence && (
//                           <img
//                             src={v.evidence}
//                             alt="evidence"
//                             loading="lazy"
//                             className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                             onClick={() => window.open(v.evidence, "_blank")}
//                           />
//                         )}
//                       </div>
//                     );
//                   }
//                 )}
//               </div>
//             )
//           ) : selectedClass ? (
//             <>
//               {/* Tabs kỳ thi */}
//               <div className="flex flex-wrap gap-3 mb-4">
//                 {filteredExams.map((exam) => (
//                   <button
//                     key={exam.exam}
//                     onClick={() => setSelectedExam(exam)}
//                     className={`px-4 py-2 rounded-full font-medium transition ${
//                       selectedExam?.exam === exam.exam
//                         ? "bg-blue-600 text-white shadow-md"
//                         : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                     }`}
//                   >
//                     {exam.exam_name}
//                   </button>
//                 ))}
//               </div>

//               {/* Hiển thị vi phạm */}
//               {selectedExam ? (
//                 selectedExam.violations.length === 0 ? (
//                   <p className="text-gray-500 italic text-sm">
//                     Không có vi phạm
//                   </p>
//                 ) : (
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                     {paginateViolations(selectedExam.violations).map(
//                       (v, idx) => {
//                         const { color, icon } = getBehaviorStyle(v.behavior);
//                         return (
//                           <div
//                             key={idx}
//                             className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
//                           >
//                             <p className="font-semibold text-gray-800 text-sm">
//                               Học sinh:{" "}
//                               <span className="text-blue-600">{v.student}</span>
//                             </p>
//                             <p
//                               className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
//                             >
//                               {icon} Hành vi: {v.behavior}
//                             </p>
//                             <p className="text-gray-700 text-sm">
//                               Điểm: {v.score.toFixed(2)}
//                             </p>
//                             <p className="text-gray-700 text-sm">
//                               Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
//                             </p>
//                             <p className="text-gray-500 text-xs">
//                               Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//                             </p>
//                             {v.evidence && (
//                               <img
//                                 src={v.evidence}
//                                 alt="evidence"
//                                 loading="lazy"
//                                 className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                                 onClick={() =>
//                                   window.open(v.evidence, "_blank")
//                                 }
//                               />
//                             )}
//                           </div>
//                         );
//                       }
//                     )}
//                   </div>
//                 )
//               ) : (
//                 <p className="text-gray-500 italic text-sm">
//                   Chọn kỳ thi để xem vi phạm
//                 </p>
//               )}
//             </>
//           ) : (
//             <p className="text-gray-500 italic text-sm">
//               Chọn lớp để xem lịch sử vi phạm
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Scroll to top button */}
//       {(selectedClass || searchStudent.trim() !== "") && (
//         <button
//           onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
//           className="fixed bottom-5 right-5 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
//         >
//           <svg
//             className="w-5 h-5"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth="2"
//               d="M5 15l7-7 7 7"
//             />
//           </svg>
//         </button>
//       )}
//     </div>
//   );
// }

// import { useEffect, useState, useMemo } from "react";
// import { useSelector } from "react-redux";
// import { getInfoViolation } from "../services/services";
// import { FiSearch } from "react-icons/fi";
// import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
// import { LogOut, GraduationCap } from "lucide-react";
// import { Link } from "react-router-dom";

// export default function TeacherViolationHistory() {
//   const [data, setData] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchStudent, setSearchStudent] = useState("");
//   const [selectedClass, setSelectedClass] = useState(null);
//   const [selectedExam, setSelectedExam] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 12;
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSearchOpen, setIsSearchOpen] = useState(false);

//   const userInfo = useSelector((state) => state.user.userInfo);

//   // Fetch dữ liệu vi phạm
//   useEffect(() => {
//     const fetchData = async () => {
//       setIsLoading(true);
//       const res = await getInfoViolation({ teacher_id: userInfo?._id });
//       setData(res);
//       setIsLoading(false);
//     };
//     fetchData();
//   }, [userInfo]);

//   const filteredClasses = useMemo(() => {
//     if (!data) return [];
//     return data.classes.filter(
//       (cls) =>
//         cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         cls.exams.some((exam) =>
//           exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//         )
//     );
//   }, [data, searchTerm]);

//   const filteredExams = useMemo(() => {
//     if (!selectedClass) return [];
//     return selectedClass.exams.filter((exam) =>
//       exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [selectedClass, searchTerm]);

//   const filteredViolationsByStudent = useMemo(() => {
//     if (!data || !searchStudent.trim()) return [];
//     const violations = [];
//     data.classes.forEach((cls) => {
//       cls.exams.forEach((exam) => {
//         exam.violations.forEach((v) => {
//           if (v.student.toLowerCase().includes(searchStudent.toLowerCase())) {
//             violations.push({
//               ...v,
//               class_name: cls.class_name,
//               exam_name: exam.exam_name,
//             });
//           }
//         });
//       });
//     });
//     return violations;
//   }, [data, searchStudent]);

//   const getBehaviorStyle = (behavior) => {
//     switch (behavior.toLowerCase()) {
//       case "cheating":
//       case "gian lận":
//         return {
//           color: "bg-red-100 text-red-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//       case "late":
//       case "muộn":
//         return {
//           color: "bg-yellow-100 text-yellow-600",
//           icon: <FaClock className="inline mr-1" />,
//         };
//       default:
//         return {
//           color: "bg-gray-100 text-gray-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//     }
//   };

//   const paginateViolations = (violations) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return violations.slice(startIndex, endIndex);
//   };

//   const SkeletonCard = () => (
//     <div className="bg-gray-100 rounded-xl p-4 shadow-md animate-pulse flex flex-col gap-3">
//       <div className="h-4 bg-gray-300 rounded w-3/4"></div>
//       <div className="h-4 bg-gray-300 rounded w-1/2"></div>
//       <div className="h-32 bg-gray-300 rounded-xl"></div>
//     </div>
//   );

//   return (
//     <div className="mx-auto font-sans h-screen flex flex-col">
//       {/* NAVBAR */}
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

//             <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
//               <LogOut size={18} /> Đăng xuất
//             </button>
//           </div>
//         </div>
//       </nav>

//       {/* HEADER */}
//       <div className="sticky top-0 z-50 bg-white py-2 px-6 flex justify-end items-center">
//         {!isSearchOpen ? (
//           <button
//             onClick={() => setIsSearchOpen(true)}
//             className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-400/80 transition flex items-center gap-4"
//             title="Tìm kiếm"
//           >
//             <FiSearch className="text-white text-xl" />{" "}
//             <span className="text-white">Tìm kiếm</span>
//           </button>
//         ) : (
//           <div className="flex gap-3 w-full md:w-auto items-center">
//             {/* Search lớp/kỳ thi */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm lớp hoặc kỳ thi..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition placeholder-gray-400 text-sm"
//                 autoFocus
//               />
//             </div>

//             {/* Search sinh viên */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm mã sinh viên..."
//                 value={searchStudent}
//                 onChange={(e) => setSearchStudent(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition placeholder-gray-400 text-sm"
//               />
//             </div>

//             {/* Close search */}
//             <button
//               onClick={() => {
//                 setIsSearchOpen(false);
//                 setSearchTerm("");
//                 setSearchStudent("");
//               }}
//               className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
//             >
//               Đóng
//             </button>
//           </div>
//         )}
//       </div>

//       {/* BODY */}
//       <div className="flex flex-1 gap-6 overflow-hidden px-10 mb-6 mt-6">
//         {/* Sidebar */}
//         {searchStudent.trim() === "" && (
//           <div className="md:w-1/4 bg-white shadow-lg rounded-2xl p-4 overflow-y-auto flex flex-col gap-4 max-h-full">
//             <h2 className="font-semibold mb-3 text-lg text-gray-700 sticky top-0 bg-white z-10 flex items-center gap-2">
//               <FaBook className="text-blue-500" /> Lớp học
//             </h2>

//             {filteredClasses.length === 0 ? (
//               <p className="text-gray-400 italic text-sm">Không tìm thấy lớp nào</p>
//             ) : (
//               <div className="flex flex-col gap-3">
//                 {filteredClasses.map((cls) => (
//                   <div
//                     key={cls.class_code}
//                     onClick={() => {
//                       setSelectedClass(cls);
//                       setSelectedExam(null);
//                       setCurrentPage(1);
//                     }}
//                     className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 ${
//                       selectedClass?.class_code === cls.class_code
//                         ? "bg-blue-50 font-semibold shadow-md border-blue-200 text-blue-600"
//                         : "bg-white"
//                     }`}
//                   >
//                     <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 text-lg font-bold">
//                       {cls.class_name.charAt(0).toUpperCase()}
//                     </div>
//                     <div className="flex-1">
//                       <span className="text-sm font-medium">{cls.class_name}</span>
//                       <span className="block text-xs text-gray-500 mt-0.5">
//                         {cls.class_code}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* Main Content */}
//         <div className="md:flex-1 flex flex-col gap-5 overflow-y-auto max-h-full">
//           {isLoading ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//               {Array.from({ length: 12 }).map((_, idx) => (
//                 <SkeletonCard key={idx} />
//               ))}
//             </div>
//           ) : searchStudent.trim() !== "" ? (
//             filteredViolationsByStudent.length === 0 ? (
//               <p className="text-gray-500 italic text-sm">
//                 Không tìm thấy vi phạm của sinh viên này
//               </p>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                 {paginateViolations(filteredViolationsByStudent).map((v, idx) => {
//                   const { color, icon } = getBehaviorStyle(v.behavior);
//                   return (
//                     <div
//                       key={idx}
//                       className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
//                     >
//                       <p className="font-semibold text-gray-800 text-sm">
//                         Học sinh: <span className="text-blue-600">{v.student}</span>
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         Lớp: {v.class_name} | Kỳ thi: {v.exam_name}
//                       </p>
//                       <p className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}>
//                         {icon} Hành vi: {v.behavior}
//                       </p>
//                       <p className="text-gray-700 text-sm">Điểm: {v.score.toFixed(2)}</p>
//                       <p className="text-gray-700 text-sm">Thời gian: {(v.duration_ms / 1000).toFixed(2)}s</p>
//                       <p className="text-gray-500 text-xs">
//                         Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//                       </p>
//                       {v.evidence && (
//                         <img
//                           src={v.evidence}
//                           alt="evidence"
//                           loading="lazy"
//                           className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                           onClick={() => window.open(v.evidence, "_blank")}
//                         />
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             )
//           ) : selectedClass ? (
//             <>
//               {/* Tabs kỳ thi */}
//               <div className="flex flex-wrap gap-3 mb-4">
//                 {filteredExams.map((exam) => (
//                   <button
//                     key={exam.exam}
//                     onClick={() => setSelectedExam(exam)}
//                     className={`px-4 py-2 rounded-full font-medium transition ${
//                       selectedExam?.exam === exam.exam
//                         ? "bg-blue-600 text-white shadow-md"
//                         : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                     }`}
//                   >
//                     {exam.exam_name}
//                   </button>
//                 ))}
//               </div>

//               {/* Hiển thị vi phạm với nhóm sinh viên */}
//               {selectedExam ? (
//                 selectedExam.violations.length === 0 ? (
//                   <p className="text-gray-500 italic text-sm">Không có vi phạm</p>
//                 ) : (
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                     {Object.values(
//                       selectedExam.violations.reduce((acc, v) => {
//                         if (!acc[v.student]) acc[v.student] = { student: v.student, violations: [] };
//                         acc[v.student].violations.push(v);
//                         return acc;
//                       }, {})
//                     ).map((studentGroup) => (
//                       <StudentViolationCard
//                         key={studentGroup.student}
//                         studentGroup={studentGroup}
//                         getBehaviorStyle={getBehaviorStyle}
//                       />
//                     ))}
//                   </div>
//                 )
//               ) : (
//                 <p className="text-gray-500 italic text-sm">Chọn kỳ thi để xem vi phạm</p>
//               )}
//             </>
//           ) : (
//             <p className="text-gray-500 italic text-sm">Chọn lớp để xem lịch sử vi phạm</p>
//           )}
//         </div>
//       </div>

//       {/* Scroll to top */}
//       {(selectedClass || searchStudent.trim() !== "") && (
//         <button
//           onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
//           className="fixed bottom-5 right-5 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
//           </svg>
//         </button>
//       )}
//     </div>
//   );
// }

// // Component con: hiển thị violation theo sinh viên với toggle "Xem tất cả"
// function StudentViolationCard({ studentGroup, getBehaviorStyle }) {
//   const [showAll, setShowAll] = useState(false);
//   const [firstViolation, ...restViolations] = studentGroup.violations;
//   const { color, icon } = getBehaviorStyle(firstViolation.behavior);

//   return (
//     <div className="bg-gray-50 rounded-xl p-4 shadow-sm flex flex-col gap-2">
//       <p className="font-semibold text-gray-800 text-sm">
//         Học sinh: <span className="text-blue-600">{firstViolation.student}</span>
//       </p>
//       <p className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}>
//         {icon} Hành vi: {firstViolation.behavior}
//       </p>
//       <p className="text-gray-700 text-sm">Điểm: {firstViolation.score.toFixed(2)}</p>
//       <p className="text-gray-700 text-sm">Thời gian: {(firstViolation.duration_ms / 1000).toFixed(2)}s</p>
//       <p className="text-gray-500 text-xs">
//         Ghi nhận: {new Date(firstViolation.timestamp).toLocaleString()}
//       </p>
//       {firstViolation.evidence && (
//         <img
//           src={firstViolation.evidence}
//           alt="evidence"
//           className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//           onClick={() => window.open(firstViolation.evidence, "_blank")}
//         />
//       )}

//       {restViolations.length > 0 && (
//         <button
//           onClick={() => setShowAll(!showAll)}
//           className="mt-2 text-sm text-blue-600 hover:underline"
//         >
//           {showAll ? "Thu gọn" : `Xem tất cả (${restViolations.length})`}
//         </button>
//       )}

//       {showAll &&
//         restViolations.map((v, idx) => {
//           const { color, icon } = getBehaviorStyle(v.behavior);
//           return (
//             <div key={idx} className="mt-2 border-t pt-2">
//               <p className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}>
//                 {icon} Hành vi: {v.behavior}
//               </p>
//               <p className="text-gray-700 text-sm">Điểm: {v.score.toFixed(2)}</p>
//               <p className="text-gray-700 text-sm">Thời gian: {(v.duration_ms / 1000).toFixed(2)}s</p>
//               <p className="text-gray-500 text-xs">
//                 Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//               </p>
//               {v.evidence && (
//                 <img
//                   src={v.evidence}
//                   alt="evidence"
//                   className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                   onClick={() => window.open(v.evidence, "_blank")}
//                 />
//               )}
//             </div>
//           );
//         })}
//     </div>
//   );
// }

// Final

// import { useEffect, useState, useMemo } from "react";
// import { useSelector } from "react-redux";
// import { getInfoViolation } from "../services/services";
// import { FiSearch } from "react-icons/fi";
// import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
// import { LogOut, GraduationCap } from "lucide-react";
// import { Link } from "react-router-dom";

// export default function TeacherViolationHistory() {
//   const [data, setData] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchStudent, setSearchStudent] = useState("");
//   const [selectedClass, setSelectedClass] = useState(null);
//   const [selectedExam, setSelectedExam] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 12;
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSearchOpen, setIsSearchOpen] = useState(false);
//   const [modalData, setModalData] = useState(null); // chứa studentGroup khi mở modal

//   const userInfo = useSelector((state) => state.user.userInfo);

//   // Fetch dữ liệu vi phạm
//   useEffect(() => {
//     const fetchData = async () => {
//       setIsLoading(true);
//       const res = await getInfoViolation({ teacher_id: userInfo?._id });
//       setData(res);
//       setIsLoading(false);
//     };
//     fetchData();
//   }, [userInfo]);

//   const filteredClasses = useMemo(() => {
//     if (!data) return [];
//     return data.classes.filter(
//       (cls) =>
//         cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         cls.exams.some((exam) =>
//           exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//         )
//     );
//   }, [data, searchTerm]);

//   const filteredExams = useMemo(() => {
//     if (!selectedClass) return [];
//     return selectedClass.exams.filter((exam) =>
//       exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [selectedClass, searchTerm]);

//   const filteredViolationsByStudent = useMemo(() => {
//     if (!data || !searchStudent.trim()) return [];
//     const violations = [];
//     data.classes.forEach((cls) => {
//       cls.exams.forEach((exam) => {
//         exam.violations.forEach((v) => {
//           if (v.student.toLowerCase().includes(searchStudent.toLowerCase())) {
//             violations.push({
//               ...v,
//               class_name: cls.class_name,
//               exam_name: exam.exam_name,
//             });
//           }
//         });
//       });
//     });
//     return violations;
//   }, [data, searchStudent]);

//   const getBehaviorStyle = (behavior) => {
//     switch (behavior.toLowerCase()) {
//       case "cheating":
//       case "gian lận":
//         return {
//           color: "bg-red-100 text-red-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//       case "late":
//       case "muộn":
//         return {
//           color: "bg-yellow-100 text-yellow-600",
//           icon: <FaClock className="inline mr-1" />,
//         };
//       default:
//         return {
//           color: "bg-gray-100 text-gray-600",
//           icon: <FaExclamationTriangle className="inline mr-1" />,
//         };
//     }
//   };

//   const paginateViolations = (violations) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return violations.slice(startIndex, endIndex);
//   };

//   const SkeletonCard = () => (
//     <div className="bg-gray-100 rounded-xl p-4 shadow-md animate-pulse flex flex-col gap-3">
//       <div className="h-4 bg-gray-300 rounded w-3/4"></div>
//       <div className="h-4 bg-gray-300 rounded w-1/2"></div>
//       <div className="h-32 bg-gray-300 rounded-xl"></div>
//     </div>
//   );

//   return (
//     <div className="mx-auto font-sans h-screen flex flex-col">
//       {/* NAVBAR */}
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

//             <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
//               <LogOut size={18} /> Đăng xuất
//             </button>
//           </div>
//         </div>
//       </nav>

//       {/* HEADER */}
//       <div className="sticky top-0 z-50 bg-white py-2 px-6 flex justify-end items-center">
//         {!isSearchOpen ? (
//           <button
//             onClick={() => setIsSearchOpen(true)}
//             className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-400/80 transition flex items-center gap-4"
//             title="Tìm kiếm"
//           >
//             <FiSearch className="text-white text-xl" />{" "}
//             <span className="text-white">Tìm kiếm</span>
//           </button>
//         ) : (
//           <div className="flex gap-3 w-full md:w-auto items-center">
//             {/* Search lớp/kỳ thi */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm lớp hoặc kỳ thi..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition placeholder-gray-400 text-sm"
//                 autoFocus
//               />
//             </div>

//             {/* Search sinh viên */}
//             <div className="relative flex-1 md:w-64">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//               <input
//                 type="text"
//                 placeholder="Tìm mã sinh viên..."
//                 value={searchStudent}
//                 onChange={(e) => setSearchStudent(e.target.value)}
//                 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition placeholder-gray-400 text-sm"
//               />
//             </div>

//             {/* Close search */}
//             <button
//               onClick={() => {
//                 setIsSearchOpen(false);
//                 setSearchTerm("");
//                 setSearchStudent("");
//               }}
//               className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow"
//             >
//               Đóng
//             </button>
//           </div>
//         )}
//       </div>

//       {/* BODY */}
//       <div className="flex flex-1 gap-6 overflow-hidden px-10 mb-6 mt-6">
//         {/* Sidebar */}
//         {searchStudent.trim() === "" && (
//           <div className="md:w-1/4 bg-white shadow-lg rounded-2xl p-4 overflow-y-auto flex flex-col gap-4 max-h-full">
//             <h2 className="font-semibold mb-3 text-lg text-gray-700 sticky top-0 bg-white z-10 flex items-center gap-2">
//               <FaBook className="text-blue-500" /> Lớp học
//             </h2>

//             {filteredClasses.length === 0 ? (
//               <p className="text-gray-400 italic text-sm">
//                 Không tìm thấy lớp nào
//               </p>
//             ) : (
//               <div className="flex flex-col gap-3">
//                 {filteredClasses.map((cls) => (
//                   <div
//                     key={cls.class_code}
//                     onClick={() => {
//                       setSelectedClass(cls);
//                       setSelectedExam(null);
//                       setCurrentPage(1);
//                     }}
//                     className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 ${
//                       selectedClass?.class_code === cls.class_code
//                         ? "bg-blue-50 font-semibold shadow-md border-blue-200 text-blue-600"
//                         : "bg-white"
//                     }`}
//                   >
//                     <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 text-lg font-bold">
//                       {cls.class_name.charAt(0).toUpperCase()}
//                     </div>
//                     <div className="flex-1">
//                       <span className="text-sm font-medium">
//                         {cls.class_name}
//                       </span>
//                       <span className="block text-xs text-gray-500 mt-0.5">
//                         {cls.class_code}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* Main Content */}
//         <div className="md:flex-1 flex flex-col gap-5 overflow-y-auto max-h-full">
//           {isLoading ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//               {Array.from({ length: 12 }).map((_, idx) => (
//                 <SkeletonCard key={idx} />
//               ))}
//             </div>
//           ) : searchStudent.trim() !== "" ? (
//             filteredViolationsByStudent.length === 0 ? (
//               <p className="text-gray-500 italic text-sm">
//                 Không tìm thấy vi phạm của sinh viên này
//               </p>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                 {paginateViolations(filteredViolationsByStudent).map(
//                   (v, idx) => {
//                     const { color, icon } = getBehaviorStyle(v.behavior);
//                     return (
//                       <div
//                         key={idx}
//                         className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col gap-2"
//                       >
//                         <p className="font-semibold text-gray-800 text-sm">
//                           Học sinh:{" "}
//                           <span className="text-blue-600">{v.student}</span>
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           Lớp: {v.class_name} | Kỳ thi: {v.exam_name}
//                         </p>
//                         <p
//                           className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
//                         >
//                           {icon} Hành vi: {v.behavior}
//                         </p>
//                         <p className="text-gray-700 text-sm">
//                           Điểm: {v.score.toFixed(2)}
//                         </p>
//                         <p className="text-gray-700 text-sm">
//                           Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
//                         </p>
//                         <p className="text-gray-500 text-xs">
//                           Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//                         </p>
//                         {v.evidence && (
//                           <img
//                             src={v.evidence}
//                             alt="evidence"
//                             loading="lazy"
//                             className="w-full h-32 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                             onClick={() => window.open(v.evidence, "_blank")}
//                           />
//                         )}
//                       </div>
//                     );
//                   }
//                 )}
//               </div>
//             )
//           ) : selectedClass ? (
//             <>
//               {/* Tabs kỳ thi */}
//               <div className="flex flex-wrap gap-3 mb-4">
//                 {filteredExams.map((exam) => (
//                   <button
//                     key={exam.exam}
//                     onClick={() => setSelectedExam(exam)}
//                     className={`px-4 py-2 rounded-full font-medium transition ${
//                       selectedExam?.exam === exam.exam
//                         ? "bg-blue-600 text-white shadow-md"
//                         : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                     }`}
//                   >
//                     {exam.exam_name}
//                   </button>
//                 ))}
//               </div>

//               {/* Hiển thị vi phạm với nhóm sinh viên */}
//               {selectedExam ? (
//                 selectedExam.violations.length === 0 ? (
//                   <p className="text-gray-500 italic text-sm">
//                     Không có vi phạm
//                   </p>
//                 ) : (
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//                     {Object.values(
//                       selectedExam.violations.reduce((acc, v) => {
//                         if (!acc[v.student])
//                           acc[v.student] = {
//                             student: v.student,
//                             violations: [],
//                           };
//                         acc[v.student].violations.push(v);
//                         return acc;
//                       }, {})
//                     ).map((studentGroup) => (
//                       <StudentViolationCard
//                         key={studentGroup.student}
//                         studentGroup={studentGroup}
//                         getBehaviorStyle={getBehaviorStyle}
//                         onViewAll={(group) => setModalData(group)}
//                       />
//                     ))}
//                   </div>
//                 )
//               ) : (
//                 <p className="text-gray-500 italic text-sm">
//                   Chọn kỳ thi để xem vi phạm
//                 </p>
//               )}
//             </>
//           ) : (
//             <p className="text-gray-500 italic text-sm">
//               Chọn lớp để xem lịch sử vi phạm
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Scroll to top */}
//       {(selectedClass || searchStudent.trim() !== "") && (
//         <button
//           onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
//           className="fixed bottom-5 right-5 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
//         >
//           <svg
//             className="w-5 h-5"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth="2"
//               d="M5 15l7-7 7 7"
//             />
//           </svg>
//         </button>
//       )}

//       {modalData && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-lg relative  max-h-[80vh]">
//             <button
//               onClick={() => setModalData(null)}
//               className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-lg"
//             >
//               &times;
//             </button>
//             <h2 className="text-lg font-semibold mb-4 ">
//               Vi phạm của:{" "}
//               <span className="text-blue-600">{modalData.student}</span>
//             </h2>
//             <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
//               {modalData.violations.map((v, idx) => {
//                 const { color, icon } = getBehaviorStyle(v.behavior);
//                 return (
//                   <div
//                     key={idx}
//                     className="flex flex-col md:flex-row gap-4 border-b pb-4 last:border-b-0"
//                   >
//                     {/* Thông tin */}
//                     <div className="flex-1 flex flex-col gap-1">
//                       <p
//                         className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
//                       >
//                         {icon} Hành vi: {v.behavior}
//                       </p>
//                       <p className="text-gray-700 text-sm">
//                         Điểm: {v.score.toFixed(2)}
//                       </p>
//                       <p className="text-gray-700 text-sm">
//                         Thời gian: {(v.duration_ms / 1000).toFixed(2)}s
//                       </p>
//                       <p className="text-gray-500 text-xs">
//                         Ghi nhận: {new Date(v.timestamp).toLocaleString()}
//                       </p>
//                     </div>

//                     {/* Ảnh evidence */}
//                     {v.evidence && (
//                       <img
//                         src={v.evidence}
//                         alt="evidence"
//                         className="w-full md:w-64 h-48 object-cover rounded-xl border transition hover:scale-105 cursor-pointer"
//                         onClick={() => window.open(v.evidence, "_blank")}
//                       />
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // Component con: hiển thị violation theo sinh viên với toggle "Xem tất cả"
// function StudentViolationCard({ studentGroup, getBehaviorStyle, onViewAll }) {
//   const [firstViolation, ...restViolations] = studentGroup.violations;
//   const { color, icon } = getBehaviorStyle(firstViolation.behavior);

//   return (
//     <div className="bg-gray-50 rounded-xl p-4 shadow-sm flex flex-col gap-2">
//       <p className="font-semibold text-gray-800 text-sm">
//         Học sinh:{" "}
//         <span className="text-blue-600">{firstViolation.student}</span>
//       </p>
//       <p
//         className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
//       >
//         {icon} Hành vi: {firstViolation.behavior}
//       </p>
//       <p className="text-gray-700 text-sm">
//         Điểm: {firstViolation.score.toFixed(2)}
//       </p>
//       <p className="text-gray-700 text-sm">
//         Thời gian: {(firstViolation.duration_ms / 1000).toFixed(2)}s
//       </p>
//       <p className="text-gray-500 text-xs">
//         Ghi nhận: {new Date(firstViolation.timestamp).toLocaleString()}
//       </p>

//       {restViolations.length > 0 && (
//         <button
//           onClick={() => onViewAll(studentGroup)}
//           className="mt-2 text-sm text-blue-600 hover:underline"
//         >
//           Xem tất cả ({restViolations.length + 1})
//         </button>
//       )}
//     </div>
//   );
// }

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { getInfoViolation } from "../services/services";
import { FiSearch } from "react-icons/fi";
import { FaBook, FaExclamationTriangle, FaClock } from "react-icons/fa";
import { LogOut, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

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

  const userInfo = useSelector((state) => state.user.userInfo);

  // Fetch dữ liệu vi phạm
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getInfoViolation({ teacher_id: userInfo?._id });
      console.log(res);
      setData(res);
      setIsLoading(false);
    };
    fetchData();
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
    return selectedClass.exams.filter((exam) =>
      exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedClass, searchTerm]);

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
    switch (behavior.toLowerCase()) {
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
                placeholder="Tìm mã sinh viên..."
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
                {filteredClasses.map((cls) => (
                  <div
                    key={cls.class_code}
                    onClick={() => {
                      setSelectedClass(cls);
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
                ))}
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
                        <p
                          className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
                        >
                          {icon} Hành vi: {v.behavior}
                        </p>
                        <p className="text-gray-700 text-sm">
                          Điểm: {v.score.toFixed(2)}
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
                      <p
                        className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
                      >
                        {icon} Hành vi: {v.behavior || "Phát hiện face khác"}
                      </p>
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
                        Ghi nhận: {new Date(v.timestamp).toLocaleString()}
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
                              <div>Similarity: {f.similarity.toFixed(2)}</div>
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
      <p
        className={`font-medium text-sm ${color} px-2 py-1 rounded-lg flex items-center`}
      >
        {icon} Hành vi: {firstViolation.behavior || "Phát hiện face khác"}
      </p>
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
