import { URL_API } from "../utils/path";

const API_URL = `${URL_API}/`;
// const API_URL = "https://103.142.24.110:8000/api/";
// const API_URL = "https://unworkable-bernie-merely.ngrok-free.dev/api/";

// 🧩 Lấy danh sách phòng thi
export async function getExams() {
  try {
    const res = await fetch(API_URL + "exams", {
      method: "GET",
    });
    if (!res.ok) throw new Error("Không thể lấy danh sách phòng thi");
    return await res.json();
  } catch (err) {
    console.error("[❌] Lỗi getExams:", err);
    return [];
  }
}

export async function getExamsByTeacher(payload) {
  try {
    const res = await fetch(API_URL + "exams_by_teacher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching exams:", err);
    return null;
  }
}


// 🧩 Tạo phòng thi mới
// export async function createExam(payload) {
//   try {
//     const res = await fetch(API_URL + "create-exam", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       alert(data.detail || "Tạo phòng thi thất bại!");
//       return false;
//     }

//     return data.success;
//   } catch (err) {
//     console.error("[❌] Lỗi createExam:", err);
//     return false;
//   }
// }

// 🧩 Tạo phòng thi mới
export async function createAccount(payload) {
  try {
    const res = await fetch(API_URL + "create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[❌] Lỗi tạo tài khoản:", data);
      throw new Error(data.detail || "Tạo tài khoản thất bại!");
    }

    return data;
  } catch (err) {
    console.error("[❌] Lỗi kết nối server:", err);
    throw err;
  }
}

/**
 * Lấy danh sách tất cả users (giảng viên và sinh viên)
 * @param {Object} payload { role?: 'teacher'|'student' } - Optional filter theo role
 */
export async function getAllUsers(payload = {}) {
  try {
    const res = await fetch(API_URL + "get-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách users!");

    const data = await res.json();
    return data; // { success: true, users: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getAllUsers:", err);
    return { success: false, users: [] };
  }
}

/**
 * Cập nhật thông tin tài khoản
 * @param {Object} payload { id, name, email, student_id, role }
 */
