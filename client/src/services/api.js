// src/services/api.js

// const API_URL =
//   "https://esparks-certificate-portal-server.vercel.app/api";

const API_URL = `${(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api`;

/* =========================================================
   BASE API REQUEST
========================================================= */



export async function apiRequest(path, options = {}) {
  const { quiet401 = false, ...fetchOptions } = options;
  const url = `${API_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: "include",
      headers: {
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data?.message || data?.error || `Request failed with status ${response.status}`
      );
      error.status = response.status;
      error.data = data;
      error.url = url;
      throw error;
    }

    return data;
  } catch (error) {
    if (!(quiet401 && error.status === 401)) {
      console.error(`API Error [${fetchOptions.method || "GET"}] ${url}:`, error);
    }
    throw error;
  }
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

export function adminMe() {
  return getCurrentAdmin();
}

export function adminLogout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

/* =========================================================
   ADMIN EMPLOYEES
========================================================= */

export function getAdminEmployees() {
  return apiRequest("/admin/employees");
}

/* =========================================================
   ADMIN CERTIFICATES
========================================================= */

export function getAdminCertificates() {
  return apiRequest("/admin/certificates");
}

export function revokeAdminCertificate(id) {
  return apiRequest(
    `/admin/certificates/${encodeURIComponent(id)}/revoke`,
    {
      method: "PATCH",
    }
  );
}

/* =========================================================
   ADMIN CERTIFICATE REQUESTS
========================================================= */

export function getAdminCertificateRequests() {
  return apiRequest("/admin/certificate-requests");
}

/* =========================================================
   CERTIFICATES
========================================================= */

export function getCertificates() {
  return apiRequest("/certificates");
}

export function getCertificate(id) {
  return apiRequest(`/certificates/${encodeURIComponent(id)}`);
}

export function createCertificate(certificateData) {
  return apiRequest("/certificates", {
    method: "POST",
    body: JSON.stringify(certificateData),
  });
}

export function updateCertificate(id, certificateData) {
  return apiRequest(`/certificates/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(certificateData),
  });
}

export function deleteCertificate(id) {
  return apiRequest(`/certificates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =========================================================
   PUBLIC CERTIFICATE VERIFICATION
========================================================= */

export function verifyCertificate(token) {
  return apiRequest(
    `/verify/${encodeURIComponent(token)}`
  );
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
  return apiRequest(
    "/admin/notifications/unread-count"
  );
}

export function markAdminNotificationAsRead(id) {
  return apiRequest(
    `/admin/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
    }
  );
}

export function markAllAdminNotificationsAsRead() {
  return apiRequest(
    "/admin/notifications/read-all",
    {
      method: "PATCH",
    }
  );
}

/* =========================================================
   EMPLOYEE NOTIFICATIONS
========================================================= */

export function getEmployeeNotifications() {
  return apiRequest("/employee/notifications");
}

export function getEmployeeUnreadNotificationCount() {
  return apiRequest(
    "/employee/notifications/unread-count"
  );
}

export function markEmployeeNotificationAsRead(id) {
  return apiRequest(
    `/employee/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
    }
  );
}

export function markAllEmployeeNotificationsAsRead() {
  return apiRequest(
    "/employee/notifications/read-all",
    {
      method: "PATCH",
    }
  );
}