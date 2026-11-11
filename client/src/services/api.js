// ============================================================
// src/services/api.js — the ONLY place the React app talks to the API
// ============================================================
//
// RULES FOR THE WHOLE FRONT-END
// -----------------------------
// 1. Never call `fetch()` directly in a page/component. Use `apiRequest`
//    or one of the named helpers below. (Two pages used their own fetch
//    with a different base URL, which in production sent their requests
//    to a different server — without the login cookie.)
// 2. Never store tokens in localStorage. Login sessions are httpOnly
//    cookies set by the server; `credentials: "include"` sends them.
// 3. Errors: a failed request throws an Error with:
//       error.message  -> safe text to show the user
//       error.status   -> HTTP status (401, 404 ...)
//       error.data     -> full JSON body from the server
// ============================================================

/**
 * Base URL of the backend.
 *   - Set VITE_API_URL in client/.env to override.
 *   - Dev default: the local API on port 5000.
 *   - Prod default: the deployed API.
 */
export const API_BASE_URL = `${(
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://esparks-certificate-portal-server.vercel.app")
).replace(/\/+$/, "")}/api`;

/**
 * Low-level request helper.
 *
 * @param {string} path      e.g. "/admin/certificates"
 * @param {RequestInit & { quiet401?: boolean }} [options]
 *        quiet401: don't log 401s (used for "am I logged in?" checks,
 *        where 401 is an expected answer, not an error).
 * @returns {Promise<any>} parsed JSON body
 */
export async function apiRequest(path, options = {}) {
  const { quiet401 = false, headers, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
    });
  } catch (networkError) {
    // fetch only throws when the server could not be reached at all.
    const error = new Error(
      "Cannot reach the server. Check your internet connection and try again.",
    );
    error.cause = networkError;
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.data = data;
    if (!(quiet401 && response.status === 401) && import.meta.env.DEV) {
      console.error(
        `API ${fetchOptions.method || "GET"} ${path} -> ${response.status}`,
        data,
      );
    }
    throw error;
  }

  return data;
}

// Small shortcuts so call sites read naturally.
const get = (path, options) => apiRequest(path, options);
const send = (method, path, body) =>
  apiRequest(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const id = (value) => encodeURIComponent(String(value));

/* =========================================================
   EMPLOYEE AUTH            (server: routes/employeeAuth.routes.js)
========================================================= */

export const registerEmployee = (name, email, password) =>
  send("POST", "/employee-auth/register", {
    name: name.trim(),
    email: email.trim(),
    password,
  });
export const employeeLogin = (email, password) =>
  send("POST", "/employee-auth/login", { email: email.trim(), password });
export const getCurrentEmployee = (options) =>
  get("/employee-auth/me", options);
export const employeeLogout = () => send("POST", "/employee-auth/logout");

/* =========================================================
   ADMIN AUTH               (server: routes/adminAuth.routes.js)
========================================================= */

export const adminLogin = (email, password) =>
  send("POST", "/auth/login", { email: email.trim(), password });
export const getCurrentAdmin = (options) => get("/auth/me", options);
export const adminLogout = () => send("POST", "/auth/logout");

/* =========================================================
   PASSWORD RESET  (type = "admin" | "employee")
========================================================= */

const authPrefix = (type) => (type === "admin" ? "/auth" : "/employee-auth");
export const requestPasswordReset = (type, email) =>
  send("POST", `${authPrefix(type)}/forgot-password`, { email: email.trim() });
export const resetPassword = (type, token, password) =>
  send("POST", `${authPrefix(type)}/reset-password`, { token, password });

/* =========================================================
   ADMIN — EMPLOYEES        (server: routes/adminEmployees.routes.js)
========================================================= */

export const getAdminEmployees = () => get("/admin/employees");
export const getAdminEmployee = (employeeId) =>
  get(`/admin/employees/${id(employeeId)}`);
export const setEmployeeActive = (employeeId, isActive) =>
  send("PATCH", `/admin/employees/${id(employeeId)}/status`, {
    is_active: isActive,
  });

/* =========================================================
   ADMIN — CERTIFICATES     (server: routes/adminCertificates.routes.js)
========================================================= */

export const getAdminCertificates = () => get("/admin/certificates");
export const getAdminCertificate = (certificateId) =>
  get(`/admin/certificates/${id(certificateId)}`);
export const createCertificate = (data) =>
  send("POST", "/admin/certificates", data);
export const updateCertificate = (certificateId, data) =>
  send("PUT", `/admin/certificates/${id(certificateId)}`, data);

/**
 * @param {number} certificateId
 * @param {{ reason?: string, deactivateEmployee?: boolean }} [options]
 */
export const revokeAdminCertificate = (certificateId, options = {}) =>
  send("PATCH", `/admin/certificates/${id(certificateId)}/revoke`, {
    reason: options.reason?.trim() || undefined,
    deactivateEmployee: options.deactivateEmployee === true,
  });

// Permanent delete is two steps: request an emailed OTP, then confirm.
export const requestCertificateDeleteOtp = (certificateId) =>
  send("POST", `/admin/certificates/${id(certificateId)}/delete-otp`);
export const confirmCertificateDelete = (certificateId, challengeId, otp) =>
  send("POST", `/admin/certificates/${id(certificateId)}/confirm-delete`, {
    challengeId,
    otp,
  });

/* =========================================================
   ADMIN — CERTIFICATE REQUESTS
========================================================= */

export const getAdminCertificateRequests = () =>
  get("/admin/certificate-requests");
export const getAdminCertificateRequest = (requestId) =>
  get(`/admin/certificate-requests/${id(requestId)}`);
export const rejectCertificateRequest = (requestId, reason) =>
  send("POST", `/admin/certificate-requests/${id(requestId)}/reject`, {
    reason,
  });

/* =========================================================
   EMPLOYEE AREA            (server: routes/employee.routes.js)
========================================================= */

export const getEmployeeCertificates = () => get("/employee/certificates");
export const getEmployeeCertificateRequests = () =>
  get("/employee/certificate-requests");
export const submitCertificateRequest = (data) =>
  send("POST", "/employee/certificate-requests", data);
export const getEmployeeQR = () => get("/employee/qr");

/* =========================================================
   PUBLIC VERIFICATION      (server: routes/verify.routes.js)
   Response: { valid, status: "valid" | "revoked" | "invalid", certificate }
========================================================= */

export const verifyCertificate = (token) => get(`/verify/${id(token)}`);

/* =========================================================
   NOTIFICATIONS            (server: routes/notifications.routes.js)
========================================================= */

export const getAdminNotifications = () => get("/admin/notifications");
export const getAdminUnreadNotificationCount = () =>
  get("/admin/notifications/unread-count");
export const markAdminNotificationAsRead = (notificationId) =>
  send("PATCH", `/admin/notifications/${id(notificationId)}/read`);
export const markAllAdminNotificationsAsRead = () =>
  send("PATCH", "/admin/notifications/read-all");

export const getEmployeeNotifications = () => get("/employee/notifications");
export const getEmployeeUnreadNotificationCount = () =>
  get("/employee/notifications/unread-count");
export const markEmployeeNotificationAsRead = (notificationId) =>
  send("PATCH", `/employee/notifications/${id(notificationId)}/read`);
export const markAllEmployeeNotificationsAsRead = () =>
  send("PATCH", "/employee/notifications/read-all");
