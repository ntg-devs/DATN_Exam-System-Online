// import React, { useEffect, useRef, useState } from "react";
// import { useSelector } from "react-redux";
// import { useSearchParams } from "react-router-dom";

// export default function StudentLive({fps=24 }) {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const wsRef = useRef(null);
//   const [connected, setConnected] = useState(false);
//   const [behavior, setBehavior] = useState(null);

//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const { userInfo, isAuthenticated } = useSelector((state) => state.user);

//   useEffect(() => {
//     async function startCamera() {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:480 }, audio:false });
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play();
//       } catch (e) {
//         console.error("camera error", e);
//       }
//     }
//     startCamera();

//     // connect ws
//     wsRef.current = new WebSocket(`ws://localhost:8000/ws/student?exam=${examId}&student=${userInfo.student_id}`);
//     wsRef.current.onopen = () => setConnected(true);
//     wsRef.current.onmessage = (ev) => {
//       try {
//         const data = JSON.parse(ev.data);
//         if (data.type === "self_assessment") {
//           setBehavior(data.behavior);
//         }
//       } catch (e) {}
//     };
//     wsRef.current.onclose = () => setConnected(false);

//     const interval = setInterval(() => {
//       if (!videoRef.current || !(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) return;
//       const v = videoRef.current;
//       const canvas = canvasRef.current || document.createElement("canvas");
//       canvas.width = 640;
//       canvas.height = 480;
//       const ctx = canvas.getContext("2d");
//       ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
//       // compress jpeg quality 0.6
//       const b64 = canvas.toDataURL("image/jpeg", 0.6);
//       const payload = { type: "frame", ts: Date.now(), b64 };
//       wsRef.current.send(JSON.stringify(payload));
//     }, 1000 / Math.max(1,fps));

//     return () => {
//       clearInterval(interval);
//       try { wsRef.current.close(); } catch {}
//       if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
//     };
//   }, [examId, userInfo.ID, fps]);

//   return (
//     <div>
//       <div>
//         <video ref={videoRef} autoPlay muted playsInline style={{width:320,height:240,objectFit:"cover",borderRadius:8}} />
//         <canvas ref={canvasRef} style={{display:"none"}}/>
//       </div>
//       <div>
//         <p>WS: {connected ? "connected":"disconnected"}</p>
//         <p>Behavior: {behavior ? `${behavior.class} (${(behavior.score*100).toFixed(1)}%)` : "chưa có"}</p>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useRef, useState } from "react";
// import { useSelector } from "react-redux";
// import { useSearchParams } from "react-router-dom";

// export default function StudentLive({ fps = 24 }) {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const wsRef = useRef(null);
//   const [connected, setConnected] = useState(false);
//   const [detections, setDetections] = useState([]);
//   const [violationRate, setViolationRate] = useState(0);

//   const [params] = useSearchParams();
//   const examId = params.get("exam");
//   const { userInfo } = useSelector((state) => state.user);

//   useEffect(() => {
//     async function startCamera() {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: { width: 640, height: 480 },
//           audio: false,
//         });
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play();
//       } catch (e) {
//         console.error("camera error", e);
//       }
//     }
//     startCamera();

//     // 🔹 Kết nối WebSocket
//     wsRef.current = new WebSocket(
//       `ws://localhost:8000/ws/student?exam=${examId}&student=${userInfo.student_id}`
//     );
//     wsRef.current.onopen = () => setConnected(true);
//     wsRef.current.onmessage = (ev) => {
//       try {
//         const data = JSON.parse(ev.data);
//         if (data.type === "self_assessment") {
//           setDetections(data.detections || []);
//           setViolationRate(data.violation_rate || 0);
//         }
//       } catch (e) {
//         console.error("WS parse error", e);
//       }
//     };
//     wsRef.current.onclose = () => setConnected(false);

//     // 🔹 Gửi frame định kỳ
//     const interval = setInterval(() => {
//       if (!videoRef.current || !(wsRef.current && wsRef.current.readyState === WebSocket.OPEN))
//         return;
//       const v = videoRef.current;
//       const canvas = canvasRef.current || document.createElement("canvas");
//       canvas.width = 640;
//       canvas.height = 480;
//       const ctx = canvas.getContext("2d");
//       ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
//       const b64 = canvas.toDataURL("image/jpeg", 0.6);
//       const payload = { type: "frame", ts: Date.now(), b64 };
//       wsRef.current.send(JSON.stringify(payload));
//     }, 1000 / Math.max(1, fps));

