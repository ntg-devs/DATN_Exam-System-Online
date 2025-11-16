// import { useRef, useState, useEffect } from "react";
// import { MdFace, MdCheckCircle } from "react-icons/md";

// import { useDispatch } from "react-redux";
// import { login, logout } from "../redux/slices/userSlice.js";

// import { useNavigate } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";

// function FaceLogin() {
//   const videoRef = useRef(null);
//   const [status, setStatus] = useState("");
//   const [student, setStudent] = useState(null);
//   const [capturing, setCapturing] = useState(false);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   // Bật camera
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: 640, height: 640, facingMode: "user" },
//         audio: false,
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play();
//         setStatus("Camera đã bật");
//       }
//     } catch (err) {
//       console.error("Không mở được camera:", err);
//       setStatus("Không thể mở camera. Vui lòng cấp quyền truy cập.");
//     }
//   };

//   // Cleanup khi thoát
//   useEffect(() => {
//     startCamera();
//     return () => {
//       if (videoRef.current?.srcObject) {
//         videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
//       }
//     };
//   }, []);

//   // Hàm chụp ảnh từ webcam
//   const captureFrame = async () => {
//     if (!videoRef.current) return;
//     const canvas = document.createElement("canvas");
//     canvas.width = videoRef.current.videoWidth;
//     canvas.height = videoRef.current.videoHeight;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//     const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg"));
//     return blob;
//   };

//   // Hàm gửi ảnh lên server để xác thực
//   const handleLogin = async () => {
//     setCapturing(true);
//     setStatus("Đang xác thực khuôn mặt...");
//     const blob = await captureFrame();

//     if (!blob) {
//       setStatus("Không thể chụp ảnh từ webcam.");
//       setCapturing(false);
//       return;
//     }

//     const formData = new FormData();
//     formData.append("image", blob, "frame.jpg");

//     try {
//       const res = await fetch("http://localhost:8000/api/verify-face", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await res.json();
//       console.log("data", data)
//       if (res.ok && data.verified) {
//         setStudent(data.student);
//         dispatch(login({ ID: data.student.student_id, role: "student" }));
//         setStatus("Xác thực thành công! Đang chuyển hướng...");

//         setTimeout(() => {
//           navigate("/home");
//         }, 3000);
//       } else {
//         setStatus("Không nhận diện được khuôn mặt hoặc chưa đăng ký.");
//         setStudent(null);
//       }
//     } catch (err) {
//       console.error(err);
//       setStatus("Lỗi kết nối server.");
//     } finally {
//       setCapturing(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
//         <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng nhập bằng khuôn mặt</h1>

//         <div className="relative mx-auto w-80 h-80 rounded-full overflow-hidden border-8 border-gray-200 shadow-inner mb-4">
//           <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
//         </div>

//         <button
//           onClick={handleLogin}
//           disabled={capturing}
//           className={`w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium ${
//             capturing ? "opacity-60 cursor-not-allowed" : ""
//           }`}
//         >
//           {capturing ? "Đang nhận diện..." : "Xác thực khuôn mặt"}
//         </button>

//         <p className="text-center mt-4 text-sm text-gray-600">{status}</p>

//         {student && (
//           <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
//             <MdCheckCircle className="text-green-500 mx-auto mb-2" size={48} />
//             <h2 className="font-bold text-lg text-green-700">Xin chào, {student.name}</h2>
//             <p className="text-gray-700">Mã sinh viên: {student.student_id}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default FaceLogin;


// Final

// import { useRef, useState, useEffect } from "react";
// import { MdCheckCircle } from "react-icons/md";
// import { useDispatch } from "react-redux";
// import { login } from "../redux/slices/userSlice.js";
// import {
//   setVerifyInfo,
//   verifySuccess,
//   verifyFailed,
// } from "../redux/slices/verifySlice.js";
// import { useNavigate } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";
// import { useSelector } from "react-redux";
// import { createAccount, getAccountByFace } from "../services/services.js";

// function FaceVerify() {
//   const videoRef = useRef(null);
//   const [status, setStatus] = useState("");
//   const [student, setStudent] = useState(null);
//   const [capturing, setCapturing] = useState(false);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const userInfo = useSelector((state) => state.user.userInfo);
//   const verifyInfo = useSelector((state) => state.verify.verifyInfo);

