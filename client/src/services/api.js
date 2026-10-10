// src/services/api.js

const API_URL = "/api";

export async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,

    // IMPORTANT:
    // Allows browser to send and receive session cookies
    credentials: "include",

    headers: {
      ...(options.body
        ? {
            "Content-Type": "application/json",
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* =========================================================
   EMPLOYEE AUTH
========================================================= */

export function registerEmployee(name, email, password) {
  return apiRequest("/employee-auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
    }),
  });
}

export function employeeLogin(email, password) {
  return apiRequest("/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
}

export function getCurrentEmployee() {
  return apiRequest("/employee-auth/me");
}

export function employeeLogout() {
  return apiRequest("/employee-auth/logout", {
    method: "POST",
  });
}

/* =========================================================
   ADMIN AUTH
========================================================= */

export function adminLogin(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
}

export function getCurrentAdmin() {
  return apiRequest("/auth/me");
}

// Alias in case your existing components use adminMe()
export function adminMe() {
  return getCurrentAdmin();
}

export function adminLogout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

/* =========================================================
   CERTIFICATES
========================================================= */

export function getCertificates() {
  return apiRequest("/certificates");
}

export function getCertificate(id) {
  return apiRequest(`/certificates/${id}`);
}

export function createCertificate(certificateData) {
  return apiRequest("/certificates", {
    method: "POST",
    body: JSON.stringify(certificateData),
  });
}

export function updateCertificate(id, certificateData) {
  return apiRequest(`/certificates/${id}`, {
    method: "PUT",
    body: JSON.stringify(certificateData),
  });
}

export function deleteCertificate(id) {
  return apiRequest(`/certificates/${id}`, {
    method: "DELETE",
  });
}

/* =========================================================
   PUBLIC CERTIFICATE VERIFICATION
========================================================= */

export function verifyCertificate(token) {
  return apiRequest(`/verify/${encodeURIComponent(token)}`);
}

/* =========================================================
   EMPLOYEE QR
========================================================= */

export function getEmployeeQR() {
  return apiRequest("/employee/qr");
}

export function generateEmployeeQR() {
  return apiRequest("/employee/qr", {
    method: "POST",
  });
}

/* =========================================================
   ADMIN NOTIFICATIONS
========================================================= */

export function getAdminNotifications() {
  return apiRequest("/admin/notifications");
}

export function getAdminUnreadNotificationCount() {
  return apiRequest("/admin/notifications/unread-count");
}

export function markAdminNotificationAsRead(id) {
  return apiRequest(`/admin/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllAdminNotificationsAsRead() {
  return apiRequest("/admin/notifications/read-all", {
    method: "PATCH",
  });
}

/* =========================================================
   EMPLOYEE NOTIFICATIONS
========================================================= */

export function getEmployeeNotifications() {
  return apiRequest("/employee/notifications");
}

export function getEmployeeUnreadNotificationCount() {
  return apiRequest("/employee/notifications/unread-count");
}

export function markEmployeeNotificationAsRead(id) {
  return apiRequest(`/employee/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllEmployeeNotificationsAsRead() {
  return apiRequest("/employee/notifications/read-all", {
    method: "PATCH",
  });
}