//     return () => {
//       clearInterval(interval);
//       try {
//         wsRef.current.close();
//       } catch {}
//       if (videoRef.current?.srcObject)
//         videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
//     };
//   }, [examId, userInfo.student_id, fps]);

//   return (
//     <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center">
//       {/* Camera */}
//       <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden shadow-md">
//         <video
//           ref={videoRef}
//           autoPlay
//           muted
//           playsInline
//           style={{ width: 640, height: 480, objectFit: "cover" }}
//         />
//         <canvas ref={canvasRef} style={{ display: "none" }} />
//       </div>

//       {/* Status */}
//       <div className="mt-4 text-center">
//         <p className="font-semibold">
//           WS Status:{" "}
//           <span className={connected ? "text-green-600" : "text-red-600"}>
//             {connected ? "Connected" : "Disconnected"}
//           </span>
//         </p>
//         <p>
//           Violation Rate:{" "}
//           <strong className={violationRate > 0 ? "text-red-600" : "text-green-600"}>
//             {(violationRate * 100).toFixed(1)}%
//           </strong>
//         </p>
//       </div>

//       {/* Detection list */}
//       <div className="mt-6 w-full max-w-md bg-white rounded-xl shadow-md p-4">
//         <h3 className="text-lg font-bold mb-2">🎯 Behavior Detections</h3>
//         {detections.length > 0 ? (
//           <table className="w-full text-sm text-left border-collapse">
//             <thead>
//               <tr className="border-b bg-gray-50">
//                 <th className="py-1 px-2">#</th>
//                 <th className="py-1 px-2">Label</th>
//                 <th className="py-1 px-2">Score</th>
//               </tr>
//             </thead>
//             <tbody>
//               {detections.map((d, i) => (
//                 <tr key={i} className="border-b hover:bg-gray-100">
//                   <td className="py-1 px-2">{i + 1}</td>
//                   <td
//                     className={`py-1 px-2 font-medium ${
//                       d.label !== "normal" ? "text-red-600" : "text-green-600"
//                     }`}
//                   >
//                     {d.label}
//                   </td>
//                   <td className="py-1 px-2">{(d.score * 100).toFixed(1)}%</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="text-gray-500 text-sm italic">Chưa có dữ liệu nhận diện...</p>
//         )}
//       </div>
//     </div>
//   );
// }

// Final

// import React, { useEffect, useRef, useState } from "react";
// import { useSelector } from "react-redux";
// import { useSearchParams } from "react-router-dom";

// export default function StudentLive({ fps = 4 }) {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const wsRef = useRef(null);
//   const sendCooldown = useRef(0);
//   const lastAnnotatedUpdate = useRef(0);

//   const [connected, setConnected] = useState(false);
//   const [detections, setDetections] = useState([]);
//   const [violationRate, setViolationRate] = useState(0);
//   const [annotatedFrame, setAnnotatedFrame] = useState(null);

//   const [params] = useSearchParams();
//   const examId = params.get("exam");
//   const { userInfo } = useSelector((state) => state.user);

//   const verifyInfo = useSelector((state) => state.verify.verifyInfo);

//   useEffect(() => {
//     let animationId = null;
//     const targetInterval = 1000 / fps;

//     async function startCamera() {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: 640, height: 480 },
//         audio: false,
//       });
//       videoRef.current.srcObject = stream;
//       await videoRef.current.play();
//     }
//     startCamera();

//     wsRef.current = new WebSocket(
//       `ws://localhost:8000/ws/student?exam=${examId}&student=${userInfo.student_id}&class_id=${verifyInfo.classId}`
//     );

//     wsRef.current.onopen = () => setConnected(true);

//     wsRef.current.onmessage = (ev) => {
//       const data = JSON.parse(ev.data);
//       if (data.type !== "self_assessment") return;

//       setDetections(data.detections || []);
//       setViolationRate(data.violation_rate || 0);

