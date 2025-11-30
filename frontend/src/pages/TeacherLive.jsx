// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {

//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({}); // sid -> {frame_b64, behavior, ts, alerts:[]}
//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);
//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);
//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);
//         if (msg.type === "student_frame") {
//           setStudents(prev => {
//             const next = {...prev};
//             const sid = msg.student;
//             const entry = next[sid] || { alerts: [] };
//             entry.frame_b64 = msg.frame_b64;
//             entry.behavior = msg.behavior;
//             entry.ts = msg.ts;
//             if (msg.behavior.class !== "normal" && msg.behavior.score > 0.5) {
//               entry.alerts = [...entry.alerts, { ts: msg.ts, cls: msg.behavior.class, score: msg.behavior.score }];
//             }
//             next[sid] = entry;
//             return next;
//           });
//         }
//       } catch(e){}
//     };
//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div>
//       <h2>Teacher Live - {examId} - WS: {wsConnected? "ok":"down"}</h2>
//       <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
//         {Object.entries(students).map(([sid,info]) => (
//           <div key={sid} style={{width:320,border:"1px solid #ddd",padding:8,borderRadius:6}}>
//             <h4>{sid}</h4>
//             <div style={{width:300,height:200,background:"#000"}}>
//               {info.frame_b64 ? <img src={info.frame_b64} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <div style={{color:"#fff"}}>No frame</div>}
//             </div>
//             <div>Behavior: <b>{info.behavior?.class}</b> ({(info.behavior?.score*100||0).toFixed(1)}%)</div>
//             <div style={{maxHeight:120,overflow:"auto"}}>
//               {info.alerts && info.alerts.map((a,i)=> <div key={i}>{new Date(a.ts).toLocaleTimeString()} - {a.cls} {(a.score*100).toFixed(1)}%</div>)}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});

//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;
//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64;
//             entry.behavior = msg.behavior;
//             entry.ts = msg.ts;

//             // if (msg.behavior.class !== "normal" && msg.behavior.score > 0.5) {
//             //   entry.alerts = [
//             //     ...entry.alerts,
//             //     { ts: msg.ts, cls: msg.behavior.class, score: msg.behavior.score }
//             //   ];
//             // }

//             if (
//               msg.behavior &&
//               typeof msg.behavior === "object" &&
//               msg.behavior.class !== "normal" &&
//               msg.behavior.score > 0.5
//             ) {
//               entry.alerts = [
//                 ...entry.alerts,
//                 {
//                   ts: msg.ts,
//                   cls: msg.behavior.class,
//                   score: msg.behavior.score,
//                 },
//               ];
//             }

//             next[sid] = entry;
//             return next;
//           });
//         }
//       } catch (e) {}
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="mb-6">
//         <h2 className="text-2xl font-bold">📡 Giám sát phòng thi – {examId}</h2>

//         <p className="mt-2 text-lg">
//           Websocket:{" "}
//           <span
//             className={
//               wsConnected
//                 ? "text-green-600 font-bold"
//                 : "text-red-600 font-bold"
//             }
//           >
//             {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//           </span>
//         </p>
//       </div>

//       {/* Students grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {Object.entries(students).map(([sid, info]) => (
//           <div
//             key={sid}
//             className="bg-white shadow-lg rounded-xl p-4 border hover:shadow-xl transition"
//           >
//             {/* Name */}
//             <h3 className="text-lg font-semibold mb-2">👤 {sid}</h3>

//             {/* Video frame */}
//             <div className="w-full h-48 bg-black rounded-md overflow-hidden flex items-center justify-center">
//               {info.frame_b64 ? (
//                 <img
//                   src={info.frame_b64}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <p className="text-white">No Frame</p>
//               )}
//             </div>

//             {/* Behavior */}
//             <div className="mt-3">
//               <p className="text-sm">
//                 Hành vi hiện tại:{" "}
//                 <span
//                   className={
//                     info.behavior?.class !== "normal"
//                       ? "text-red-600 font-bold"
//                       : "text-green-600 font-bold"
//                   }
//                 >
//                   {info.behavior?.class || "unknown"}
//                 </span>{" "}
//                 ({((info.behavior?.score || 0) * 100).toFixed(1)}%)
//               </p>
//             </div>

//             {/* Alerts */}
//             <div className="mt-4">
//               <h4 className="text-sm font-semibold">🚨 Lịch sử cảnh báo</h4>

//               <div className="max-h-32 overflow-y-auto mt-1 border rounded-md p-2 text-sm bg-gray-50">
//                 {info.alerts.length > 0 ? (
//                   info.alerts.map((a, i) => (
//                     <div key={i} className="border-b py-1">
//                       <span className="text-gray-600">
//                         {new Date(a.ts).toLocaleTimeString()}
//                       </span>{" "}
//                       -{" "}
//                       <span className="text-red-600 font-medium">
//                         {a.cls} ({(a.score * 100).toFixed(1)}%)
//                       </span>
//                     </div>
//                   ))
//                 ) : (
//                   <p className="text-gray-500 italic">Chưa có cảnh báo</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

//Code 1 - TeacherLive.jsx

// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});

//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         // -----------------------------
//         // HANDLE STUDENT FRAME
//         // -----------------------------
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64;
//             entry.detections = msg.detections || [];
//             entry.violation_rate = msg.violation_rate || 0;
//             entry.ts = msg.ts;

//             // ADD ALERT WHEN VIOLATION RATE > 0.3
//             if (msg.violation_rate > 0.3) {
//               entry.alerts = [
//                 ...entry.alerts,
//                 {
//                   ts: msg.ts,
//                   violation_rate: msg.violation_rate,
//                   detections: msg.detections,
//                 },
//               ];
//             }

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // -----------------------------
//         // HANDLE STUDENT JOIN
//         // -----------------------------
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Parse Error", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="p-6">
//       {/* HEADER */}
//       <div className="mb-6">
//         <h2 className="text-2xl font-bold">📡 Giám sát phòng thi – {examId}</h2>

//         <p className="mt-2 text-lg">
//           Websocket:{" "}
//           <span
//             className={
//               wsConnected
//                 ? "text-green-600 font-bold"
//                 : "text-red-600 font-bold"
//             }
//           >
//             {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//           </span>
//         </p>
//       </div>

//       {/* STUDENTS GRID */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {Object.entries(students).map(([sid, info]) => (
//           <div
//             key={sid}
//             className="bg-white shadow-lg rounded-xl p-4 border hover:shadow-xl transition"
//           >
//             <h3 className="text-lg font-semibold mb-2">👤 {sid}</h3>

//             {/* LIVE FRAME */}
//             <div
//               className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center"
//               style={{ height: "200px" }}
//             >
//               {info.frame_b64 ? (
//                 <img
//                   src={info.frame_b64}
//                   className="max-w-full max-h-full object-contain"
//                   style={{ imageRendering: "auto" }}
//                 />
//               ) : (
//                 <p className="text-white">No Frame</p>
//               )}
//             </div>

//             {/* BEHAVIOR */}
//             <div className="mt-3">
//               <p className="text-sm">
//                 Mức độ vi phạm:{" "}
//                 <span
//                   className={
//                     info.violation_rate > 0.3
//                       ? "text-red-600 font-bold"
//                       : "text-green-600 font-bold"
//                   }
//                 >
//                   {(info.violation_rate * 100).toFixed(1)}%
//                 </span>
//               </p>

//               <p className="text-sm mt-1">
//                 Nhãn phát hiện:{" "}
//                 {info.detections?.length > 0 ? (
//                   info.detections.map((d, i) => (
//                     <span key={i} className="inline-block mr-2">
//                       {d.label} ({(d.score * 100).toFixed(1)}%)
//                     </span>
//                   ))
//                 ) : (
//                   <span className="text-gray-500">Không có</span>
//                 )}
//               </p>
//             </div>

//             {/* ALERTS */}
//             <div className="mt-4">
//               <h4 className="text-sm font-semibold">🚨 Lịch sử cảnh báo</h4>

