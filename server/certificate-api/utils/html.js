// ============================================================
// utils/html.js — HTML escaping for email templates
// ============================================================
//
// Any value that came from a user (names, course names, reasons ...) and
// is placed inside HTML MUST be escaped. Otherwise someone could register
// with the name `<a href="https://evil.example">Click</a>` and that link
// would appear inside an official company email.
//
// Previously there were four copies of this function and one email
// (certificate deletion OTP) forgot to use it. Now there is one.
// ============================================================

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}