//       // throttle annotated frame update (300 ms)
//       if (Date.now() - lastAnnotatedUpdate.current > 300) {
//         setAnnotatedFrame(data.frame_b64);
//         lastAnnotatedUpdate.current = Date.now();
//       }
//     };

//     wsRef.current.onclose = () => setConnected(false);

//     function loop() {
//       animationId = requestAnimationFrame(loop);

//       const now = performance.now();
//       if (now - sendCooldown.current < targetInterval) return;
//       sendCooldown.current = now;

//       const video = videoRef.current;
//       const canvas = canvasRef.current;
//       if (!video || !canvas) return;

//       const ctx = canvas.getContext("2d");
//       canvas.width = 640;
//       canvas.height = 480;
//       ctx.drawImage(video, 0, 0, 640, 480);

//       // toBlob nhanh hơn rất nhiều
//       canvas.toBlob(
//         (blob) => {
//           if (!blob) return;
//           const reader = new FileReader();
//           reader.onloadend = () => {
//             if (wsRef.current?.readyState === WebSocket.OPEN) {
//               wsRef.current.send(
//                 JSON.stringify({
//                   type: "frame",
//                   b64: reader.result,
//                   ts: Date.now(),
//                 })
//               );
//             }
//           };
//           reader.readAsDataURL(blob);
//         },
//         "image/jpeg",
//         0.6
//       );
//     }

//     animationId = requestAnimationFrame(loop);

//     return () => {
//       cancelAnimationFrame(animationId);
//       wsRef.current?.close();
//       videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
//     };
//   }, []);

//   return (
//     <div className="p-4">
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* VIDEO + OVERLAY */}
//         <div className="flex justify-center">
//           <div className="relative w-[640px] h-[480px] rounded-xl overflow-hidden shadow-lg border border-gray-300 bg-black">
//             <video
//               ref={videoRef}
//               autoPlay
//               muted
//               playsInline
//               className="w-full h-full object-cover"
//             />

//             {annotatedFrame && (
//               <img
//                 src={annotatedFrame}
//                 className="absolute top-0 left-0 w-full h-full object-cover"
//               />
//             )}

//             <canvas ref={canvasRef} className="hidden" />
//           </div>
//         </div>

//         {/* STATUS + DETECTION */}
//         <div className="space-y-6">
//           {/* WS + STATUS */}
//           <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
//             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
//               📡 Trạng thái hệ thống
//             </h3>

//             <div className="flex justify-between items-center mb-3">
//               <span className="font-medium">WebSocket:</span>
//               <span
//                 className={`px-3 py-1 rounded-full text-sm font-semibold ${
//                   connected
//                     ? "bg-green-100 text-green-700"
//                     : "bg-red-100 text-red-700"
//                 }`}
//               >
//                 {connected ? "Connected" : "Disconnected"}
//               </span>
//             </div>

//             {/* VIOLATION RATE */}
//             <p className="font-medium mb-1">Violation Rate:</p>
//             <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
//               <div
//                 className={`h-3 ${
//                   violationRate > 0.3
//                     ? "bg-red-500"
//                     : violationRate > 0.1
//                     ? "bg-yellow-500"
//                     : "bg-green-500"
//                 }`}
//                 style={{ width: `${violationRate * 100}%` }}
//               ></div>
//             </div>

//             <p
//               className={`mt-2 text-sm font-semibold ${
//                 violationRate > 0 ? "text-red-600" : "text-green-600"
//               }`}
//             >
//               {(violationRate * 100).toFixed(1)}%
//             </p>
//           </div>

//           {/* DETECTION TABLE */}
//           <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
//             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
//               🎯 Kết quả nhận diện
//             </h3>

//             {detections.length > 0 ? (
//               <table className="w-full text-sm text-left border-collapse">
//                 <thead>
//                   <tr className="border-b bg-gray-50 text-gray-700">
//                     <th className="py-2 px-2 w-10">#</th>
//                     <th className="py-2 px-2">Label</th>
//                     <th className="py-2 px-2">Score</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {detections.map((d, i) => (
//                     <tr key={i} className="border-b hover:bg-gray-100">
//                       <td className="py-2 px-2">{i + 1}</td>