//               <div className="max-h-32 overflow-y-auto mt-1 border rounded-md p-2 text-sm bg-gray-50">
//                 {info.alerts.length > 0 ? (
//                   info.alerts.map((a, i) => (
//                     <div key={i} className="border-b py-1">
//                       <span className="text-gray-600">
//                         {new Date(a.ts).toLocaleTimeString()}
//                       </span>{" "}
//                       -{" "}
//                       <span className="text-red-600 font-medium">
//                         Vi phạm {(a.violation_rate * 100).toFixed(1)}%
//                       </span>
//                       <br />
//                       <span className="text-xs text-gray-600">
//                         {a.detections.map((d) => d.label).join(", ")}
//                       </span>
//                     </div>
//                   ))
//                 ) : (
//                   <p className="text-gray-500 italic">Chưa có cảnh báo</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

//Code 2 - TeacherLive.jsx

// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});
//   const [notifications, setNotifications] = useState([]); // 🔥 NEW: danh sách thông báo vi phạm

//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         // ================================================
//         // 🔔 HANDLE REALTIME VIOLATION FROM BACKEND
//         // ================================================
//         if (msg.type === "violation_detected") {
//           const item = {
//             student: msg.student,
//             behavior: msg.behavior,
//             duration: msg.duration,
//             ts: msg.timestamp,
//             evidence: msg.evidence,
//           };

//           // Push notification
//           setNotifications((prev) => [item, ...prev]);

