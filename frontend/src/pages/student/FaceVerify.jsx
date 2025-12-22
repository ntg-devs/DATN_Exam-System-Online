import { useRef, useState, useEffect } from "react";
import { MdCheckCircle } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/slices/userSlice.js";
import {
  setVerifyInfo,
  verifySuccess,
  verifyFailed,
} from "../../redux/slices/verifySlice.js";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { createAccount, getAccountByFace } from "../../services/services.js";
import { LogOut, GraduationCap } from "lucide-react";
import { URL_API } from "../../utils/path.js";

export default function FaceVerify() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [status, setStatus] = useState("");
  const [student, setStudent] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const verifyInfo = useSelector((state) => state.verify.verifyInfo);
  const userInfo = useSelector((state) => state.user.userInfo);

  /* ======================================
          BẬT CAMERA
  ====================================== */
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

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 640;
        canvas.height = 640;
      }
    } catch (err) {
      setStatus("Không thể mở camera. Vui lòng cấp quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStatus("Camera đã tắt");
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  /* ======================================
          CHỤP FRAME
  ====================================== */
  const captureFrame = async () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    // Lật ngang video
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Khôi phục transform (nếu vẽ bounding box sau này trên cùng canvas)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );
    return blob;
  };

  /* ======================================
          VẼ BOUNDING BOXES
  ====================================== */
  const drawBoxes = (faces) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    faces.forEach((face) => {
      let [x1, y1, x2, y2] = face.box;

      // Scale theo canvas
      x1 *= scaleX;
      x2 *= scaleX;
      y1 *= scaleY;
      y2 *= scaleY;

      // Mirror: chỉ flip nếu video mirror (giống captureFrame)
      // const mirror = true;
      // if (mirror) {
      //   const tempX1 = x1;
      //   x1 = canvas.width - x2;
      //   x2 = canvas.width - tempX1;
      // }

      const label = face.label === "unknown" ? "Người lạ" : face.label;

      ctx.lineWidth = 3;
      ctx.strokeStyle = face.label === "unknown" ? "red" : "green";
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      ctx.font = "18px Arial";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(label, x1, y1 - 10);
    });
  };

  /* ======================================
            GỬI FRAME ĐỂ NHẬN DIỆN
  ====================================== */
  const handleLogin = async () => {
    setCapturing(true);
    setStatus("Đang nhận diện khuôn mặt...");

    const blob = await captureFrame();
    if (!blob) {
      toast.error("Không thể chụp ảnh từ webcam.");
      setCapturing(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    const toastId = toast.loading("Đang xác thực...");

    try {
      const res = await fetch(`${URL_API}/verify-face`, {
        method: "POST",
        body: formData,
      });

      console.log(res)
      // const res = await fetch("http://https://unworkable-bernie-merely.ngrok-free.dev/api/verify-face", {
      //   method: "POST",
      //   body: formData,
      // });
      // const res = await fetch("https://103.142.24.110:8000/api/verify-face", {
      //   method: "POST",
      //   body: formData,
      // });

      const data = await res.json();
      console.log("Kết quả backend:", data);

      if (data.faces) drawBoxes(data.faces);

      if (res.ok && data.verified) {
        const detected = data.faces.find((f) => f.label !== "unknown");

        if (detected) {
          const studentId = detected.label;

          if (userInfo.student_id == studentId) {
            setStudent({ student_id: studentId });

            // Lấy thông tin tài khoản
            const acc = await getAccountByFace({ student_id: studentId });
            dispatch(setVerifyInfo(acc.user));

            toast.success("Xác thực thành công!", { id: toastId });

            // ⏳ Giữ lại 2 giây cho bạn nhìn bounding box
            await new Promise((resolve) => setTimeout(resolve, 3000));

            stopCamera();

            return navigate(
              `/student_live?exam=${verifyInfo?.examId}&session=${verifyInfo.sessionId}`
            );
          }
          toast.error("Khuôn mặt không khớp với sinh viên đăng ký!", {
          id: userInfo.student_id,
        });
        }

        // có mặt nhưng không trùng
        toast.error("Khuôn mặt không khớp với sinh viên đăng ký!", {
          id: toastId,
        });
        setCapturing(false);
        return;
      }

      toast.error("Không nhận diện được khuôn mặt!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server!", { id: toastId });
    } finally {
      setCapturing(false);
    }
  };

  const logout = () => {
    stopCamera();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            to="/student_dashboard"
            className="font-bold text-2xl text-indigo-600 flex items-center gap-2"
          >
            <GraduationCap size={28} />
            Smart Exam
          </Link>

          <button
            onClick={logout}
            className="px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </nav>

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
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={capturing}
            className={`w-full bg-indigo-500 text-white py-3 rounded-xl hover:bg-indigo-600 transition font-medium ${
              capturing ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {capturing ? "Đang nhận diện..." : "Xác thực danh tính"}
          </button>

          <p className="text-center mt-4 text-sm text-gray-600">{status}</p>

          {student && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <MdCheckCircle
                className="text-green-500 mx-auto mb-2"
                size={48}
              />
              <h2 className="font-bold text-lg text-green-700">
                Xin chào, {student.student_id}
              </h2>
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
