// import React, { useState } from "react";
// import { motion } from "framer-motion";
// import { MdSchool, MdPerson } from "react-icons/md";
// import toast, { Toaster } from "react-hot-toast";
// import {createAccount} from "../services/services";
// import { useDispatch } from "react-redux";
// import { login } from "../redux/slices/userSlice.js";
// import { useNavigate } from "react-router-dom";



// export default function Home() {
//    // ✅ Mặc định là giáo viên
//   const [role, setRole] = useState("teacher");
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//     role: ""
//   });

//   const [typeForm, setTypeForm] = useState('teacher')

//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.name || !form.email || !form.password || !form.confirmPassword) {
//       toast.error("Vui lòng nhập đầy đủ thông tin!");
//       return;
//     }
//     if (password !== confirmPassword) {
//       toast.error("Mật khẩu xác nhận không trùng khớp!");
//       return;
//     }
//     const payload = { ...form, role };
//     try {
//       const res = await createAccount(payload);
//       if (res.success) {
//         toast.success("🎉 Tạo tài khoản thành công!");
//         dispatch(login(res.user));
//         navigate("/dashboard");
//         setForm({ name: "", email: "", password: "", confirmPassword: "", role: "" });
//       } else {
//         const err = await res.json();
//         toast.error("❌ Lỗi: " + err.detail);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error("⚠️ Không thể kết nối đến server!");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-100">
//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 3000,
//           style: { fontSize: "15px", borderRadius: "10px", padding: "10px 16px" },
//         }}
//       />
//       <motion.div
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5 }}
//         className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md"
//       >
//         <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
//           Đăng ký tài khoản
//         </h2>

//         {/* Vai trò lựa chọn */}
//         <div className="flex justify-center mb-8 space-x-6">
//           <button
//             type="button"
//             onClick={() => setRole("teacher")}
//             className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 font-semibold ${
//               role === "teacher"
//                 ? "bg-green-500 text-white shadow-md scale-105"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             <MdSchool size={22} />
//             Giảng viên
//           </button>

//           <button
//             type="button"
//             // onClick={() => navigate("/student_login")}
//             onClick={() => {setTypeForm("student")}}
//             className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 font-semibold ${
//               role === "student"
//                 ? "bg-blue-500 text-white shadow-md scale-105"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             <MdPerson size={22} />
//             Sinh viên
//           </button>
//         </div>

//         {/* Form đăng ký */}
//         <form onSubmit={handleSubmit} className="space-y-5">
//           <div>
//             <label className="block text-gray-700 mb-1 font-medium">
//               Họ và tên
//             </label>
//             <input
//               type="text"
//               name="name"
//               value={form.name}
//               onChange={handleChange}
//               placeholder="Nguyễn Văn A"
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-700 mb-1 font-medium">Email</label>
//             <input
//               type="email"
//               name="email"
//               value={form.email}
//               onChange={handleChange}
//               placeholder="email@domain.com"
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-700 mb-1 font-medium">
//               Mật khẩu
//             </label>
//             <input
//               type="password"
//               name="password"
//               value={form.password}
//               onChange={handleChange}
//               placeholder="********"
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1 font-medium">
//               Xác nhận lại mật khẩu
//             </label>
//             <input
//               type="password"
//               name="password"
//               value={form.password}
//               onChange={handleChange}
//               placeholder="********"
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
//             />
//           </div>

//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.97 }}
//             type="submit"
//             className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition"
//           >
//             Tạo tài khoản {role === "teacher" ? "Giáo viên" : "Học sinh"}
//           </motion.button>
//         </form>

//         <p className="text-center mt-6 text-sm text-gray-600">
//           Đã có tài khoản?{" "}
//           <a
//             href="/teacher_login"
//             className="text-green-600 font-semibold hover:underline"
//           >
//             Đăng nhập
//           </a>
//         </p>
//       </motion.div>
//     </div>
//   );
// }


import React, { useState } from "react";
import { motion } from "framer-motion";
import { MdSchool, MdPerson } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";
import { createAccount } from "../services/services";
import { useDispatch } from "react-redux";
import { login } from "../redux/slices/userSlice.js";
import { useNavigate } from "react-router-dom";

export default function Home() {
  // ✅ Mặc định đăng ký giảng viên
  const [role, setRole] = useState("teacher");

  const [form, setForm] = useState({
    name: "",
    email: "",
    student_id: "",
    password: "",
    confirmPassword: ""
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validate chung
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    // ✅ Validate riêng cho sinh viên
    if (role === "student" && !form.student_id) {
      toast.error("Vui lòng nhập mã sinh viên!");
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      student_id: role === "student" ? form.student_id : null
    };

    try {
      const res = await createAccount(payload);
      
      if (res.success) {
        toast.success("🎉 Tạo tài khoản thành công!");
        dispatch(login(res.user));
        
        if (role === "teacher") {
          navigate("/dashboard");
        } else {
          navigate("/student_register");
        }

        setForm({
          name: "",
          email: "",
          student_id: "",
          password: "",
          confirmPassword: ""
        });
      } else {
        toast.error("❌ " + res.detail);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-100">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "15px",
            borderRadius: "10px",
            padding: "10px 16px"
          }
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Đăng ký tài khoản
        </h2>

        {/* ✅ CHỌN VAI TRÒ */}
        <div className="flex justify-center mb-8 space-x-6">
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 font-semibold ${
              role === "teacher"
                ? "bg-green-500 text-white shadow-md scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <MdSchool size={22} />
            Giảng viên
          </button>

          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 font-semibold ${
              role === "student"
                ? "bg-blue-500 text-white shadow-md scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <MdPerson size={22} />
            Sinh viên
          </button>
        </div>

        {/* ✅ FORM ĐĂNG KÝ */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ✅ Họ tên */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Họ và tên</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none transition"
            />
          </div>

          {/* ✅ Email */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@domain.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none transition"
            />
          </div>

          {/* ✅ Nếu là sinh viên → Thêm trường mã sinh viên */}
          {role === "student" && (
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Mã sinh viên
              </label>
              <input
                type="text"
                name="student_id"
                value={form.student_id}
                onChange={handleChange}
                placeholder="VD: B12345"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
              />
            </div>
          )}

          {/* ✅ Mật khẩu */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none transition"
            />
          </div>

          {/* ✅ Xác nhận mật khẩu (sửa lỗi name="confirmPassword") */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="********"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none transition"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition"
          >
            Tạo tài khoản {role === "teacher" ? "Giảng viên" : "Học sinh"}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <a
            href="/login"
            className="text-green-600 font-semibold hover:underline"
          >
            Đăng nhập
          </a>
        </p>
      </motion.div>
    </div>
  );
}