//           // Đồng thời lưu vào UI student card
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.alerts = [
//               {
//                 ts: msg.timestamp,
//                 violation_rate: 1,
//                 detections: [{ label: msg.behavior }],
//                 behavior: msg.behavior,
//                 duration: msg.duration,
//                 evidence: msg.evidence,
//               },
//               ...entry.alerts,
//             ];

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 🎥 STUDENT FRAME UPDATE
//         // ================================================
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64;
//             entry.detections = msg.detections || [];
//             entry.violation_rate = msg.violation_rate || 0;
//             entry.ts = msg.ts;

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 👤 STUDENT JOIN
//         // ================================================
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Parse Error", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="flex h-screen bg-gray-100 p-4 space-x-4">
//       {/* LEFT PANEL: STUDENT LIVE MONITORING */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <h2 className="text-3xl font-bold">🎥 Giám sát phòng thi</h2>
//             <p className="text-gray-600">Phòng thi: {examId}</p>
//           </div>

//           <span
//             className={
//               "px-4 py-2 rounded-xl text-white text-sm font-bold " +
//               (wsConnected ? "bg-green-600" : "bg-red-600")
//             }
//           >
//             {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//           </span>
//         </div>

//         {/* STUDENT GRID */}
//         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
//           {Object.entries(students).map(([sid, info]) => (
//             <div
//               key={sid}
//               className="bg-white shadow-lg rounded-xl p-4 border border-gray-200 hover:shadow-xl transition"
//             >
//               <h3 className="text-lg font-semibold mb-2 flex items-center">
//                 👤 <span className="ml-2">{sid}</span>
//               </h3>

//               {/* LIVE FRAME */}
//               <div
//                 className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center"
//                 style={{ height: "220px" }}
//               >
//                 {info.frame_b64 ? (
//                   <img
//                     src={info.frame_b64}
//                     className="max-w-full max-h-full object-contain"
//                   />
//                 ) : (
//                   <p className="text-white">No Frame</p>
//                 )}
//               </div>

//               {/* DETECTIONS */}
//               <div className="mt-3 space-y-1">
//                 <p className="text-sm">
//                   Mức độ vi phạm:{" "}
//                   <span
//                     className={
//                       info.violation_rate > 0.3
//                         ? "text-red-600 font-bold"
//                         : "text-green-600 font-bold"
//                     }
//                   >
//                     {(info.violation_rate * 100).toFixed(1)}%
//                   </span>
//                 </p>

//                 <p className="text-sm">
//                   Nhãn phát hiện:
//                   <br />
//                   {info.detections?.length > 0 ? (
//                     info.detections.map((d, i) => (
//                       <span
//                         key={i}
//                         className="inline-block px-2 py-1 bg-gray-200 text-gray-800 rounded-lg mr-2 mt-1 text-xs"
//                       >
//                         {d.label} ({(d.score * 100).toFixed(1)}%)
//                       </span>
//                     ))
//                   ) : (
//                     <span className="text-gray-500"> Không có </span>
//                   )}
//                 </p>
//               </div>

//               {/* ALERT HISTORY */}
//               <div className="mt-4">
//                 <h4 className="text-sm font-semibold">🚨 Lịch sử vi phạm</h4>

//                 <div className="max-h-32 overflow-y-auto mt-1 border rounded-md p-2 text-sm bg-gray-50">
//                   {info.alerts.length > 0 ? (
//                     info.alerts.map((a, i) => (
//                       <div key={i} className="border-b py-1">
//                         <div>
//                           <span className="text-gray-600">
//                             {new Date(a.ts).toLocaleTimeString()}
//                           </span>{" "}
//                           -{" "}
//                           <span className="text-red-600 font-bold">
//                             {a.behavior || a.detections?.[0]?.label}
//                           </span>
//                         </div>

//                         <div className="text-xs text-gray-600">
//                           Thời gian: {(a.duration / 1000).toFixed(1)}s
//                         </div>

//                         {a.evidence && (
//                           <img
//                             src={a.evidence}
//                             className="w-20 mt-1 rounded"
//                           />
//                         )}
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-gray-500 italic">Chưa có cảnh báo</p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* RIGHT PANEL: NOTIFICATIONS */}
//       <div className="w-96 bg-white shadow-xl rounded-xl p-4 border overflow-y-auto">
//         <h3 className="text-xl font-bold mb-3">📣 Thông báo vi phạm</h3>

//         {notifications.length === 0 && (
//           <p className="text-gray-500 italic">Không có thông báo nào</p>
//         )}

//         {notifications.map((n, i) => (
//           <div
//             key={i}
//             className="border-l-4 border-red-500 bg-red-50 p-3 rounded mb-3"
//           >
//             <div className="font-bold text-red-700">
//               👤 Sinh viên: {n.student}
//             </div>
//             <div className="text-sm text-red-600">
//               Hành vi: <b>{n.behavior}</b>
//             </div>
//             <div className="text-sm text-gray-700">
//               Thời gian: {(n.duration / 1000).toFixed(1)}s
//             </div>
//             <div className="text-xs text-gray-500">
//               {new Date(n.ts).toLocaleTimeString()}
//             </div>

//             {n.evidence && (
//               <img src={n.evidence} className="w-full rounded mt-2 shadow" />
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// Code 3 - TeacherLive.jsx

// import React, { useEffect, useState, useRef } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});
//   const [notifications, setNotifications] = useState([]);

//   return (
//     <div className="flex h-screen bg-gray-100 p-4 space-x-4">
//       <LeftPanel
//         examId={examId}
//         wsConnected={wsConnected}
//         setWsConnected={setWsConnected}
//         students={students}
//         setStudents={setStudents}
//         notifications={notifications}
//         setNotifications={setNotifications}
//       />

//       <RightPanel notifications={notifications} />
//     </div>
//   );
// }

// /* ----------------------------- LEFT PANEL ----------------------------- */

// function LeftPanel({
//   examId,
//   wsConnected,
//   setWsConnected,
//   students,
//   setStudents,
//   notifications,
//   setNotifications,
// }) {
//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         /* ---------------------------------------------------
//          🔔 REALTIME VIOLATION EVENT
//         --------------------------------------------------- */
//         if (msg.type === "violation_detected") {
//           const item = {
//             student: msg.student,
//             behavior: msg.behavior,
//             duration: msg.duration,
//             ts: msg.timestamp,
//             evidence: msg.evidence,
//             bbox: msg.bbox,
//           };

//           setNotifications((prev) => [item, ...prev]);

//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.alerts = [
//               {
//                 ts: msg.timestamp,
//                 violation_rate: 1,
//                 detections: [{ label: msg.behavior }],
//                 behavior: msg.behavior,
//                 duration: msg.duration,
//                 evidence: msg.evidence,
//                 bbox: msg.bbox,
//               },
//               ...entry.alerts,
//             ];

//             next[sid] = entry;
//             return next;
//           });
//         }

//         /* ---------------------------------------------------
//          🎥 STUDENT FRAME EVENT
//         --------------------------------------------------- */
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64;
//             entry.detections = msg.detections || [];
//             entry.bbox = msg.bbox || null;
//             entry.violation_rate = msg.violation_rate || 0;
//             entry.ts = msg.ts;

//             next[sid] = entry;
//             return next;
//           });
//         }

//         /* ---------------------------------------------------
//          👤 STUDENT JOIN
//         --------------------------------------------------- */
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Parse Error", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="flex-1 overflow-y-auto">
//       <div className="mb-6 flex items-center justify-between">
//         <div>
//           <h2 className="text-3xl font-bold">🎥 Giám sát phòng thi</h2>
//           <p className="text-gray-600">Phòng thi: {examId}</p>
//         </div>

//         <span
//           className={
//             "px-4 py-2 rounded-xl text-white text-sm font-bold " +
//             (wsConnected ? "bg-green-600" : "bg-red-600")
//           }
//         >
//           {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//         </span>
//       </div>

//       <StudentGrid students={students} />
//     </div>
//   );
// }

// /* ----------------------------- STUDENT GRID ----------------------------- */

// function StudentGrid({ students }) {
//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
//       {Object.entries(students).map(([sid, info]) => (
//         <StudentCard key={sid} sid={sid} info={info} />
//       ))}
//     </div>
//   );
// }

// /* ----------------------------- STUDENT CARD ----------------------------- */

// function StudentCard({ sid, info }) {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     if (!info.frame_b64 || !canvasRef.current) return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     const img = new Image();
//     img.src = info.frame_b64;

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;

//       ctx.drawImage(img, 0, 0);

//       if (info.bbox) {
//         ctx.strokeStyle = "red";
//         ctx.lineWidth = 3;
//         ctx.strokeRect(info.bbox.x, info.bbox.y, info.bbox.w, info.bbox.h);
//       }
//     };
//   }, [info.frame_b64, info.bbox]);

//   return (
//     <div className="bg-white shadow-lg rounded-xl p-4 border border-gray-200 hover:shadow-xl transition">
//       <h3 className="text-lg font-semibold mb-2 flex items-center">
//         👤 <span className="ml-2">{sid}</span>
//       </h3>

//       <div
//         className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center"
//         style={{ height: "220px" }}
//       >
//         {!info.frame_b64 ? (
//           <p className="text-white">No Frame</p>
//         ) : (
//           <canvas ref={canvasRef} className="max-w-full max-h-full" />
//         )}
//       </div>

//       <div className="mt-3 space-y-1">
//         <p className="text-sm">
//           Mức độ vi phạm:{" "}
//           <span
//             className={
//               info.violation_rate > 0.3
//                 ? "text-red-600 font-bold"
//                 : "text-green-600 font-bold"
//             }
//           >
//             {(info.violation_rate * 100).toFixed(1)}%
//           </span>
//         </p>

//         <p className="text-sm">
//           Nhãn phát hiện:
//           <br />
//           {info.detections?.length > 0 ? (
//             info.detections.map((d, i) => (
//               <span
//                 key={i}
//                 className="inline-block px-2 py-1 bg-gray-200 text-gray-800 rounded-lg mr-2 mt-1 text-xs"
//               >
//                 {d.label} ({(d.score * 100).toFixed(1)}%)
//               </span>
//             ))
//           ) : (
//             <span className="text-gray-500"> Không có </span>
//           )}
//         </p>
//       </div>

//       <ViolationHistory alerts={info.alerts} />
//     </div>
//   );
// }

// /* ----------------------------- VIOLATION HISTORY ----------------------------- */

// function ViolationHistory({ alerts }) {
//   return (
//     <div className="mt-4">
//       <h4 className="text-sm font-semibold">🚨 Lịch sử vi phạm</h4>

//       <div className="max-h-32 overflow-y-auto mt-1 border rounded-md p-2 text-sm bg-gray-50">
//         {alerts.length > 0 ? (
//           alerts.map((a, i) => (
//             <div key={i} className="border-b py-1">
//               <div>
//                 <span className="text-gray-600">
//                   {new Date(a.ts).toLocaleTimeString()}
//                 </span>{" "}
//                 -{" "}
//                 <span className="text-red-600 font-bold">
//                   {a.behavior || a.detections?.[0]?.label}
//                 </span>
//               </div>

//               <div className="text-xs text-gray-600">
//                 Thời gian: {(a.duration / 1000).toFixed(1)}s
//               </div>

//               {a.evidence && <ViolationEvidence evidence={a.evidence} bbox={a.bbox} />}
//             </div>
//           ))
//         ) : (
//           <p className="text-gray-500 italic">Chưa có cảnh báo</p>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ----------------------------- VIOLATION EVIDENCE ----------------------------- */

// function ViolationEvidence({ evidence, bbox }) {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     if (!evidence || !canvasRef.current) return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     const img = new Image();
//     img.src = evidence;

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;

//       ctx.drawImage(img, 0, 0);

//       if (bbox) {
//         ctx.strokeStyle = "red";
//         ctx.lineWidth = 3;
//         ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
//       }
//     };
//   }, [evidence, bbox]);

//   return <canvas ref={canvasRef} className="w-20 mt-1 rounded shadow" />;
// }

// /* ----------------------------- RIGHT PANEL ----------------------------- */

// function RightPanel({ notifications }) {
//   return (
//     <div className="w-96 bg-white shadow-xl rounded-xl p-4 border overflow-y-auto">
//       <h3 className="text-xl font-bold mb-3">📣 Thông báo vi phạm</h3>

//       {notifications.length === 0 && (
//         <p className="text-gray-500 italic">Không có thông báo nào</p>
//       )}

//       {notifications.map((n, i) => (
//         <div
//           key={i}
//           className="border-l-4 border-red-500 bg-red-50 p-3 rounded mb-3"
//         >
//           <div className="font-bold text-red-700">
//             👤 Sinh viên: {n.student}
//           </div>
//           <div className="text-sm text-red-600">
//             Hành vi: <b>{n.behavior}</b>
//           </div>
//           <div className="text-sm text-gray-700">
//             Thời gian: {(n.duration / 1000).toFixed(1)}s
//           </div>
//           <div className="text-xs text-gray-500">
//             {new Date(n.ts).toLocaleTimeString()}
//           </div>

//           {n.evidence && (
//             <ViolationEvidence evidence={n.evidence} bbox={n.bbox} />
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

// Code 4 - TeacherLive.jsx

// Final

// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});
//   const [notifications, setNotifications] = useState([]);

//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         // ================================================
//         // 🔔 THÔNG BÁO VI PHẠM
//         // ================================================
//         if (msg.type === "violation_detected") {
//           const item = {
//             student: msg.student,
//             behavior: msg.behavior,
//             duration: msg.duration,
//             ts: msg.timestamp,
//             evidence: msg.evidence, // ảnh đã vẽ bbox
//           };

//           setNotifications((prev) => [item, ...prev]);

//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;
//             const entry = next[sid] || { alerts: [] };

//             entry.alerts = [
//               {
//                 ts: msg.timestamp,
//                 behavior: msg.behavior,
//                 duration: msg.duration,
//                 evidence: msg.evidence,
//               },
//               ...entry.alerts,
//             ];

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 🎥 LIVE FRAME
//         // ================================================
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64; // ảnh có bbox
//             entry.detections = msg.detections || [];
//             entry.violation_rate = msg.violation_rate;
//             entry.ts = msg.ts;

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 👤 NEW STUDENT JOIN
//         // ================================================
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Error:", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="flex h-screen bg-gray-100 p-4 space-x-4">

//       {/* LEFT — LIVE MONITOR */}
//       <div className="flex-1 overflow-y-auto">

//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <h2 className="text-3xl font-bold">🎥 Giám sát phòng thi</h2>
//             <p className="text-gray-600">Phòng thi: {examId}</p>
//           </div>

//           <span
//             className={
//               "px-4 py-2 rounded-xl text-white text-sm font-bold " +
//               (wsConnected ? "bg-green-600" : "bg-red-600")
//             }
//           >
//             {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//           </span>
//         </div>

//         {/* STUDENT GRID */}
//         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
//           {Object.entries(students).map(([sid, info]) => (
//             <div
//               key={sid}
//               className="bg-white shadow-lg rounded-xl p-4 border border-gray-200"
//             >
//               <h3 className="text-lg font-semibold mb-2">
//                 👤 {sid}
//               </h3>

//               {/* LIVE FRAME */}
//               <div
//                 className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center"
//                 style={{ height: "220px" }}
//               >
//                 {info.frame_b64 ? (
//                   <img src={info.frame_b64} className="max-w-full max-h-full object-contain" />
//                 ) : (
//                   <p className="text-white">No Frame</p>
//                 )}
//               </div>

//               {/* DETECTION INFO */}
//               <div className="mt-3 text-sm">
//                 <p>
//                   Mức độ vi phạm:{" "}
//                   <span
//                     className={
//                       info.violation_rate > 0.3
//                         ? "text-red-600 font-bold"
//                         : "text-green-600 font-bold"
//                     }
//                   >
//                     {(info.violation_rate * 100).toFixed(1)}%
//                   </span>
//                 </p>
//               </div>

//               {/* ALERT HISTORY */}
//               <div className="mt-4">
//                 <h4 className="text-sm font-semibold">🚨 Lịch sử vi phạm</h4>

//                 <div className="max-h-32 overflow-y-auto mt-1 border rounded-md p-2 text-sm bg-gray-50">
//                   {info.alerts.length > 0 ? (
//                     info.alerts.map((a, i) => (
//                       <div key={i} className="border-b py-1">
//                         <div className="text-gray-600">
//                           {new Date(a.ts).toLocaleTimeString()} -{" "}
//                           <span className="text-red-600 font-bold">{a.behavior}</span>
//                         </div>
//                         <div className="text-xs text-gray-600">
//                           Thời gian: {(a.duration / 1000).toFixed(1)}s
//                         </div>

//                         {a.evidence && (
//                           <img src={a.evidence} className="w-20 mt-1 rounded" />
//                         )}
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-gray-500 italic">Chưa có cảnh báo</p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* RIGHT — NOTIFICATIONS */}
//       <div className="w-96 bg-white shadow-xl rounded-xl p-4 border overflow-y-auto">
//         <h3 className="text-xl font-bold mb-3">📣 Thông báo vi phạm</h3>

//         {notifications.length === 0 && (
//           <p className="text-gray-500 italic">Không có thông báo nào</p>
//         )}

//         {notifications.map((n, i) => (
//           <div
//             key={i}
//             className="border-l-4 border-red-500 bg-red-50 p-3 rounded mb-3"
//           >
//             <div className="font-bold text-red-700">👤 {n.student}</div>
//             <div className="text-sm text-red-600">
//               Hành vi: <b>{n.behavior}</b>
//             </div>
//             <div className="text-sm text-gray-700">
//               Thời gian: {(n.duration / 1000).toFixed(1)}s
//             </div>
//             <div className="text-xs text-gray-500">
//               {new Date(n.ts).toLocaleTimeString()}
//             </div>

//             {n.evidence && (
//               <img src={n.evidence} className="w-full rounded mt-2 shadow" />
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// Final (3)
// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import { LogOut, CalendarDays, GraduationCap } from "lucide-react";
// import { FaPlay, FaClock, FaCheckCircle, FaCamera } from "react-icons/fa";
// import { Link } from "react-router-dom";
// import { FiSearch } from "react-icons/fi";
// import { FiBell, FiUser } from "react-icons/fi";

// import { useSelector } from "react-redux";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});
//   const [notifications, setNotifications] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [search, setSearch] = useState("");
//   const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

//   const verifyInfo = useSelector((state) => state.verify.verifyInfo);

//   useEffect(() => {
//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         // ================================================
//         // 🔔 THÔNG BÁO VI PHẠM
//         // ================================================
//         if (msg.type === "violation_detected") {
//           const item = {
//             student: msg.student,
//             behavior: msg.behavior,
//             duration: msg.duration,
//             ts: msg.timestamp,
//             evidence: msg.evidence, // ảnh đã vẽ bbox
//           };

//           setNotifications((prev) => [item, ...prev]);

//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;
//             const entry = next[sid] || { alerts: [] };

//             entry.alerts = [
//               {
//                 ts: msg.timestamp,
//                 behavior: msg.behavior,
//                 duration: msg.duration,
//                 evidence: msg.evidence,
//               },
//               ...entry.alerts,
//             ];

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 🎥 LIVE FRAME
//         // ================================================
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;

//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64; // ảnh có bbox
//             entry.detections = msg.detections || [];
//             entry.violation_rate = msg.violation_rate;
//             entry.ts = msg.ts;

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // ================================================
//         // 👤 NEW STUDENT JOIN
//         // ================================================
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Error:", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="flex flex-col h-screen bg-gray-100 gap-4">
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
//       <div className="mt-6 px-8">
//         <div className="flex flex-col">
//           {/* HEADER */}
//           <div className="mb-4 flex items-center justify-between">
//             <div className="bg-white shadow-md rounded-2xl p-2 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="p-3 bg-blue-100 text-blue-600 rounded-full text-xl">
//                   <FaCamera />
//                 </div>
//                 <div>
//                   <h2 className="text-lg md:text-md font-semibold text-gray-800">
//                      {verifyInfo.examName} - {verifyInfo.sessionName} - {verifyInfo.className}
//                   </h2>
//                   <p className="text-gray-500 text-sm mt-1">
//                     Mã bài thi:{" "}
//                     <span className="font-medium text-gray-700">{examId}</span>
//                   </p>
//                 </div>
//               </div>
//               {/* Bạn có thể thêm nút hành động ở đây nếu cần */}
//             </div>

//             <span
//               className={
//                 "px-3 py-1 rounded-lg text-white text-xs font-bold shadow " +
//                 (wsConnected ? "bg-green-600" : "bg-red-600")
//               }
//             >
//               {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//             </span>
//           </div>
//           <div className="flex ">
//             <div className="flex-1 overflow-y-auto pr-2">
//               {/* NEW SMART GRID */}
//               <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 pb-10">
//                 {Object.entries(students).map(([sid, info]) => {
//                   const risk = info.violation_rate || 0;
//                   const riskColor =
//                     risk > 0.6
//                       ? "border-red-500"
//                       : risk > 0.3
//                       ? "border-yellow-400"
//                       : "border-green-500";

//                   return (
//                     <div
//                       key={sid}
//                       className={`bg-white rounded-xl p-3 shadow-sm border-2 ${riskColor}`}
//                     >
//                       {/* TITLE */}
//                       <div className="flex justify-between items-center mb-2">
//                         <h3 className="text-sm font-semibold">👤 {sid}</h3>

//                         <span
//                           className={`text-xs font-bold ${
//                             risk > 0.6
//                               ? "text-red-600"
//                               : risk > 0.3
//                               ? "text-yellow-500"
//                               : "text-green-600"
//                           }`}
//                         >
//                           {Math.round(risk * 100)}%
//                         </span>
//                       </div>

//                       {/* CAM FRAME */}
//                       <div
//                         className="w-full bg-black rounded-md overflow-hidden flex items-center justify-center"
//                         style={{ height: "180px" }}
//                       >
//                         {info.frame_b64 ? (
//                           <img
//                             src={info.frame_b64}
//                             className="w-full h-full object-cover"
//                           />
//                         ) : (
//                           <p className="text-white text-xs">No Frame</p>
//                         )}
//                       </div>

//                       {/* ALERT HISTORY */}
//                       <div className="mt-3">
//                         <h4 className="text-xs font-semibold text-gray-700 mb-1">
//                           🚨 Vi phạm gần đây
//                         </h4>

//                         <div className="max-h-24 overflow-y-auto bg-gray-50 border rounded-md p-2 text-xs space-y-2">
//                           {info.alerts.length ? (
//                             info.alerts.map((a, i) => (
//                               <div key={i} className="border-b pb-1">
//                                 <div className="flex justify-between">
//                                   <span className="font-bold text-red-600">
//                                     {a.behavior}
//                                   </span>
//                                   <span className="text-gray-500">
//                                     {new Date(a.ts).toLocaleTimeString()}
//                                   </span>
//                                 </div>
//                                 <div className="text-gray-600">
//                                   Thời gian: {(a.duration / 1000).toFixed(1)}s
//                                 </div>

//                                 {a.evidence && (
//                                   <img
//                                     src={a.evidence}
//                                     className="w-14 mt-1 rounded cursor-pointer hover:scale-150 transition"
//                                   />
//                                 )}
//                               </div>
//                             ))
//                           ) : (
//                             <p className="italic text-gray-400">Không có</p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* RIGHT — NOTIFICATIONS */}
//             {/* <div className="w-80 bg-white shadow-lg rounded-xl p-4 border overflow-y-auto sticky top-4 h-[calc(60vh-2rem)]">
//               <h3 className="text-xl font-bold mb-3">📣 Thông báo</h3>

//               {notifications.length === 0 && (
//                 <p className="text-gray-400 italic">Không có thông báo nào</p>
//               )}

//               {notifications.map((n, i) => (
//                 <div
//                   key={i}
//                   className="border-l-4 border-red-500 bg-red-50 p-3 rounded mb-4"
//                 >
//                   <div className="font-bold text-red-700">👤 {n.student}</div>
//                   <div className="text-sm text-red-600">
//                     Hành vi: <b>{n.behavior}</b>
//                   </div>
//                   <div className="text-sm text-gray-700">
//                     Thời gian: {(n.duration / 1000).toFixed(1)}s
//                   </div>
//                   <div className="text-xs text-gray-500">
//                     {new Date(n.ts).toLocaleTimeString()}
//                   </div>

//                   {n.evidence && (
//                     <img
//                       src={n.evidence}
//                       className="w-full rounded mt-2 shadow"
//                     />
//                   )}
//                 </div>
//               ))}
//             </div> */}
//             {/* RIGHT — NOTIFICATIONS */}
//             <div className="w-80 bg-white shadow-lg rounded-xl p-4 border sticky top-4 flex flex-col h-[calc(60vh-2rem)]">
//               {/* HEADER */}
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="text-xl font-bold">📣 Thông báo</h3>

//                 {/* Nút mở modal */}
//                 <button
//                   onClick={() => setShowModal(true)}
//                   className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//                 >
//                   Xem tất cả
//                 </button>
//               </div>

//               {/* Danh sách thông báo xem nhanh (rút gọn) */}
//               <div className="overflow-y-auto max-h-72">
//                 {notifications.length === 0 && (
//                   <p className="text-gray-400 italic">Không có thông báo nào</p>
//                 )}

//                 {notifications.slice(0, 6).map((n, i) => (
//                   <div
//                     key={i}
//                     className="border-l-4 border-red-500 bg-red-50 p-3 rounded-lg mb-4 shadow-sm"
//                   >
//                     <div className="flex items-center justify-between mb-1">
//                       <div className="font-bold text-red-700 text-sm">
//                         👤 {n.student}
//                       </div>
//                       <div className="text-xs text-gray-500">
//                         {new Date(n.ts).toLocaleTimeString()}
//                       </div>
//                     </div>

//                     <div className="text-sm text-red-600 mb-1">
//                       Hành vi: <b>{n.behavior}</b>
//                     </div>

//                     <div className="text-sm text-gray-700 mb-1">
//                       Thời gian: {(n.duration / 1000).toFixed(1)}s
//                     </div>

//                     {n.evidence && (
//                       <img
//                         src={n.evidence}
//                         className="w-full rounded-md mt-2 shadow-sm object-cover max-h-28"
//                       />
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//       {showModal && (
//         <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 border border-gray-200">
//           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-200">
//             {/* HEADER */}
//             <div className="flex items-center justify-between p-4  bg-gray-50 rounded-t-xl">
//               <h2 className="text-xl font-bold flex items-center gap-2">
//                 <FiBell className="text-blue-600" /> Tất cả thông báo
//               </h2>

//               <div className="flex items-center gap-3">
//                 {/* Nút đổi chế độ xem */}
//                 <button
//                   onClick={() => setViewMode("list")}
//                   className={`px-3 py-1 rounded text-sm border border-blue-400 ${
//                     viewMode === "list"
//                       ? "bg-blue-600 text-white"
//                       : "bg-white text-gray-600"
//                   }`}
//                 >
//                   Tỉ lệ 1:1
//                 </button>

//                 <button
//                   onClick={() => setViewMode("grid")}
//                   className={`px-3 py-1 rounded text-sm border border-blue-200 ${
//                     viewMode === "grid"
//                       ? "bg-blue-600 text-white"
//                       : "bg-white text-gray-600"
//                   }`}
//                 >
//                   Tỉ lệ 1:3
//                 </button>

//                 <button
//                   onClick={() => setShowModal(false)}
//                   className="text-red-600 text-lg font-semibold hover:text-red-800"
//                 >
//                   ✕
//                 </button>
//               </div>
//             </div>

//             {/* SEARCH */}
//             <div className="p-3 bg-gray-100">
//               <div className="relative">
//                 {/* ICON SEARCH */}
//                 <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />

//                 {/* INPUT */}
//                 <input
//                   type="text"
//                   placeholder="Tìm theo mã sinh viên..."
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                   className="w-full pl-10 pr-3 py-2 border border-blue-200/90 rounded-md
//                  focus:outline-none focus:ring-2 focus:ring-blue-400"
//                 />
//               </div>
//             </div>

//             {/* BODY */}
//             <div className="p-4 overflow-y-auto">
//               {/* GRID MODE — 3 CỘT */}
//               {viewMode === "grid" && (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//                   {notifications
//                     .filter((n) =>
//                       n.student.toLowerCase().includes(search.toLowerCase())
//                     )
//                     .map((n, i) => (
//                       <div
//                         key={i}
//                         className="bg-blue-50 border border-blue-300 rounded-lg p-2 shadow hover:bg-blue-100 transition"
//                       >
//                         <div className="font-bold text-blue-700 text-sm">
//                           👤 {n.student}
//                         </div>

//                         <div className="text-xs text-gray-500 mb-1">
//                           {new Date(n.ts).toLocaleString()}
//                         </div>

//                         {n.evidence && (
//                           <img
//                             src={n.evidence}
//                             className="w-full rounded-md object-contain max-h-40 bg-white p-1 shadow cursor-pointer hover:scale-[1.03] transition"
//                           />
//                         )}

//                         <div className="text-xs text-blue-700 mt-1">
//                           {n.behavior}
//                         </div>
//                       </div>
//                     ))}
//                 </div>
//               )}

//               {/* LIST MODE — 1 CỘT ĐẦY ĐỦ */}
//               {viewMode === "list" && (
//                 <>
//                   {notifications
//                     .filter((n) =>
//                       n.student.toLowerCase().includes(search.toLowerCase())
//                     )
//                     .map((n, i) => (
//                       <div
//                         key={i}
//                         className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-lg mb-4 shadow-sm hover:bg-blue-100 transition"
//                       >
//                         <div className="flex items-center justify-between mb-1">
//                           <div className="font-bold text-blue-700 text-sm  items-center gap-1  flex items-center justify-center ">
//                             <div>
//                               {" "}
//                               <FiUser />
//                             </div>{" "}
//                             <div>{n.student}</div>
//                           </div>
//                           <div className="text-xs text-gray-500">
//                             {new Date(n.ts).toLocaleString()}
//                           </div>
//                         </div>

//                         <div className="text-sm text-blue-700 mb-1">
//                           Hành vi: <b>{n.behavior}</b>
//                         </div>

//                         <div className="text-sm text-gray-700 mb-2">
//                           Thời gian vi phạm: {(n.duration / 1000).toFixed(1)}s
//                         </div>

//                         {n.evidence && (
//                           <div className="w-full bg-white rounded-md p-2 shadow-sm">
//                             <img
//                               src={n.evidence}
//                               className="w-full rounded-md max-h-60 object-contain cursor-pointer hover:scale-[1.02] transition"
//                             />
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                 </>
//               )}

//               {/* Empty State */}
//               {notifications.filter((n) =>
//                 n.student.toLowerCase().includes(search.toLowerCase())
//               ).length === 0 && (
//                 <p className="text-gray-500 italic">Không có kết quả nào</p>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import React, { useEffect, useState } from "react";
// import { useSearchParams, Link } from "react-router-dom";
// import { LogOut, GraduationCap } from "lucide-react";
// import { FaCamera } from "react-icons/fa";
// import { FiSearch, FiBell, FiUser } from "react-icons/fi";
// import { useSelector } from "react-redux";

// import { getStudentsInSession } from "../services/services";

// export default function TeacherLive() {
//   const [params] = useSearchParams();
//   const examId = params.get("exam");
//   const sessionId = params.get("session");

//   const [wsConnected, setWsConnected] = useState(false);
//   const [students, setStudents] = useState({});
//   const [notifications, setNotifications] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [search, setSearch] = useState("");
//   const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
//   const [listStudents, setListStudents] = useState([]);

//   const verifyInfo = useSelector((state) => state.verify.verifyInfo);
//   // Hàm chung xử lý các vi phạm
//   function handleViolation(msg) {
//     const item = {
//       student: msg.student,
//       behavior: msg.behavior,
//       duration: msg.duration || 0,
//       ts: msg.timestamp || Date.now(),
//       evidence: msg.evidence,
//     };

//     setNotifications((prev) => [item, ...prev]);

//     setStudents((prev) => {
//       const next = { ...prev };
//       const sid = msg.student;
//       const entry = next[sid] || { alerts: [] };

//       entry.alerts = [
//         {
//           ts: msg.timestamp || Date.now(),
//           behavior: msg.behavior,
//           duration: msg.duration || 0,
//           evidence: msg.evidence,
//         },
//         ...entry.alerts,
//       ];

//       next[sid] = entry;
//       return next;
//     });
//   }

//   const getListStudentsFromExamSession = async () => {
//     const res = await getStudentsInSession(sessionId);
//     console.log(res);
//     if (res.success) {
//       setListStudents(res.students);
//     }
//   };

//   useEffect(() => {
//     getListStudentsFromExamSession();

//     const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);

//     ws.onopen = () => setWsConnected(true);
//     ws.onclose = () => setWsConnected(false);

//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);

//         // Vi phạm chung
//         if (msg.type === "violation_detected") {
//           handleViolation(msg);
//         }

//         // Vi phạm face alert (người lạ / nhiều người)
//         if (msg.type === "face_alert") {
//           handleViolation({
//             student: msg.student,
//             behavior: msg.reason || "unknown_face_persistent",
//             duration: msg.duration || 0,
//             timestamp: msg.ts,
//             evidence: msg.evidence,
//           });
//         }

//         // LIVE FRAME
//         if (msg.type === "student_frame") {
//           setStudents((prev) => {
//             const next = { ...prev };
//             const sid = msg.student;
//             const entry = next[sid] || { alerts: [] };

//             entry.frame_b64 = msg.frame_b64;
//             entry.detections = msg.detections || [];
//             entry.violation_rate = msg.violation_rate;
//             entry.ts = msg.ts;

//             next[sid] = entry;
//             return next;
//           });
//         }

//         // NEW STUDENT JOIN
//         if (msg.type === "student_joined") {
//           setStudents((prev) => {
//             if (prev[msg.student]) return prev;
//             return { ...prev, [msg.student]: { alerts: [] } };
//           });
//         }
//       } catch (e) {
//         console.error("WS Error:", e);
//       }
//     };

//     return () => ws.close();
//   }, [examId]);

//   return (
//     <div className="flex flex-col h-screen bg-gray-100 gap-4">
//       {/* NAVBAR */}
//       <nav className="backdrop-blur-xl bg-white/60 border-b border-indigo-200 shadow-sm sticky top-0 z-50">
//         <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
//           <Link
//             to="/teacher_dashboard"
//             className="font-bold text-2xl text-indigo-600 flex items-center gap-2"
//           >
//             <GraduationCap size={28} />
//             Smart Exam
//           </Link>

//           <div className="flex items-center gap-6 text-gray-700 font-medium">
//             <Link
//               to="/teacher_dashboard"
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

//       <div className="mt-6 px-8 flex-1 overflow-hidden">
//         <div className="flex flex-col h-full">
//           {/* HEADER */}
//           <div className="mb-4 flex items-center justify-between">
//             <div className="bg-white shadow-md rounded-2xl p-4 flex items-center gap-4 flex-1 mr-4">
//               <div className="p-3 bg-blue-100 text-blue-600 rounded-full text-xl">
//                 <FaCamera />
//               </div>
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-800">
//                   {verifyInfo?.examName} - {verifyInfo?.sessionName} -{" "}
//                   {verifyInfo?.className}
//                 </h2>
//                 <p className="text-gray-500 text-sm mt-1">
//                   Mã bài thi:{" "}
//                   <span className="font-medium text-gray-700">{examId}</span>
//                 </p>
//               </div>
//             </div>

//             <span
//               className={`px-4 py-2 rounded-lg text-white text-sm font-bold shadow ${
//                 wsConnected ? "bg-green-600" : "bg-red-600"
//               }`}
//             >
//               {wsConnected ? "Đang kết nối" : "Mất kết nối"}
//             </span>
//           </div>

//           <div className="flex gap-6 flex-1 overflow-hidden">
//             {/* GRID STUDENTS */}
//             <div className="flex-1 overflow-y-auto pr-2">
//               <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 pb-10">
//                 {Object.entries(students).map(([sid, info]) => {
//                   const risk = info.violation_rate || 0;
//                   const riskColor =
//                     risk > 0.6
//                       ? "border-red-500"
//                       : risk > 0.3
//                       ? "border-yellow-400"
//                       : "border-green-500";

//                   return (
//                     <div
//                       key={sid}
//                       className={`bg-white rounded-xl p-4 shadow-md border-4 ${riskColor} transition-all`}
//                     >
//                       <div className="flex justify-between items-center mb-3">
//                         <h3 className="text-lg font-bold">👤 {sid}</h3>
//                         <span
//                           className={`text-lg font-bold ${
//                             risk > 0.6
//                               ? "text-red-600"
//                               : risk > 0.3
//                               ? "text-yellow-600"
//                               : "text-green-600"
//                           }`}
//                         >
//                           {Math.round(risk * 100)}%
//                         </span>
//                       </div>

//                       <div
//                         className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center"
//                         style={{ height: "200px" }}
//                       >
//                         {info.frame_b64 ? (
//                           <img
//                             src={info.frame_b64}
//                             alt="student frame"
//                             className="w-full h-full object-cover"
//                           />
//                         ) : (
//                           <p className="text-gray-400">Chưa có hình</p>
//                         )}
//                       </div>

//                       {/* ALERT HISTORY */}
//                       <div className="mt-4">
//                         <h4 className="text-sm font-semibold text-gray-700 mb-2">
//                           Vi phạm gần đây
//                         </h4>
//                         <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs space-y-2">
//                           {info.alerts.length > 0 ? (
//                             info.alerts.slice(0, 5).map((a, i) => (
//                               <div
//                                 key={i}
//                                 className="border-b border-gray-300 pb-2 last:border-0"
//                               >
//                                 <div className="flex justify-between">
//                                   <span
//                                     className={`font-bold ${
//                                       [
//                                         "unknown_face_persistent",
//                                         "multi_face",
//                                       ].includes(a.behavior)
//                                         ? "text-red-600"
//                                         : "text-orange-600"
//                                     }`}
//                                   >
//                                     {a.behavior}
//                                   </span>
//                                   <span className="text-gray-500">
//                                     {new Date(a.ts).toLocaleTimeString()}
//                                   </span>
//                                 </div>
//                                 {a.duration > 0 && (
//                                   <div className="text-gray-600">
//                                     Thời gian: {(a.duration / 1000).toFixed(1)}s
//                                   </div>
//                                 )}
//                               </div>
//                             ))
//                           ) : (
//                             <p className="italic text-gray-400">
//                               Chưa có vi phạm
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* RIGHT — NOTIFICATIONS */}
//             <div className="w-96 bg-white shadow-xl rounded-2xl p-5 border flex flex-col">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-2xl font-bold flex items-center gap-2">
//                   Thông báo
//                 </h3>
//                 <button
//                   onClick={() => setShowModal(true)}
//                   className="text-blue-600 hover:text-blue-800 font-medium text-sm"
//                 >
//                   Xem tất cả →
//                 </button>
//               </div>