//   // Bật camera
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: 640, height: 640, facingMode: "user" },
//         audio: false,
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play();
//         setStatus("Camera đã bật");
//       }
//     } catch (err) {
//       console.error("Không mở được camera:", err);
//       setStatus("Không thể mở camera. Vui lòng cấp quyền truy cập.");
//     }
//   };

//   // Cleanup khi thoát
//   useEffect(() => {
//     startCamera();
//     return () => {
//       if (videoRef.current?.srcObject) {
//         videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
//       }
//     };
//   }, []);

//   // Hàm chụp ảnh từ webcam
//   const captureFrame = async () => {
//     if (!videoRef.current) return;
//     const canvas = document.createElement("canvas");
//     canvas.width = videoRef.current.videoWidth;
//     canvas.height = videoRef.current.videoHeight;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//     const blob = await new Promise((resolve) =>
//       canvas.toBlob(resolve, "image/jpeg")
//     );
//     return blob;
//   };

//   // Hàm gửi ảnh lên server để xác thực
//   const handleLogin = async () => {
//     setCapturing(true);
//     setStatus("Đang xác thực khuôn mặt...");

//     const blob = await captureFrame();
//     if (!blob) {
//       setStatus("Không thể chụp ảnh từ webcam.");
//       setCapturing(false);
//       return;
//     }

//     const formData = new FormData();
//     formData.append("image", blob, "frame.jpg");

//     // Thông báo đang xử lý
//     const toastId = toast.loading("Đang xác thực khuôn mặt...");

//     try {
//       const res = await fetch("http://localhost:8000/api/verify-face", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await res.json();
//       console.log("data", data);

//       if (res.ok && data.verified) {
//         setStudent(data.student);
//         const res = await getAccountByFace({
//           student_id: data.student.student_id,
//         });
//         // dispatch(login(res.user));
//         dispatch(setVerifyInfo(res.user));  

//         if (userInfo.student_id == data.student.student_id) {
//           setStatus("Xác thực thành công! Đang chuyển hướng...");

//           // Cập nhật toast đếm ngược
//           let countdown = 3;
//           toast.success(
//             `Xác thực thành công! Chuyển hướng sau ${countdown}s...`,
//             { id: toastId }
//           );

//           const countdownInterval = setInterval(() => {
//             countdown -= 1;
//             if (countdown > 0) {
//               toast.loading(`Chuyển hướng sau ${countdown}s...`, {
//                 id: toastId,
//               });
//             } else {
//               clearInterval(countdownInterval);
//               toast.dismiss(toastId);
//               stopCamera();
//               navigate(`/student_live?exam=${verifyInfo?.classCode}`);
//             }
//           }, 1000);
//         } else {
//           setStatus("Xác thực danh tính thất bại!");
//           toast.error("Xác thực danh tính thất bại!", { id: toastId });
//           navigate(-1);
//           stopCamera();
//         }
//       } else {
//         toast.error("Không nhận diện được khuôn mặt hoặc chưa đăng ký.", {
//           id: toastId,
//         });
//         setStatus("Không nhận diện được khuôn mặt hoặc chưa đăng ký.");
//         setStudent(null);
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Lỗi kết nối server. Vui lòng thử lại sau!", { id: toastId });
//       setStatus("Lỗi kết nối server.");
//     } finally {
//       setCapturing(false);
//     }
//   };

//   const stopCamera = () => {
//     if (videoRef.current?.srcObject) {
//       videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
//       videoRef.current.srcObject = null;
//       setStatus("Camera đã tắt");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
//         <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
//           Xác thực danh tính
//         </h1>

//         <div className="relative mx-auto w-80 h-80 rounded-full overflow-hidden border-8 border-gray-200 shadow-inner mb-4">
//           <video
//             ref={videoRef}
//             className="w-full h-full object-cover"
//             autoPlay
//             muted
//           />
//         </div>

//         <button
//           onClick={handleLogin}
//           disabled={capturing}
//           className={`w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium ${
//             capturing ? "opacity-60 cursor-not-allowed" : ""
//           }`}
//         >
//           {capturing ? "Đang nhận diện..." : "Xác thực khuôn mặt"}
//         </button>

