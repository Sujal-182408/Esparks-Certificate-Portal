// ============================================================
// src/utils/redirect.js — where to go after logging in
// ============================================================
//
// <ProtectedRoute> / <AdminProtectedRoute> send logged-out users to the
// login page with `state.from` = the page they wanted. After login we
// send them back there instead of always to the dashboard.
//
// SECURITY: only accept paths inside our own app. Never redirect to a
// full URL taken from the address bar ("open redirect" vulnerability:
// /login?next=https://evil.example would send users to a phishing site).
// ============================================================

/** True for "/admin/x" but false for "https://..." or "//evil.example". */
export function isSafeInternalPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/**
 * @param {import("react-router-dom").Location} location current location of the login page
 * @param {string} fallback where to go when there is no saved destination
 * @param {string} [loginPath] the login page itself (never redirect back to it)
 */
export function getPostLoginPath(location, fallback, loginPath) {
  const from = location.state?.from;
  const path = from ? `${from.pathname || ""}${from.search || ""}` : "";
  return isSafeInternalPath(path) && path !== loginPath ? path : fallback;
}