//               <div className="flex-1 overflow-y-auto space-y-3">
//                 {notifications.length === 0 && (
//                   <p className="text-gray-400 italic text-center py-8">
//                     Chưa có thông báo nào
//                   </p>
//                 )}

//                 {notifications.slice(0, 8).map((n, i) => (
//                   <div
//                     key={i}
//                     className={`border-l-4 p-4 rounded-lg shadow-sm transition-all ${
//                       ["unknown_face_persistent", "multi_face"].includes(
//                         n.behavior
//                       )
//                         ? "border-red-500 bg-red-50"
//                         : "border-blue-500 bg-blue-50"
//                     }`}
//                   >
//                     <div className="flex items-center justify-between mb-2">
//                       <div className="font-bold text-lg flex items-center gap-2">
//                         <FiUser /> {n.student}
//                       </div>
//                       <div className="text-xs text-gray-500">
//                         {new Date(n.ts).toLocaleTimeString()}
//                       </div>
//                     </div>

//                     <div className="font-semibold mb-1">{n.behavior}</div>
//                     {n.duration > 0 && (
//                       <div className="text-sm text-gray-700">
//                         Thời gian: {(n.duration / 1000).toFixed(1)}s
//                       </div>
//                     )}

//                     {n.evidence && (
//                       <img
//                         src={n.evidence}
//                         alt="evidence"
//                         className="mt-3 w-full rounded-lg shadow-md object-cover max-h-40 cursor-pointer hover:scale-105 transition"
//                       />
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* MODAL - TẤT CẢ THÔNG BÁO */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
//             {/* Header */}
//             <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
//               <h2 className="text-2xl font-bold flex items-center gap-3">
//                 <FiBell size={28} /> Tất cả thông báo vi phạm
//               </h2>
//               <button
//                 onClick={() => {
//                   setShowModal(false);
//                   setSearch("");
//                 }}
//                 className="text-3xl font-bold hover:text-red-200"
//               >
//                 ×
//               </button>
//             </div>

