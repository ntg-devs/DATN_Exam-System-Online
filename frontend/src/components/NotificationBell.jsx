// // components/NotificationBell.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { markAllRead, pushNotification } from "../redux/slices/notificationSlice";
// import toast, { Toaster } from "react-hot-toast";

// const NotificationBell = ({ studentId }) => {
//   const [open, setOpen] = useState(false);
//   const { latest, unreadCount } = useSelector((state) => state.notification);
//   const dispatch = useDispatch();
//   const wsClassesRef = useRef(null);
//   const wsExamsRef = useRef(null);

//   const toggleDropdown = () => {
//     setOpen(!open);
//     if (unreadCount > 0) dispatch(markAllRead());
//   };

//   const renderNotification = (noti) => {
//     let title = noti.nameNoti || "Thông báo mới";
//     let message = "";

//     if (noti.type === "added_to_session") {
//       message = `Bạn được phân vào ca thi "${noti.nameSession}" của kỳ thi "${noti.nameExam}"`;
//     } else if (noti.type === "class_updated") {
//       message = `Bạn đã được thêm vào lớp "${noti.name}"`;
//     } else {
//       message = noti.message || "";
//     }

//     return (
//       <div
//         key={noti._id || Math.random()}
//         className="p-3 border-b hover:bg-gray-100 cursor-pointer"
//       >
//         <div className="font-semibold">{title}</div>
//         <div className="text-sm text-gray-600">{message}</div>
//         {noti.created_at && (
//           <div className="text-xs text-gray-400">
//             {new Date(noti.created_at).toLocaleString()}
//           </div>
//         )}
//       </div>
//     );
//   };

//   useEffect(() => {
//     // WebSocket lớp học
//     const wsClasses = new WebSocket("ws://localhost:8000/ws/classes");
//     wsClassesRef.current = wsClasses;

//     wsClasses.onmessage = (event) => {
//       const data = JSON.parse(event.data);

//       if (data.type === "class_updated") {
//         const classData = data.class;
//         if (classData.students.map(String).includes(String(studentId))) {
//           dispatch(pushNotification({ ...classData, nameNoti: "Thêm vào lớp học", type: "class_updated" }));
//           toast.success(`Bạn đã được thêm vào lớp học ${classData.name}`);
//         }
//       }
//     };

//     // WebSocket ca thi
//     const wsExams = new WebSocket("ws://localhost:8000/ws/exams");
//     wsExamsRef.current = wsExams;

//     wsExams.onmessage = (ev) => {
//       const data = JSON.parse(ev.data);

//       if (data.type === "added_to_session") {
//         if (data.student_ids.map(String).includes(String(studentId))) {
//           dispatch(pushNotification({
//             type: "added_to_session",
//             nameNoti: "Phân vào ca thi",
//             exam_id: data.exam_id,
//             session_id: data.session_id,
//             nameExam: data.nameExam,
//             nameSession: data.nameSession,
//             student_ids: data.student_ids,
//             created_at: new Date().toISOString()
//           }));
//           toast.success(`Bạn được phân vào ca thi "${data.nameSession}" của kỳ thi "${data.nameExam}"`);
//         }
//       }
//     };

//     return () => {
//       wsClasses.close();
//       wsExams.close();
//     };
//   }, [dispatch, studentId]);

//   return (
//     <div className="relative">
//       <Toaster />
//       {/* Bell Icon */}
//       <button
//         onClick={toggleDropdown}
//         className="relative p-2 rounded-full hover:bg-gray-200 focus:outline-none"
//       >
//         🔔
//         {unreadCount > 0 && (
//           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
//             {unreadCount}
//           </span>
//         )}
//       </button>

//       {/* Dropdown */}
//       {open && (
//         <>
//           <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg z-50 max-h-80 overflow-y-auto border">
//             {latest.length === 0 ? (
//               <div className="p-4 text-gray-500">Không có thông báo mới</div>
//             ) : (
//               latest.map(renderNotification)
//             )}
//           </div>

//           {/* Overlay để click ngoài đóng */}
//           <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
//         </>
//       )}
//     </div>
//   );
// };

// export default NotificationBell;

// components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  markAllRead,
  pushNotification,
} from "../redux/slices/notificationSlice";

const NotificationBell = ({ studentId, toast }) => {
  const [open, setOpen] = useState(false);
  const { latest, unreadCount } = useSelector((state) => state.notification);
  const dispatch = useDispatch();
  const wsClassesRef = useRef(null);
  const wsExamsRef = useRef(null);

  const toggleDropdown = () => {
    setOpen(!open);
    if (unreadCount > 0) dispatch(markAllRead());
  };

  const renderNotification = (noti) => {
    let title = noti.nameNoti || "Thông báo mới";
    let message = "";

    if (noti.type === "added_to_session") {
      message = `Bạn được phân vào ca thi "${noti.nameSession}" của kỳ thi "${noti.nameExam}"`;
    } else if (noti.type === "class_updated") {
      message = `Bạn đã được thêm vào lớp "${noti.name}"`;
    } else {
      message = noti.message || "";
    }

    return (
      <div
        key={noti._id || Math.random()}
        className="flex items-start gap-3 p-4  hover:bg-yellow-100  transition-all cursor-pointer"
      >
        {/* ICON */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-yellow-300 text-blue-600 text-lg shadow-sm">
          🔔
        </div>

        {/* TEXT */}
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{title}</div>

          <div className="text-sm text-gray-600 leading-snug mt-0.5">
            {message}
          </div>

          {noti.created_at && (
            <div className="text-xs text-gray-400 mt-1">
              {new Date(noti.created_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    // WebSocket lớp học
    const wsClasses = new WebSocket("ws://localhost:8000/ws/classes");
    wsClassesRef.current = wsClasses;

    wsClasses.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "class_updated") {
        const classData = data.class;
        if (classData.students.map(String).includes(String(studentId))) {
          dispatch(
            pushNotification({
              ...classData,
              nameNoti: "Thêm vào lớp học",
              type: "class_updated",
            })
          );
          toast.success(`Bạn đã được thêm vào lớp học ${classData.name}`);
        }
      }
    };

    // WebSocket ca thi
    const wsExams = new WebSocket("ws://localhost:8000/ws/exams");
    // const wsExams = new WebSocket("wss://https://unworkable-bernie-merely.ngrok-free.dev/ws/exams");
    // const wsExams = new WebSocket("wss://103.142.24.110:8000/ws/exams");
    wsExamsRef.current = wsExams;

    wsExams.onmessage = (ev) => {
      const data = JSON.parse(ev.data);

      if (data.type === "added_to_session") {
        if (data.student_ids.map(String).includes(String(studentId))) {
          dispatch(
            pushNotification({
              type: "added_to_session",
              nameNoti: "Phân vào ca thi",
              exam_id: data.exam_id,
              session_id: data.session_id,
              nameExam: data.nameExam,
              nameSession: data.nameSession,
              student_ids: data.student_ids,
              created_at: new Date().toISOString(),
            })
          );
          toast.success(
            `Bạn được phân vào ca thi "${data.nameSession}" của kỳ thi "${data.nameExam}"`
          );
        }
      }
    };

    return () => {
      wsClasses.close();
      wsExams.close();
    };
  }, [dispatch, studentId]);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-gray-200 focus:outline-none"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg z-50 max-h-80 overflow-y-auto border-[1px] border-solid border-gray-600">
            {latest.length === 0 ? (
              <div className="p-4 text-gray-500">Không có thông báo mới</div>
            ) : (
              latest.map(renderNotification)
            )}
          </div>

          {/* Overlay để click ngoài đóng */}
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
