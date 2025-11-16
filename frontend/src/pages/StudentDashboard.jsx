// Final

// import { useEffect, useState } from "react";
// import { getClasses, joinClass } from "../services/services";
// import toast, { Toaster } from "react-hot-toast";
// import { useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";

// export default function StudentDashboard() {
//   const [myClasses, setMyClasses] = useState([]);
//   const [otherClasses, setOtherClasses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showPasswordModal, setShowPasswordModal] = useState(false);
//   const [currentClass, setCurrentClass] = useState(null);
//   const [passwordInput, setPasswordInput] = useState("");

//   const { userInfo } = useSelector((state) => state.user);
//   const studentId = userInfo?._id;
//   const navigate = useNavigate();

//   const fetchClasses = async () => {
//     if (!studentId) return;
//     setLoading(true);
//     try {
//       const res = await getClasses({ user_id: studentId, role: "student" });
//       if (res.success) {
//         setMyClasses(res?.joinedClasses || []);
//         setOtherClasses(res?.notJoinedClasses || []);
//       } else {
//         toast.error("Không thể tải danh sách lớp học!");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Lỗi khi tải dữ liệu lớp học!");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleJoinClick = (cls) => {
//     if (cls.visibility === "private") {
//       setCurrentClass(cls);
//       setPasswordInput("");
//       setShowPasswordModal(true);
//     } else {
//       handleJoinClass(cls._id, "");
//     }
//   };

//   const handleJoinClass = async (classId, password) => {
//     try {
//       const res = await joinClass(classId, studentId, password);
//       if (res.success) {
//         toast.success("✅ Tham gia lớp học thành công!");
//         setShowPasswordModal(false);
//         fetchClasses();
//       } else {
//         toast.error(res.detail || "❌ Tham gia lớp học thất bại!");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Lỗi khi tham gia lớp học!");
//     }
//   };

//   const handlePasswordSubmit = () => {
//     if (!passwordInput) {
//       toast.error("Vui lòng nhập mật khẩu lớp!");
//       return;
//     }
//     handleJoinClass(currentClass._id, passwordInput);
//   };

//   const renderClassCard = (cls, canJoin = false) => (
//     <div
//       key={cls._id}
//       className="bg-white border rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-xl transition cursor-pointer"
//     >
//       <div>
//         <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
//         <p className="text-gray-600 mb-1">
//           Mã lớp: <span className="font-medium">{cls.code}</span>
//         </p>
//         <p className="text-gray-600 mb-1">
//           Giảng viên: <span className="font-medium">{cls.teacher_name}</span>
//         </p>
//         <span
//           className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
//             cls.visibility === "public"
//               ? "bg-green-100 text-green-800"
//               : "bg-red-100 text-red-800"
//           }`}
//         >
//           {cls.visibility.toUpperCase()}
//         </span>
//       </div>

//       {canJoin ? (
//         <button
//           onClick={() => handleJoinClick(cls)}
//           className={`mt-4 font-semibold py-2 px-4 rounded transition ${
//             cls.visibility === "public"
//               ? "bg-blue-500 text-white hover:bg-blue-600"
//               : "bg-yellow-500 text-white hover:bg-yellow-600"
//           }`}
//         >
//           {cls.visibility === "public" ? "Tham gia" : "Nhập mật khẩu"}
//         </button>
//       ) : (
//         <button
//           onClick={() => {
//             navigate(`/student_class_detail/${cls._id}`);
//           }}
//           className="mt-4 bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600 transition"
//         >
//           Xem chi tiết
//         </button>
//       )}
//     </div>
//   );

//   useEffect(() => {
//     fetchClasses();

//     const ws = new WebSocket("ws://localhost:8000/ws/classes");

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);

//       // 📌 Khi lớp mới được tạo
//       if (data.type === "class_created") {
//         const newClass = data.class;

//         // Nếu chưa tham gia thì push vào otherClasses
//         if (!newClass.students.includes(studentId)) {
//           setOtherClasses((prev) => {
//             if (prev.find((c) => c._id === newClass._id)) return prev;
//             return [...prev, newClass];
//           });
//         }
//       }

//       // 📌 Khi lớp được cập nhật (thêm học sinh)
//       if (data.type === "class_updated") {
//         const updatedClass = data.class;

//         // Nếu học sinh vừa được thêm → chuyển từ otherClasses → myClasses
//         if (updatedClass.students.includes(studentId)) {
//           setMyClasses((prev) => {
//             if (prev.find((c) => c._id === updatedClass._id)) return prev;
//             return [...prev, updatedClass];
//           });

//           // Xóa khỏi danh sách lớp khác
//           setOtherClasses((prev) =>
//             prev.filter((c) => c._id !== updatedClass._id)
//           );
//         } else {
//           // Nếu lớp được cập nhật nhưng học sinh không nằm trong lớp thì update ở otherClasses
//           setOtherClasses((prev) =>
//             prev.map((c) => (c._id === updatedClass._id ? updatedClass : c))
//           );
//         }
//       }
//     };

//     ws.onerror = () => console.log("WS error classes");
//     ws.onclose = () => console.log("WS closed classes");

//     return () => ws.close();
//   }, [studentId]);

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <Toaster position="top-right" />

//       <h1 className="text-3xl font-bold mb-6 border-b pb-2">
//         📚 Lớp học của tôi
//       </h1>
//       {loading ? (
//         <p>Đang tải...</p>
//       ) : myClasses.length ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {myClasses.map((cls) => renderClassCard(cls, false))}
//         </div>
//       ) : (
//         <p>Bạn chưa tham gia lớp nào.</p>
//       )}

