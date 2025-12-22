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
import { createAccount } from "../../services/services.js";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/slices/userSlice.js";
import { useNavigate } from "react-router-dom";

import { SOCKET_URL, URL_API } from "../../utils/path";

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
  const [showPolicy, setShowPolicy] = useState(true);
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
    if (!showPolicy) startCamera();
    startCamera();
    return () => {
      // Cleanup khi unmount
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [showPolicy]);

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

    setStatus("Đang xử lý...");
    const blob = new Blob(chunks, { type: "video/webm" });
    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("name", studentName);
    formData.append("video", blob, `${studentId}.webm`);

    try {
      if (userInfo) {
        // Kết nối WebSocket để nhận thông báo khi xử lý xong
        const ws = new WebSocket(`${SOCKET_URL}/ws/student_register_video`);
        
        ws.onopen = () => {
          // Gửi student_id để đăng ký nhận thông báo
          ws.send(studentId);
        };

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === "face_register_success") {
            // Xử lý thành công → cập nhật Redux và redirect
            setStatus("Đăng ký thành công!");
            toast.success(data.message);
            
            // Cập nhật userInfo với thông tin đã đăng ký
            dispatch(login({ 
              ...userInfo, 
              face_image: data.preview_image,
              face_registered: true,
              face_processing_status: "completed"
            }));
            
            ws.close();
            // Chuyển đến trang chủ sau khi đăng ký thành công
            navigate("/student_dashboard");
          } else if (data.type === "face_register_failed") {
            // Xử lý thất bại
            setStatus(`Lỗi: ${data.error}`);
            toast.error(`Đăng ký thất bại: ${data.error}`);
            ws.close();
          } else if (data.type === "face_register_pending") {
            // Đang xử lý
            setStatus("Quá trình đăng ký khuôn mặt đang được xử lý vui lòng đợi trong chốc lát...");
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          toast.error("Lỗi kết nối WebSocket");
        };

        // Gửi video lên server
        const res = await fetch(`${URL_API}/register-video`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatus("Video đã được gửi. Đang xử lý...");
          toast.success("Video đã được gửi. Vui lòng đợi hệ thống xử lý...");
          // Không redirect ngay, đợi WebSocket thông báo thành công
        } else {
          setStatus(`Lỗi: ${data.detail || "Không xác định"}`);
          toast.error(`Lỗi: ${data.detail || "Không xác định"}`);
          ws.close();
        }
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      setStatus("Lỗi kết nối server");
      toast.error(`Đăng ký danh tính thất bại:\n${err.message}`);
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
          Đăng ký danh tính
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
            Xác nhận
          </button>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">{status}</p>
      </div>

      {showPolicy && (
        <div className="fixed inset-0 bg-opacity-100 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">
              Điều khoản sử dụng
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              Hệ thống sẽ yêu cầu bạn quay video khuôn mặt để phục vụ 
              cho quá trình <b>xác thực danh tính</b>.
            </p>

            <p className="text-gray-700 leading-relaxed mb-4">
              <b>Để bảo vệ dữ liệu cá nhân video của bạn sẽ không được lưu trữ.</b> Sau khi hoàn tất
              quá trình đăng ký, video sẽ được xóa khỏi máy chủ. 
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <b>Sau khi đăng ký khuôn mặt thành công bạn sẽ được vào hệ thống.</b>
            </p>

            <p className="text-gray-700 leading-relaxed mb-6">
              Nhấn <b>“Đồng ý”</b> để tiếp tục.
            </p>

            {/* BUTTON GROUP */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPolicy(false)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium"
              >
                Tôi đồng ý
              </button>

              {/* <button
                onClick={() => {
                  toast.error("Bạn đã từ chối điều khoản.");
                  // Logout + quay về login
                  dispatch(login(null));
                  navigate("/login");
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-medium"
              >
                Từ chối
              </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceRegister;
