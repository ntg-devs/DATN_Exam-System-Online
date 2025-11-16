import { useRef, useState, useEffect } from "react";
import {
  MdFace,
  MdArrowBack,
  MdArrowForward,
  MdArrowUpward,
  MdArrowDownward,
  MdCheckCircle,
} from "react-icons/md";

import toast, { Toaster } from "react-hot-toast";
import { createAccount } from "../services/services";
import { useDispatch } from "react-redux";
import { login } from "../redux/slices/userSlice.js";
import { useNavigate } from "react-router-dom";

import { useSelector } from "react-redux";


function FaceRegister() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("");
  const [instruction, setInstruction] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [step, setStep] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    setStudentId(userInfo.student_id);
    setStudentName(userInfo.name);
  }, [studentId, studentName]);

  const instructions = [
    {
      text: "Giữ thẳng mặt",
      icon: <MdFace className="text-indigo-600" size={48} />,
    },
    {
      text: "Quay sang TRÁI",
      icon: <MdArrowBack className="text-indigo-600" size={48} />,
    },
    {
      text: "Quay sang PHẢI",
      icon: <MdArrowForward className="text-indigo-600" size={48} />,
    },
    {
      text: "Ngẩng đầu LÊN",
      icon: <MdArrowUpward className="text-indigo-600" size={48} />,
    },
    {
      text: "Cúi đầu XUỐNG",
      icon: <MdArrowDownward className="text-indigo-600" size={48} />,
    },
    {
      text: "Hoàn tất!",
      icon: (
        <MdCheckCircle className="text-green-500 animate-pulse" size={64} />
      ),
    },
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 640, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("Camera đã sẵn sàng");
      }
    } catch (err) {
      console.error("Lỗi mở camera:", err);
      setStatus("Không thể mở camera. Vui lòng kiểm tra thiết bị và quyền.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup khi unmount
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!studentId || !studentName) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (!videoRef.current?.srcObject) {
      setStatus("Camera chưa sẵn sàng. Vui lòng bật camera.");
      return;
    }

    setChunks([]);
    setPreviewUrl(null);

    const stream = videoRef.current.srcObject;

    const supportedTypes = MediaRecorder.isTypeSupported(
      "video/webm;codecs=vp9"
    )
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const mr = new MediaRecorder(stream, { mimeType: supportedTypes });
    mediaRecorderRef.current = mr;
    mr.chunks = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) mr.chunks.push(e.data);
    };

    mr.onstop = () => {
      setChunks(mr.chunks); // ✅ Cập nhật state chunks để upload

      const blob = new Blob(mr.chunks, { type: supportedTypes });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      // Hiển thị preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.load();
        videoRef.current
          .play()
          .catch((e) => console.error("Lỗi phát preview:", e));
      }

      setRecording(false);
      setStatus("Đã ghi xong video");
    };

    mr.start();
    setRecording(true);
    setStep(0);
    setInstruction(instructions[0].text);

    let count = 1;
    const interval = setInterval(() => {
      if (count < instructions.length) {
        setStep(count);
        setInstruction(instructions[count].text);
        count++;
      } else {
        clearInterval(interval);
      }
    }, 4000);

    // Dừng ghi sau 24 giây (6 bước * 4s)
    setTimeout(() => {
      if (mr.state !== "inactive") mr.stop();
      clearInterval(interval);

      // Dừng camera để giải phóng
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }, 24000);
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();

    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setRecording(false);
    setStatus("Đã dừng quay. Xem video preview.");
  };

  const uploadVideo = async () => {
    if (!chunks.length) {
      setStatus("Không có video để tải lên.");
      return;
    }

    setStatus("Đang tải lên...");
    const blob = new Blob(chunks, { type: "video/webm" });
    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("name", studentName);
    formData.append("video", blob, `${studentId}.webm`);

    const payload = {
      name: studentName,
      student_id: studentId,
      role: "student",
    };

    try {
      const resAccount = await createAccount(payload);

      if (resAccount.success) {
        dispatch(login(resAccount.user));

        const res = await fetch("http://localhost:8000/api/register-video", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          setStatus("Đăng ký khuôn mặt thành công!");
          toast.success("Đăng ký khuôn mặt thành công!");
          dispatch(login(resAccount.user));
          navigate("/dashboard");
        } else {
          setStatus(`Lỗi: ${data.detail || "Không xác định"}`);
          toast.error(`Lỗi: ${data.detail || "Không xác định"}`);
        }
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      setStatus("Lỗi kết nối server");
      toast.error(`Đăng ký khuôn mặt thất bại:\n${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "15px",
            borderRadius: "10px",
            padding: "10px 16px",
          },
        }}
      />
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Đăng ký Face ID
        </h1>

        <div className="relative mb-6">
          <div className="relative mx-auto w-80 h-80 rounded-full overflow-hidden border-8 border-gray-200 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover z-20 relative"
              autoPlay
              muted
              controls={previewUrl && !recording}
            />
          </div>
          <p className="text-center mt-4 font-medium text-gray-700 animate-fade">
            {recording
              ? instructions[step].text
              : instruction || "Vui lòng bấm Bật Camera"}
          </p>
        </div>

        <div className="flex gap-3 mb-4">
          {!recording ? (
            <>
              {!videoRef.current?.srcObject && (
                <button
                  onClick={startCamera}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-xl hover:bg-gray-700 transition font-medium"
                >
                  Bật Camera
                </button>
              )}
              <button
                onClick={startRecording}
                disabled={!studentId || !studentName}
                className={`flex-1 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Bắt đầu
              </button>
            </>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-medium"
            >
              Dừng quay
            </button>
          )}
        </div>

        {previewUrl && !recording && (
          <button
            onClick={uploadVideo}
            className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition font-medium"
          >
            Loading ...
          </button>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">{status}</p>
      </div>
    </div>
  );
}

export default FaceRegister;
