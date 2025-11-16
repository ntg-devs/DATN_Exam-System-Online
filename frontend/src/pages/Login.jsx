import React, { useState } from "react";
import { motion } from "framer-motion";
import { MdSchool, MdLock } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { login } from "../redux/slices/userSlice.js";
import { useNavigate } from "react-router-dom";
import { teacherLogin } from "../services/services.js"; // 👈 bạn cần tạo API tương ứng ở services

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    setLoading(true);
    try {
      const res = await teacherLogin(form); // Gọi API đăng nhập
      if (res.success) {
        toast.success("🎉 Đăng nhập thành công!");
        dispatch(login(res.user)); // Lưu thông tin vào Redux
        if (res?.user.role == "student") {
          navigate("/student_dashboard")
        } else {
          navigate("/class_dashboard"); // Chuyển đến trang quản lý

        }
      } else {
        toast.error(res.detail || "Sai email hoặc mật khẩu!");
      }
    } catch (error) {
      console.error(error);
      toast.error("⚠️ Lỗi kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-100">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "15px", borderRadius: "10px", padding: "10px 16px" },
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Đăng nhập
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@domain.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {loading ? "⏳ Đang đăng nhập..." : "🔑 Đăng nhập"}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <a href="/" className="text-green-600 font-semibold hover:underline">
            Đăng ký ngay
          </a>
        </p>
      </motion.div>
    </div>
  );
}
