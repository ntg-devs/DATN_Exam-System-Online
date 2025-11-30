const API_URL = "http://127.0.0.1:8000/api/";

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
    const res = await fetch("http://localhost:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

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
    console.error("[❌] Lỗi kết nối khi tạo lớp:", err);
    return { success: false, detail: "Lỗi server" };
  }
}

/**
 * 🧩 Lấy danh sách lịch thi của một lớp
 * @param {Object} payload { class_id: string }
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
