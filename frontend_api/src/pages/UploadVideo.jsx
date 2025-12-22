// import { useState } from "react";

// export default function UploadVideo() {
//   const [file, setFile] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState([]);
//   const [summary, setSummary] = useState(null);

//   const handleUpload = async () => {
//     if (!file) return alert("Vui lòng chọn file video!");

//     const formData = new FormData();
//     formData.append("file", file);

//     setLoading(true);
//     setResults([]);
//     setSummary(null);

//     try {
//       const res = await fetch("http://localhost:8000/api/analyze-video", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await res.json();

//       // ---- FIX LOGIC: map lại dữ liệu trả về ----
//       setSummary({
//         total: data.total_violations,
//         json: data.json_file,
//         txt: data.txt_file,
//       });

//       setResults(
//         data.violations.map((v) => ({
//           ...v,
//           // unify môc thời gian
//           _displayTime:
//             v.timestamp !== undefined
//               ? `${v.timestamp} ms`
//               : `${v.start_ts} → ${v.end_ts} ms`,
//         }))
//       );
//     } catch (err) {
//       console.error(err);
//       alert("Có lỗi khi phân tích video!");
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 text-slate-800 font-sans">
//       <div className="max-w-6xl mx-auto">
//         <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight ">
//               API <span className="text-blue-600">Smart Exam</span>
//             </h1>
//             <p className="text-slate-500 font-medium">
//               Hệ thống phân tích hành vi và nhận diện vi phạm tự động
//             </p>
//           </div>
//           <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
//             STATUS: <span className="text-green-500">Online</span>
//           </div>
//         </header>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
//           {/* LEFT SIDE */}
//           <div className="lg:col-span-4 space-y-6">
//             {/* Upload */}
//             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
//               <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
//                 Cấu hình tải lên
//               </h2>

//               <div className="relative group border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center cursor-pointer">
//                 <input
//                   type="file"
//                   accept="video/*"
//                   onChange={(e) => setFile(e.target.files[0])}
//                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//                 />

//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   strokeWidth={1.5}
//                   stroke="currentColor"
//                   className="w-10 h-10 text-blue-500 mb-3"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
//                   />
//                 </svg>

//                 <p className="text-sm font-bold text-slate-700">
//                   {file ? file.name : "Chọn tệp Video phân tích"}
//                 </p>
//                 <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
//                   MP4, AVI, MKV up to 500MB
//                 </p>
//               </div>

//               <button
//                 onClick={handleUpload}
//                 disabled={loading || !file}
//                 className={`mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
//                   loading
//                     ? "bg-slate-100 text-slate-400 cursor-not-allowed"
//                     : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-blue-100 active:scale-95"
//                 }`}
//               >
//                 {loading ? "Processing..." : "Phân tích ngay"}
//               </button>
//             </div>

//             {/* Summary */}
//             {summary && (
//               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
//                 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
//                   Báo cáo tóm tắt
//                 </h2>

//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
//                     <span className="text-sm font-bold text-red-700">
//                       Tổng vi phạm
//                     </span>
//                     <span className="text-2xl font-black text-red-700">
//                       {summary.total}
//                     </span>
//                   </div>

//                   <div className="space-y-2">
//                     <div className="p-2 border rounded-lg text-xs text-slate-500 bg-slate-50">
//                       JSON: {summary.json}
//                     </div>
//                     <div className="p-2 border rounded-lg text-xs text-slate-500 bg-slate-50">
//                       TXT: {summary.txt}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* RIGHT SIDE - DETAILS */}
//           <div className="lg:col-span-8">
//             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
//               <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
//                 <h3 className="font-black text-slate-700 uppercase tracking-tight">
//                   Chi tiết phát hiện
//                 </h3>
//                 <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
//                   {results.length} DETECTION(S)
//                 </span>
//               </div>

//               {/* Table */}
//               {results.length > 0 ? (
//                 <table className="w-full text-left border-collapse">
//                   <thead>
//                     <tr className="border-b border-slate-100">
//                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                         Loại
//                       </th>
//                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                         Nội dung vi phạm
//                       </th>
//                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
//                         Thời gian
//                       </th>
//                     </tr>
//                   </thead>

//                   <tbody className="divide-y divide-slate-50">
//                     {results.map((v, i) => (
//                       <tr key={i} className="hover:bg-blue-50/50 transition">
//                         <td className="px-6 py-5 font-bold text-xs">
//                           {v.type === "behavior" ? (
//                             <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
//                               BEHAVIOR
//                             </span>
//                           ) : (
//                             <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-200">
//                               FACE
//                             </span>
//                           )}
//                         </td>

//                         <td className="px-6 py-5">
//                           <p className="font-bold text-slate-700">
//                             {v.behavior || v.reason}
//                           </p>