//             {/* Search & View Mode */}
//             <div className="p-4 bg-gray-100 border-b">
//               <div className="flex gap-4 items-center">
//                 <div className="flex-1 relative">
//                   <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
//                   <input
//                     type="text"
//                     placeholder="Tìm theo mã sinh viên..."
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setViewMode("list")}
//                     className={`px-4 py-2 rounded-lg font-medium transition ${
//                       viewMode === "list"
//                         ? "bg-blue-600 text-white"
//                         : "bg-gray-200 text-gray-700"
//                     }`}
//                   >
//                     Danh sách
//                   </button>
//                   <button
//                     onClick={() => setViewMode("grid")}
//                     className={`px-4 py-2 rounded-lg font-medium transition ${
//                       viewMode === "grid"
//                         ? "bg-blue-600 text-white"
//                         : "bg-gray-200 text-gray-700"
//                     }`}
//                   >
//                     Lưới ảnh
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Body */}
//             <div className="flex-1 overflow-y-auto p-6">
//               {notifications.filter((n) =>
//                 n.student.toLowerCase().includes(search.toLowerCase())
//               ).length === 0 ? (
//                 <p className="text-center text-gray-500 py-12 text-lg">
//                   Không tìm thấy thông báo nào
//                 </p>
//               ) : viewMode === "grid" ? (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {notifications
//                     .filter((n) =>
//                       n.student.toLowerCase().includes(search.toLowerCase())
//                     )
//                     .map((n, i) => (
//                       <div
//                         key={i}
//                         className={`rounded-xl overflow-hidden shadow-lg border-2 ${
//                           ["unknown_face_persistent", "multi_face"].includes(
//                             n.behavior
//                           )
//                             ? "border-red-500"
//                             : "border-blue-500"
//                         }`}
//                       >
//                         {n.evidence && (
//                           <img
//                             src={n.evidence}
//                             alt="evidence"
//                             className="w-full h-48 object-cover"
//                           />
//                         )}
//                         <div className="p-4 bg-white">
//                           <div className="font-bold text-lg">{n.student}</div>
//                           <div className="text-sm text-gray-600">
//                             {new Date(n.ts).toLocaleString()}
//                           </div>
//                           <div className="mt-2 font-semibold text-red-600">
//                             {n.behavior}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {notifications
//                     .filter((n) =>
//                       n.student.toLowerCase().includes(search.toLowerCase())
//                     )
//                     .map((n, i) => (
//                       <div
//                         key={i}
//                         className={`p-5 rounded-xl shadow-md border-l-8 ${
//                           ["unknown_face_persistent", "multi_face"].includes(
//                             n.behavior
//                           )
//                             ? "border-red-500 bg-red-50"
//                             : "border-blue-500 bg-blue-50"
//                         }`}
//                       >
//                         <div className="flex justify-between items-start">
//                           <div>
//                             <div className="text-xl font-bold">{n.student}</div>
//                             <div className="text-gray-600">
//                               {new Date(n.ts).toLocaleString()}
//                             </div>
//                           </div>
//                           <span className="text-sm font-medium bg-gray-200 px-3 py-1 rounded-full">
//                             {n.duration > 0
//                               ? `${(n.duration / 1000).toFixed(1)}s`
//                               : "Tức thì"}
//                           </span>
//                         </div>
//                         <div className="mt-3 text-lg font-semibold">
//                           {n.behavior}
//                         </div>
//                         {n.evidence && (
//                           <img
//                             src={n.evidence}
//                             alt="evidence"
//                             className="mt-4 w-full max-h-96 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition"
//                           />
//                         )}
//                       </div>
//                     ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useSearchParams, Link } from "react-router-dom";
import {
  LogOut,
  GraduationCap,
  X,
  Search,
  Bell,
  User,
  Grid,
  List,
  Users,
} from "lucide-react";
import { FaCamera } from "react-icons/fa";
import { useSelector } from "react-redux";
import { getStudentsInSession } from "../services/services";
import { useEffect, useState } from "react";