//                       <td className="py-2 px-2">
//                         <span
//                           className={`px-2 py-1 rounded-md text-xs font-semibold ${
//                             d.label !== "normal"
//                               ? "bg-red-100 text-red-700"
//                               : "bg-green-100 text-green-700"
//                           }`}
//                         >
//                           {d.label}
//                         </span>
//                       </td>

//                       <td className="py-2 px-2">
//                         {(d.score * 100).toFixed(1)}%
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             ) : (
//               <p className="text-gray-500 text-sm italic text-center py-2">
//                 Chưa có dữ liệu nhận diện...
//               </p>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";

export default function StudentLive({ fps = 4 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const sendCooldown = useRef(0);
  const lastAnnotatedUpdate = useRef(0);

  const [connected, setConnected] = useState(false);
  const [detections, setDetections] = useState([]);
  const [violationRate, setViolationRate] = useState(0);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);

  const [params] = useSearchParams();
  const examId = params.get("exam");
  const { userInfo } = useSelector((state) => state.user);
  const verifyInfo = useSelector((state) => state.verify.verifyInfo);

  const navigate = useNavigate();

  // -----------------------------------------------------
  // CAMERA + WEBSOCKET (GIỮ NGUYÊN LOGIC)
  // -----------------------------------------------------
  useEffect(() => {
    let animationId = null;
    const targetInterval = 1000 / fps;

    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    startCamera();

    wsRef.current = new WebSocket(
      `ws://localhost:8000/ws/student?exam=${examId}&student=${userInfo.student_id}&class_id=${verifyInfo.classId}`
    );

    wsRef.current.onopen = () => setConnected(true);

    wsRef.current.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type !== "self_assessment") return;

      setDetections(data.detections || []);
      setViolationRate(data.violation_rate || 0);

      if (Date.now() - lastAnnotatedUpdate.current > 300) {
        setAnnotatedFrame(data.frame_b64);
        lastAnnotatedUpdate.current = Date.now();
      }
    };

    wsRef.current.onclose = () => setConnected(false);

    function loop() {
      animationId = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - sendCooldown.current < targetInterval) return;
      sendCooldown.current = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      canvas.width = 640;
      canvas.height = 480;
      ctx.drawImage(video, 0, 0, 640, 480);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: "frame",
                  b64: reader.result,
                  ts: Date.now(),
                })
              );
            }
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.6
      );
    }

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      wsRef.current?.close();
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // -----------------------------------------------------
  // FUNCTION: Đăng xuất
  // -----------------------------------------------------
  const handleLogout = () => {
    navigate("/login");
  };

  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------
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
              to="/student_violation_history"
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

      {/* ---------------- PAGE CONTENT ---------------- */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAMERA PREVIEW */}
          <div className="flex justify-center">
            <div className="relative w-[640px] h-[480px] rounded-xl overflow-hidden shadow-lg border border-gray-300 bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {annotatedFrame && (
                <img
                  src={annotatedFrame}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* STATUS & DETECTIONS */}
          <div className="space-y-6">
            {/* STATUS */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📡 Trạng thái hệ thống
              </h3>

              <div className="flex justify-between mb-3">
                <span className="font-medium">WebSocket:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    connected
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <p className="font-medium">Violation Rate:</p>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-3 ${
                    violationRate > 0.3
                      ? "bg-red-500"
                      : violationRate > 0.1
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${violationRate * 100}%` }}
                ></div>
              </div>

              <p
                className={`mt-2 text-sm font-semibold ${
                  violationRate > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {(violationRate * 100).toFixed(1)}%
              </p>
            </div>

            {/* DETECTION TABLE */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
              <h3 className="text-lg font-bold mb-4">🎯 Kết quả nhận diện</h3>

              {detections.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-700">
                      <th className="py-2 px-2 w-10">#</th>
                      <th className="py-2 px-2">Label</th>
                      <th className="py-2 px-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detections.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-gray-100">
                        <td className="py-2 px-2">{i + 1}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-semibold ${
                              d.label !== "normal"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {d.label}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {(d.score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-sm italic text-center py-2">
                  Chưa có dữ liệu nhận diện...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