//                           {v.faces && (
//                             <p className="text-[11px] text-slate-500">
//                               Phát hiện {v.faces.length} khuôn mặt
//                             </p>
//                           )}
//                         </td>

//                         <td className="px-6 py-5 text-right text-[11px] font-mono font-bold text-slate-600">
//                           {v._displayTime}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <div className="text-center py-32 text-slate-400 text-xs">
//                   Chưa có dữ liệu phân tích
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* <footer className="mt-12 text-center text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">
//           &copy;
//         </footer> */}
//       </div>
//     </div>
//   );
// }

import { useState } from "react";

// Map nhãn sang mô tả
const behaviorMap = {
  hand_move: "Cử động tay bất thường",
  mobile_use: "Sử dụng điện thoại trong khi thi",
  side_watching: "Nghiêng mặt / xoay mặt sang hướng khác",
  mouth_open: "Mở miệng bất thường/ Có dấu hiệu trao đổi",
  eye_movement: "Đảo mắt bất thường/nhìn ra ngoài màn hình",
  look_away: "Đảo mắt bất thường/nhìn ra ngoài màn hình",
  multi_face: "Phát hiện nhiều người trong khung hình",
  mismatch_face: "Khuôn mặt không khớp/nghi vấn thi hộ",
  unknown_face: "Khuôn mặt không khớp/nghi vấn thi hộ",
};

export default function UploadVideo() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalImg, setModalImg] = useState(null); // State hiển thị ảnh phóng to

  const handleUpload = async () => {
    if (!file) return alert("Vui lòng chọn file video!");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const res = await fetch("http://localhost:8000/api/analyze-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      setSummary({
        total: data.total_violations,
        json: data.json_file,
        txt: data.txt_file,
      });

      setResults(
        data.violations.map((v) => ({
          ...v,
          _displayTime:
            v.timestamp !== undefined
              ? `${v.timestamp} s`
              : `${v.start_ts} → ${v.end_ts} s`,
        }))
      );
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi phân tích video!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight ">
              API <span className="text-blue-600">Smart Exam</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Hệ thống phân tích hành vi và nhận diện vi phạm tự động
            </p>
          </div>
          <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
            Trạng thái: <span className="text-green-500">Online</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT SIDE: Upload + Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upload */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Cấu hình tải lên
              </h2>
              <div className="relative group border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-10 h-10 text-blue-500 mb-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
                <p className="text-sm font-bold text-slate-700">
                  {file ? file.name : "Chọn tệp Video phân tích"}
                </p>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                  MP4, AVI, MKV up to 500MB
                </p>
              </div>

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className={`mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                  loading
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-blue-100 active:scale-95"
                }`}
              >
                {loading ? "Processing..." : "Phân tích ngay"}
              </button>
            </div>

            {/* Summary */}
            {summary && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Báo cáo tóm tắt
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                    <span className="text-sm font-bold text-red-700">
                      Tổng vi phạm
                    </span>
                    <span className="text-2xl font-black text-red-700">
                      {summary.total}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 border rounded-lg text-xs text-slate-500 bg-slate-50">
                      JSON: {summary.json}
                    </div>
                    <div className="p-2 border rounded-lg text-xs text-slate-500 bg-slate-50">
                      TXT: {summary.txt}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Results */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]  px-4">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-slate-700 uppercase tracking-tight">
                  Chi tiết phát hiện
                </h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                  {results.length} DETECTION(S)
                </span>
              </div>

              {results.length > 0 ? (
                <table className="w-full text-left border-collapse px-4">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th>Loại</th>
                      <th>Nhãn</th>
                      <th>Hành vi</th>
                      <th>Hình ảnh</th>
                      <th>Tại thời điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs px-4">
                    {results.map((v, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition">
                        <td>{v.type === "behavior" ? "BEHAVIOR" : "FACE"}</td>
                        <td>{v.behavior || v.reason}</td>
                        <td>{behaviorMap[v.behavior || v.reason] || "-"}</td>
                        <td>
                          {v.img_base64 ? (
                            <img
                              src={`data:image/jpeg;base64,${v.img_base64}`}
                              alt="violation"
                              className="w-24 h-16 object-cover rounded border border-red-500 cursor-pointer"
                              onClick={() =>
                                setModalImg(
                                  `data:image/jpeg;base64,${v.img_base64}`
                                )
                              }
                            />
                          ) : (
                            <span className="text-xs text-slate-400">
                              Không có
                            </span>
                          )}
                        </td>
                        <td className="text-center">{(v._displayTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-32 text-slate-400 text-xs">
                  Chưa có dữ liệu phân tích
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal hiển thị ảnh */}
      {modalImg && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setModalImg(null)}
        >
          <img
            src={modalImg}
            alt="Full size"
            className="max-h-[90%] max-w-[90%] rounded-xl shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