// Lightbox component đơn giản (không cần thư viện)
const Lightbox = ({ src, onClose }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-8"
    onClick={onClose}
  >
    <div className="relative max-w-4xl max-h-full">
      <button
        onClick={onClose}
        className="absolute -top-12 right-0 text-white text-4xl hover:text-red-400 transition"
      >
        ×
      </button>
      <img
        src={src}
        alt="Phóng to"
        className="max-w-screen-lg max-h-screen object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export default function TeacherLive() {
  const [params] = useSearchParams();
  const examId = params.get("exam");
  const sessionId = params.get("session");
  const [wsConnected, setWsConnected] = useState(false);
  const [students, setStudents] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [listStudents, setListStudents] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const verifyInfo = useSelector((state) => state.verify.verifyInfo);

  // Logic xử lý vi phạm (giữ nguyên)
  function handleViolation(msg) {
    const item = {
      student: msg.student,
      behavior: msg.behavior,
      duration: msg.duration || 0,
      ts: msg.timestamp || Date.now(),
      evidence: msg.evidence,
    };
    setNotifications((prev) => [item, ...prev]);
    setStudents((prev) => {
      const next = { ...prev };
      const sid = msg.student;
      const entry = next[sid] || { alerts: [] };
      entry.alerts = [
        {
          ts: msg.timestamp || Date.now(),
          behavior: msg.behavior,
          duration: msg.duration || 0,
          evidence: msg.evidence,
        },
        ...entry.alerts,
      ];
      next[sid] = entry;
      return next;
    });
  }

  const getListStudentsFromExamSession = async () => {
    const res = await getStudentsInSession(sessionId);
    if (res.success) setListStudents(res.students);
  };

  useEffect(() => {
    getListStudentsFromExamSession();
    const ws = new WebSocket(`ws://localhost:8000/ws/teacher?exam=${examId}`);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "violation_detected") handleViolation(msg);
        if (msg.type === "face_alert")
          handleViolation({
            student: msg.student,
            behavior: msg.reason || "unknown_face_persistent",
            duration: msg.duration || 0,
            timestamp: msg.ts,
            evidence: msg.evidence,
          });
        if (msg.type === "student_frame") {
          setStudents((prev) => {
            const next = { ...prev };
            const entry = next[msg.student] || { alerts: [] };
            entry.frame_b64 = msg.frame_b64;
            entry.detections = msg.detections || [];
            entry.violation_rate = msg.violation_rate;
            entry.ts = msg.ts;
            next[msg.student] = entry;
            return next;
          });
        }
        if (msg.type === "student_joined") {
          setStudents((prev) => {
            if (prev[msg.student]) return prev;
            return { ...prev, [msg.student]: { alerts: [] } };
          });
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    };
    return () => ws.close();
  }, [examId]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* NAVBAR HIỆN ĐẠI */}
        <nav className="backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/teacher_dashboard" className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Smart Exam
              </span>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6 text-gray-700 font-medium">
                <Link
                  to="/teacher_dashboard"
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
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 rounded-full">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    G
                  </div>
                  <span className="font-medium text-gray-800">Giáo viên</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow transition">
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-8xl mx-auto px-4 py-4">
          {/* HEADER + TRẠNG THÁI */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 justify-between bg-white/20 backdrop-blur-md rounded-2xl px-2 py-2 border border-white/50 flex items-center gap-6">
              <div className="flex justify-center items-center">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mr-4">
                  <FaCamera className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className=" font-bold text-gray-800">
                    {verifyInfo?.examName} — {verifyInfo?.sessionName}
                  </h1>
                  <p className="text-gray-600 mt-1 font-mono">
                    Lớp:{" "}
                    <span className="font-semibold">
                      {verifyInfo?.className}
                    </span>{" "}
                    | Mã bài thi:{" "}
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono">
                      {examId}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowStudentList(true)}
                  className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Users size={20} />
                  Danh sách SV
                </button>

                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-white shadow-lg ${
                    wsConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      wsConnected ? "bg-white animate-pulse" : "bg-white/50"
                    }`}
                  />
                  {wsConnected ? "Đang kết nối" : "Mất kết nối"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* DANH SÁCH SINH VIÊN LIVE */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-300px)] pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(students).map(([sid, info]) => {
                  const risk = info.violation_rate || 0;
                  const riskLevel =
                    risk > 0.6 ? "high" : risk > 0.3 ? "medium" : "low";
                  return (
                    <div
                      key={sid}
                      className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-4 transition-all
                        ${
                          riskLevel === "high"
                            ? "border-red-500"
                            : riskLevel === "medium"
                            ? "border-yellow-400"
                            : "border-emerald-500"
                        }
                      `}
                    >
                      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {Math.round(risk * 100)}%
                      </div>

                      <div className="p-4 pb-0">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <User size={20} /> {sid}
                        </h3>
                      </div>

                      <div className="relative bg-gray-900 aspect-video overflow-hidden">
                        {info.frame_b64 ? (
                          <img
                            src={info.frame_b64}
                            alt={sid}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setLightboxSrc(info.frame_b64)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            Chưa có hình ảnh
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Vi phạm gần đây
                        </p>
                        <div className="text-xs space-y-1 max-h-28 overflow-y-auto">
                          {info.alerts.length === 0 ? (
                            <p className="text-gray-400 italic">
                              Chưa có vi phạm
                            </p>
                          ) : (
                            info.alerts.slice(0, 4).map((a, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs"
                              >
                                <span className="font-medium text-red-600">
                                  {a.behavior}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(a.ts).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT THÔNG BÁO */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className=" font-medium flex items-center gap-3 text-gray-800">
                  <Bell className="text-indigo-600" size={24} />
                  Thông báo vi phạm
                </h3>
                <button
                  onClick={() => setShowNotiModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Xem tất cả 
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 italic">
                    Chưa có thông báo nào
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl shadow-md border-l-4 transition-all
                        ${
                          ["unknown_face_persistent", "multi_face"].includes(
                            n.behavior
                          )
                            ? "border-red-500 bg-red-50"
                            : "border-orange-500 bg-orange-50"
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-lg">{n.student}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(n.ts).toLocaleTimeString()}
                          </div>
                        </div>
                        {n.duration > 0 && (
                          <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded-full">
                            {(n.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mt-2 text-gray-800">
                        {n.behavior}
                      </p>
                      {n.evidence && (
                        <img
                          src={n.evidence}
                          alt="Bằng chứng"
                          className="mt-3 w-full rounded-lg shadow cursor-pointer hover:scale-105 transition"
                          onClick={() => setLightboxSrc(n.evidence)}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL TẤT CẢ THÔNG BÁO */}
        {showNotiModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-200 p-3   text-white">
                <div className="flex items-center justify-between">
                  <h2 className=" font-bold flex items-center gap-4">
                    <Bell size={24} /> Tất cả thông báo vi phạm
                  </h2>
                  <button
                    onClick={() => {
                      setShowNotiModal(false);
                      setSearch("");
                    }}
                    className="text-4xl hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-3  bg-gray-50">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Tìm theo mã sinh viên..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-6 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-2 py-1 rounded-xl flex items-center gap-2 transition ${
                        viewMode === "list"
                          ? "bg-emerald-400 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <List size={16} /> Danh sách
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-2 py-1 rounded-xl flex items-center gap-2 transition ${
                        viewMode === "grid"
                          ? "bg-emerald-400 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <Grid size={16} /> Lưới ảnh
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Nội dung giữ nguyên logic lọc và hiển thị */}
                {notifications.filter((n) =>
                  n.student.toLowerCase().includes(search.toLowerCase())
                ).length === 0 ? (
                  <p className="text-center py-20 text-gray-500 text-xl">
                    Không tìm thấy thông báo nào
                  </p>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {notifications
                      .filter((n) =>
                        n.student.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((n, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl overflow-hidden shadow-xl border-4 ${
                            ["unknown_face_persistent", "multi_face"].includes(
                              n.behavior
                            )
                              ? "border-red-500"
                              : "border-orange-500"
                          }`}
                        >
                          {n.evidence ? (
                            <img
                              src={n.evidence}
                              alt="evidence"
                              className="w-full h-56 object-cover cursor-pointer"
                              onClick={() => setLightboxSrc(n.evidence)}
                            />
                          ) : (
                            <div className="bg-gray-200 h-56 flex items-center justify-center">
                              Không có ảnh
                            </div>
                          )}
                          <div className="p-4 bg-white">
                            <p className="font-bold text-lg">{n.student}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(n.ts).toLocaleString()}
                            </p>
                            <p className="mt-2 font-semibold text-red-600">
                              {n.behavior}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {notifications
                      .filter((n) =>
                        n.student.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((n, i) => (
                        <div
                          key={i}
                          className={`p-6 rounded-2xl shadow-lg border-l-8 ${
                            ["unknown_face_persistent", "multi_face"].includes(
                              n.behavior
                            )
                              ? "border-red-500 bg-red-50"
                              : "border-orange-500 bg-orange-50"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-2xl font-bold">
                                {n.student}
                              </h4>
                              <p className="text-gray-600">
                                {new Date(n.ts).toLocaleString()}
                              </p>
                            </div>
                            {n.duration > 0 && (
                              <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                                {(n.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                          <p className="text-xl font-bold text-gray-800">
                            {n.behavior}
                          </p>
                          {n.evidence && (
                            <img
                              src={n.evidence}
                              alt="Bằng chứng"
                              className="mt-4 w-full max-h-96 object-contain rounded-xl shadow-lg cursor-pointer hover:scale-[1.02] transition"
                              onClick={() => setLightboxSrc(n.evidence)}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DANH SÁCH SINH VIÊN */}
        {showStudentList && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold flex items-center gap-4">
                    <Users size={36} /> Danh sách sinh viên tham gia
                  </h2>
                  <button
                    onClick={() => setShowStudentList(false)}
                    className="text-4xl hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {listStudents.length === 0 ? (
                  <p className="text-center text-gray-500 py-20 text-xl">
                    Chưa có sinh viên nào tham gia
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {listStudents.map((st) => (
                      <div
                        key={st._id}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg text-center hover:shadow-2xl transition"
                      >
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl mb-4">
                          {st.face_image ? (
                            <img
                              src={`data:image/jpeg;base64,${st.face_image}`}
                              alt={st.name}
                              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition"
                              onClick={() =>
                                setLightboxSrc(
                                  `data:image/jpeg;base64,${st.face_image}`
                                )
                              }
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                              No Image
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-lg text-gray-800">
                          {st.name || st.studentId}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{st.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxSrc && (
          <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        )}
      </div>
    </>
  );
}