//       <h1 className="text-3xl font-bold mt-12 mb-6 border-b pb-2">
//         📝 Lớp học khác
//       </h1>
//       {loading ? (
//         <p>Đang tải...</p>
//       ) : otherClasses.length ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {otherClasses.map((cls) => renderClassCard(cls, true))}
//         </div>
//       ) : (
//         <p>Không còn lớp học nào khác.</p>
//       )}

//       {/* Modal mật khẩu */}
//       {showPasswordModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg shadow-lg w-96 p-6">
//             <h2 className="text-xl font-bold mb-4">Nhập mật khẩu lớp</h2>
//             <input
//               type="password"
//               value={passwordInput}
//               onChange={(e) => setPasswordInput(e.target.value)}
//               className="w-full border px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
//               placeholder="Mật khẩu lớp"
//             />
//             <div className="flex justify-end space-x-2">
//               <button
//                 onClick={() => setShowPasswordModal(false)}
//                 className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
//               >
//                 Hủy
//               </button>
//               <button
//                 onClick={handlePasswordSubmit}
//                 className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
//               >
//                 Tham gia
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { getClasses, joinClass } from "../services/services";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";
import { FaLock, FaUnlock, FaChalkboardTeacher } from "react-icons/fa";
import { MdClass } from "react-icons/md";

export default function StudentDashboard() {
  const [myClasses, setMyClasses] = useState([]);
  const [otherClasses, setOtherClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("my");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  const { userInfo } = useSelector((state) => state.user);
  const studentId = userInfo?._id;
  const navigate = useNavigate();

  const fetchClasses = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getClasses({ user_id: studentId, role: "student" });
      if (res.success) {
        setMyClasses(res?.joinedClasses || []);
        setOtherClasses(res?.notJoinedClasses || []);
      } else {
        toast.error("Không thể tải danh sách lớp học!");
      }
    } catch (err) {
      toast.error("Lỗi khi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (cls) => {
    if (cls.visibility === "private") {
      setCurrentClass(cls);
      setPasswordInput("");
      setShowPasswordModal(true);
    } else {
      handleJoinClass(cls._id, "");
    }
  };

  const handleJoinClass = async (classId, password) => {
    try {
      const res = await joinClass(classId, studentId, password);
      if (res.success) {
        toast.success("Tham gia lớp học thành công!");
        setShowPasswordModal(false);
        fetchClasses();
      } else {
        toast.error(res.detail || "Tham gia lớp học thất bại!");
      }
    } catch (err) {
      toast.error("Lỗi khi tham gia lớp!");
    }
  };

  const handlePasswordSubmit = () => {
    if (!passwordInput) {
      toast.error("Vui lòng nhập mật khẩu!");
      return;
    }
    handleJoinClass(currentClass._id, passwordInput);
  };

  const renderClassCard = (cls, canJoin = false) => (
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

      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
          cls.visibility === "public"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {cls.visibility === "public" ? <FaUnlock /> : <FaLock />}
        {cls.visibility === "public" ? "Công khai" : "Riêng tư"}
      </span>

      {canJoin ? (
        <button
          onClick={() => handleJoinClick(cls)}
          className={`w-full mt-4 py-2 rounded-xl font-semibold text-white transition ${
            cls.visibility === "public"
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-yellow-500 hover:bg-yellow-600"
          }`}
        >
          {cls.visibility === "public" ? "Tham gia lớp" : "Nhập mật khẩu"}
        </button>
      ) : (
        <button
          onClick={() => navigate(`/student_class_detail/${cls._id}`)}
          className="w-full mt-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition"
        >
          Xem chi tiết
        </button>
      )}
    </div>
  );

  // ⭐ Real-time WebSocket
  useEffect(() => {
    fetchClasses();

    const ws = new WebSocket("ws://localhost:8000/ws/classes");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "class_created") {
        const newClass = data.class;
        if (!newClass.students.includes(studentId)) {
          setOtherClasses((prev) => {
            if (prev.find((c) => c._id === newClass._id)) return prev;
            return [...prev, newClass];
          });
        }
      }

      if (data.type === "class_updated") {
        const updatedClass = data.class;

        if (updatedClass.students.includes(studentId)) {
          setMyClasses((prev) => {
            if (prev.find((c) => c._id === updatedClass._id)) return prev;
            return [...prev, updatedClass];
          });
          setOtherClasses((prev) =>
            prev.filter((c) => c._id !== updatedClass._id)
          );
        } else {
          setOtherClasses((prev) =>
            prev.map((c) => (c._id === updatedClass._id ? updatedClass : c))
          );
        }
      }
    };

    ws.onerror = () => console.log("WS error classes");
    ws.onclose = () => console.log("WS closed classes");

    return () => ws.close();
  }, [studentId]);

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
            <Link to="/student_dashboard" className="hover:text-indigo-600 transition">
              Trang chủ
            </Link>
            <Link to="/student_violation_history" className="hover:text-indigo-600 transition">
              Lịch sử vi phạm
            </Link>
            <button className="px-3 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 shadow">
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* TAB UI */}
      <div className="flex gap-4 mb-6 mt-6 mx-46">
        <button
          className={`px-6 py-2 rounded-xl font-semibold transition ${
            tab === "my" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setTab("my")}
        >
          📚 Lớp học của tôi
        </button>
        <button
          className={`px-6 py-2 rounded-xl font-semibold transition ${
            tab === "other" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setTab("other")}
        >
          📝 Lớp học khác
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-46">
          {(tab === "my" ? myClasses : otherClasses).map((cls) =>
            renderClassCard(cls, tab === "other")
          )}
        </div>
      )}

      {/* MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-96 p-6 rounded-2xl shadow-xl animate-fadeIn">
            <h2 className="text-xl font-semibold mb-4">🔐 Nhập mật khẩu lớp</h2>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl mb-4 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Mật khẩu lớp"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                Tham gia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