//         <p className="text-center mt-4 text-sm text-gray-600">{status}</p>

//         {student && (
//           <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
//             <MdCheckCircle className="text-green-500 mx-auto mb-2" size={48} />
//             <h2 className="font-bold text-lg text-green-700">
//               Xin chào, {student.name}
//             </h2>
//             <p className="text-gray-700">Mã sinh viên: {student.student_id}</p>
//           </div>
//         )}
//       </div>

//       {/* Component hiển thị thông báo toast */}
//       <Toaster position="top-center" reverseOrder={false} />
//     </div>
//   );
// }

// export default FaceVerify;

import { useRef, useState, useEffect } from "react";
import { MdCheckCircle } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../redux/slices/userSlice.js";
import {
  setVerifyInfo,
  verifySuccess,
  verifyFailed,
} from "../redux/slices/verifySlice.js";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { createAccount, getAccountByFace } from "../services/services.js";
import { LogOut, GraduationCap } from "lucide-react";

export default function FaceVerify() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("");
  const [student, setStudent] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userInfo = useSelector((state) => state.user.userInfo);
  const verifyInfo = useSelector((state) => state.verify.verifyInfo);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 640, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("Camera đã bật");
      }
    } catch (err) {
      console.error("Không mở được camera:", err);
      setStatus("Không thể mở camera. Vui lòng cấp quyền truy cập.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );
    return blob;
  };

  const handleLogin = async () => {
    setCapturing(true);
    setStatus("Đang xác thực khuôn mặt...");

    const blob = await captureFrame();
    if (!blob) {
      setStatus("Không thể chụp ảnh từ webcam.");
      setCapturing(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    const toastId = toast.loading("Đang xác thực khuôn mặt...");

    try {
      const res = await fetch("http://localhost:8000/api/verify-face", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setStudent(data.student);
        const res = await getAccountByFace({
          student_id: data.student.student_id,
        });
        dispatch(setVerifyInfo(res.user));

        if (userInfo.student_id === data.student.student_id) {
          setStatus("Xác thực thành công! Đang chuyển hướng...");

          let countdown = 3;
          toast.success(
            `Xác thực thành công! Chuyển hướng sau ${countdown}s...`,
            { id: toastId }
          );

          const countdownInterval = setInterval(() => {
            countdown -= 1;
            if (countdown > 0) {
              toast.loading(`Chuyển hướng sau ${countdown}s...`, {
                id: toastId,
              });
            } else {
              clearInterval(countdownInterval);
              toast.dismiss(toastId);
              stopCamera();
              navigate(`/student_live?exam=${verifyInfo?.classCode}`);
            }
          }, 1000);
        } else {
          setStatus("Xác thực danh tính thất bại!");
          toast.error("Xác thực danh tính thất bại!", { id: toastId });
          navigate(-1);
          stopCamera();
        }
      } else {
        toast.error("Không nhận diện được khuôn mặt hoặc chưa đăng ký.", {
          id: toastId,
        });
        setStatus("Không nhận diện được khuôn mặt hoặc chưa đăng ký.");
        setStudent(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server. Vui lòng thử lại sau!", { id: toastId });
      setStatus("Lỗi kết nối server.");
    } finally {
      setCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStatus("Camera đã tắt");
    }
  };

  const logout = () => navigate("/login");

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
      <div className="flex items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Xác thực danh tính
          </h1>

          <div className="relative mx-auto w-80 h-80 rounded-full overflow-hidden border-8 border-gray-200 shadow-inner mb-4">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={capturing}
            className={`w-full bg-indigo-500 text-white py-3 rounded-xl hover:bg-indigo-600 transition font-medium ${
              capturing ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {capturing ? "Đang nhận diện..." : "Xác thực khuôn mặt"}
          </button>

          <p className="text-center mt-4 text-sm text-gray-600">{status}</p>

          {student && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <MdCheckCircle className="text-green-500 mx-auto mb-2" size={48} />
              <h2 className="font-bold text-lg text-green-700">
                Xin chào, {student.name}
              </h2>
              <p className="text-gray-700">Mã sinh viên: {student.student_id}</p>
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}