export async function updateUser(payload) {
  try {
    const res = await fetch(API_URL + "update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Cập nhật tài khoản thất bại!");

    return data; // { success: true, user: {...} }
  } catch (err) {
    console.error("[❌] Lỗi updateUser:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * Xóa tài khoản theo id
 * @param {string} id
 */
export async function deleteUser(id) {
  try {
    const res = await fetch(API_URL + "delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Xóa tài khoản thất bại!");

    return data; // { success: true }
  } catch (err) {
    console.error("[❌] Lỗi deleteUser:", err);
    return { success: false, detail: err.message };
  }
}
export async function toggleAccountStatus(id) {
  try {
    console.log(id)
    const res = await fetch(API_URL + "toggle-user-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Thay đổi trạng thái tài khoản thất bại!");

    return data; // { success: true }
  } catch (err) {
    console.error("[❌] Lỗi deleteUser:", err);
    return { success: false, detail: err.message };
  }
}
export async function getAccountByFace(payload) {
  try {
    const res = await fetch(API_URL + "login_face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[❌] Lỗi khi lấy thông tin tài khoản:", data);
      throw new Error(data.detail || "Lấy thông tin tài khoản thất bại!");
    }

    return data;
  } catch (err) {
    console.error("[❌] Lỗi kết nối server:", err);
    throw err;
  }
}

export const teacherLogin = async (payload) => {
  try {
    const res = await fetch(`${URL_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // const res = await fetch("https://103.142.24.110:8000/api/login", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    return { success: false, detail: "Lỗi server" };
  }
};

// ================================
// 🏫 QUẢN LÝ LỚP HỌC GIẢNG VIÊN & HỌC SINH
// ================================

/**
 * 🧩 Lấy danh sách lớp học theo user (teacher hoặc student)
 * @param {Object} payload { user_id: string, role: 'teacher'|'student' }
 */
export async function getClasses(payload) {
  try {
    console.log(payload)
    const res = await fetch(API_URL + "get-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách lớp học!");

    const data = await res.json();
    return data; // { success: true, classes: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getClasses:", err);
    return { success: false, classes: [] };
  }
}

/**
 * 🧩 Tạo lớp học mới
 * @param {Object} payload 
 * {
 *   name: string,          // tên lớp
 *   code: string,          // mã lớp do giảng viên đặt
 *   teacher_id: string,
 *   visibility: 'public'|'private',
 *   password?: string
 * }
 */
export async function createClass(payload) {
  try {
    const res = await fetch(API_URL + "create-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // payload chứa code
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[❌] Lỗi tạo lớp:", data);
      return { success: false, detail: data.detail || "Tạo lớp thất bại!" };
    }

    return data; // { success: true, class: {...} }
  } catch (err) {
    // Kiểm tra lỗi
    console.error("[❌] Lỗi kết nối khi tạo lớp:", err);
    return { success: false, detail: "Lỗi server" };
      throw new Error(data.detail || "Tạo lớp thất bại!");
  }
}

    // Trả về kết quả
/**
 * 🧩 Lấy danh sách lịch thi của một lớp
 * @param {Object} payload { class_id: string }
    throw err;
 */
export async function getExamsByClass(payload) {
  try {
    const res = await fetch(API_URL + "get-exams-by-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách lịch thi!");

    const data = await res.json();
    return data; // { success: true, exams: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getExamsByClass:", err);
    return { success: false, exams: [] };
  }
}

/**
 * 🧩 Thêm sinh viên vào lớp học (dành cho giảng viên)
 * @param {Object} payload { class_id: string, student_ids: [] }
 */
export async function addStudentsToClass(payload) {
  try {
    const res = await fetch(API_URL + "add-students-to-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Thêm sinh viên thất bại!");

    return data; // { success: true }
  } catch (err) {
    console.error("[❌] Lỗi addStudentsToClass:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * 🧩 Lấy danh sách sinh viên
 * @param {Object} payload { teacher_id?: string }
 */
export async function getStudents(payload = {}) {
  try {
    const res = await fetch(API_URL + "get-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách sinh viên!");

    const data = await res.json();
    return data; // { success: true, students: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudents:", err);
    return { success: false, students: [] };
  }
}

export async function getStudentsInClass({ class_id }) {
  try {
    const res = await fetch(API_URL + "get-students-in-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id }),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách sinh viên thuộc lớp!");

    const data = await res.json();
    return data; // { success: true, students: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentsInClass:", err);
    return { success: false, students: [] };
  }
}

export async function getStudentsNotInClass({ class_id }) {
  try {
    const res = await fetch(API_URL + "get-students-not-in-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id }),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách sinh viên chưa thuộc lớp!");

    const data = await res.json();
    return data; // { success: true, students: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentsNotInClass:", err);
    return { success: false, students: [] };
  }
}

export async function getStudentsNotInSession(payload) {
  try {
    const res = await fetch(API_URL + "get-students-not-in-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách sinh viên chưa có trong ca thi!");

    const data = await res.json();
    return data; // { success: true, students: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentsNotInSession:", err);
    return { success: false, students: [] };
  }
}


/**
 * 🧩 Học sinh tham gia lớp học
 * @param {string} class_id
 * @param {string} student_id
 * @param {string} [password] - chỉ cần cho lớp private
 */
export async function joinClass(class_id, student_id, password = "") {
  try {
    const res = await fetch(API_URL + "join-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id, student_id, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Không thể tham gia lớp học!");

    return data; // { success: true }
  } catch (err) {
    console.error("[❌] Lỗi joinClass:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * 🧩 Tạo lịch thi mới
 * @param {Object} payload { class_id, name, code, start_time, duration, created_by }
 */
export async function createExam(payload) {
  try {
    const res = await fetch(API_URL + "create-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Tạo lịch thi thất bại!");

    return data; // { success: true, exam: {...} }
  } catch (err) {
    console.error("[❌] Lỗi createExam:", err);
    return { success: false, detail: err.message };
  }
}


// export async function getClassById(classId) {
//   try {
//     const res = await fetch(API_URL + `get-class/${classId}`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });

//     return await res.json();
//   } catch (err) {
//     console.error("Lỗi khi fetch class by ID:", err);
//     return { success: false, class: null };
//   }
// }

export async function getClassById(payload) {
  try {
    const res = await fetch(API_URL + `get-class`,{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error("Lỗi khi fetch class by ID:", err);
    return { success: false, class: null };
  }
}

// Logic liên quan đến lịch sử minh chứng vi phạm

export async function getInfoViolation(payload) {
  try {
    const res = await fetch(API_URL + "teacher/violations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lấy thống tin lịch sử minh chứng vi phạm thất bại!");

    return data; // { success: true, exam: {...} }
  } catch (err) {
    console.error("[❌] Lỗi createExam:", err);
    return { success: false, detail: err.message };
  }
}


export async function getStudentViolations(student_code) {
  try {
    const res = await fetch(API_URL + "student/violations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_code }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lấy lịch sử vi phạm thất bại!");
    return data; // { student_code: "...", violations: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentViolations:", err);
    return { success: false, detail: err.message, violations: [] };
  }
}



export async function addStudentsToExamSession(payload) {
  try {
    const res = await fetch(API_URL + "exam-session/add-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Thêm sinh viên vào ca thi thất bại!");

    return data; // { success: true, session: { ... } }
  } catch (err) {
    console.error("[❌] Lỗi addStudentsToExamSession:", err);
    return { success: false, detail: err.message };
  }
}


export async function createExamSession(payload) {
  try {
    const res = await fetch(API_URL + "exam-session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Tạo ca thi thất bại!");

    return data; // { success: true, session: {...} }
  } catch (err) {
    console.error("[❌] Lỗi createExamSession:", err);
    return { success: false, detail: err.message };
  }
}


export async function getExamSessions(payload) {
  try {
    const res = await fetch(API_URL + "exam-session/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lấy danh sách ca thi thất bại!");

    return data; // { success: true, sessions: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getExamSessions:", err);
    return { success: false, detail: err.message, sessions: [] };
  }
}

export async function getStudentsInSession(session_id) {
  try {
    const res = await fetch(API_URL + "get-students-in-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Không thể lấy danh sách sinh viên!");
    return data; // { success: true, students: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentsInSession:", err);
    return { success: false, students: [] };
  }
}


export async function getExamSessionDetail(session_id) {
  try {
    const res = await fetch(API_URL + `exam-session/detail/${session_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lấy chi tiết ca thi thất bại!");

    return data; // { success: true, session: {...} }
  } catch (err) {
    console.error("[❌] Lỗi getExamSessionDetail:", err);
    return { success: false, detail: err.message };
  }
}

export async function removeStudentFromSession({ session_id, student_id }) {
  try {
    const res = await fetch(API_URL + "exam-session/remove-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, student_id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Xóa sinh viên khỏi ca thi thất bại!");

    return data; // { success: true }
  } catch (err) {
    console.error("[❌] Lỗi removeStudentFromSession:", err);
    return { success: false, detail: err.message };
  }
}

// ================================
// 🎓 ADMIN: Quản lý môn học
// ================================

/**
 * Admin: Lấy tất cả lớp học (môn học)
 */
export async function adminGetAllClasses() {
  try {
    const res = await fetch(API_URL + "admin/get-all-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách môn học!");

    const data = await res.json();
    return data; // { success: true, classes: [...] }
  } catch (err) {
    console.error("[❌] Lỗi adminGetAllClasses:", err);
    return { success: false, classes: [] };
  }
}

/**
 * Admin: Tạo môn học và phân giảng viên
 * @param {Object} payload { name, code, teacher_id, description? }
 */
export async function adminCreateSubject(payload) {
  try {
    const res = await fetch(API_URL + "admin/create-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Tạo môn học thất bại!");

    return data; // { success: true, subject: {...} }
  } catch (err) {
    console.error("[❌] Lỗi adminCreateSubject:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * Admin: Lấy danh sách tất cả giảng viên
 */
export async function adminGetAllTeachers() {
  try {
    const res = await fetch(API_URL + "admin/get-all-teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error("Không thể lấy danh sách giảng viên!");

    const data = await res.json();
    return data; // { success: true, teachers: [...] }
  } catch (err) {
    console.error("[❌] Lỗi adminGetAllTeachers:", err);
    return { success: false, teachers: [] };
  }
}

/**
 * Đổi mật khẩu cho user
 * @param {Object} payload { user_id, current_password, new_password }
 */
export async function changePassword(payload) {
  try {
    const res = await fetch(API_URL + "change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Đổi mật khẩu thất bại!");

    return data; // { success: true, message: "..." }
  } catch (err) {
    console.error("[❌] Lỗi changePassword:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * Kiểm tra trạng thái xử lý đăng ký danh tính
 * @param {Object} payload { student_id }
 */
export async function checkFaceRegistrationStatus(payload) {
  try {
    const res = await fetch(API_URL + "check-face-registration-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Không thể kiểm tra trạng thái!");

    return data; // { success: true, status: "pending|processing|completed|failed", can_join_exam: boolean }
  } catch (err) {
    console.error("[❌] Lỗi checkFaceRegistrationStatus:", err);
    return { success: false, detail: err.message };
  }
}

/**
 * Lấy danh sách ca thi hiện tại của sinh viên
 * @param {Object} payload { student_id }
 */
export async function getStudentCurrentSessions(payload) {
  try {
    const res = await fetch(API_URL + "student/current-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Không thể lấy danh sách ca thi!");

    return data; // { success: true, sessions: [...] }
  } catch (err) {
    console.error("[❌] Lỗi getStudentCurrentSessions:", err);
    return { success: false, detail: err.message, sessions: [] };
  }
}

/**
 * 📊 Tạo báo cáo tổng hợp cho admin
 * @param {Object} payload { start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD", class_id: string (optional) }
 */
export async function generateReport(payload) {
  try {
    const res = await fetch(API_URL + "admin/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Không thể tạo báo cáo!");

    return data; // { success: true, report: {...} }
  } catch (err) {
    console.error("[❌] Lỗi generateReport:", err);
    return { success: false, detail: err.message };
  }
}
