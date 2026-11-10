// ============================================================
// services/emailTemplates.js — every email the system sends
// ============================================================
//
// Each function returns `{ subject, text, html }` and does NOT send
// anything. Keeping "what the email says" separate from "how it is sent"
// means:
//   - all wording/branding is in one file,
//   - templates are easy to unit-test (plain functions, no SMTP needed),
//   - routes stay short.
//
// Every user-supplied value goes through `escapeHtml` before it is put
// into HTML. The plain-text version doesn't need escaping.
// ============================================================

import { CLIENT_URL } from "../config/env.js";
import { escapeHtml } from "../utils/html.js";

// Official company name (signatures, footers) and short brand (subjects).
// Always "Esparks" — capital E, small s.
const COMPANY = "Esparks IT Solutions Private Limited";
const BRAND = "Esparks";

// ------------------------------------------------------------
// Shared layout & building blocks
// ------------------------------------------------------------

/** Wraps body HTML in the branded email frame. */
function layout({ heading, headingColor = "#67e8f9", bodyHtml }) {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
  <div style="background:#0b1728;padding:24px;border-radius:14px 14px 0 0;color:#fff">
    <h2 style="margin:0;color:${headingColor}">${escapeHtml(heading)}</h2>
    <p style="margin:6px 0 0">${BRAND} Certificate Portal</p>
  </div>
  <div style="border:1px solid #dbe3ee;border-top:0;padding:24px;border-radius:0 0 14px 14px">
    ${bodyHtml}
    <p>Regards,<br><strong>${COMPANY}</strong></p>
  </div>
</div>`;
}

function button(url, label) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0891b2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

/** Two-column details table. `rows` = [[label, value], ...] (values are escaped). */
function detailsTable(rows) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse">${cells}</table>`;
}

function detailsText(rows) {
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

const signature = `\n\nRegards,\n${COMPANY}`;

// ------------------------------------------------------------
// Links into the React app (must match routes in client/src/App.jsx)
// ------------------------------------------------------------

export const links = {
  certificate: (token) => `${CLIENT_URL}/certificate/view?token=${encodeURIComponent(token)}`,
  employeeDashboard: () => `${CLIENT_URL}/dashboard`,
  employeeLogin: () => `${CLIENT_URL}/login`,
  adminRequest: (requestId) =>
    `${CLIENT_URL}/admin/login?requestId=${encodeURIComponent(requestId)}`,
  passwordReset: (token, type) =>
    `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}&type=${type}`,
};

// ------------------------------------------------------------
// Certificate request lifecycle
// ------------------------------------------------------------

export function certificateIssuedEmail({ employeeName, courseName, certificateNo, verificationToken }) {
  const name = employeeName || "Employee";
  const course = courseName || "your course";
  const url = verificationToken ? links.certificate(verificationToken) : links.employeeDashboard();

  return {
    subject: `Your ${BRAND} Certificate Has Been Issued`,
    text:
      `Hello ${name},\n\nYour certificate request for "${course}" has been approved and your certificate has been issued.\n\n` +
      `Certificate number: ${certificateNo || "See your employee portal"}\n\nView your certificate: ${url}${signature}`,
    html: layout({
      heading: "Certificate Issued",
      bodyHtml: `<p>Hello ${escapeHtml(name)},</p>
        <p>Your certificate request for <strong>${escapeHtml(course)}</strong> has been approved and your certificate has been issued.</p>
        <p><strong>Certificate number:</strong> ${escapeHtml(certificateNo || "")}</p>
        ${button(url, "View Certificate")}`,
    }),
  };
}

export function requestRejectedEmail({ employeeName, courseName, reason }) {
  const name = employeeName || "Employee";
  const course = courseName || "your course";
  const why = reason || "Please contact the administrator for more information.";

  return {
    subject: `Update on Your ${BRAND} Certificate Request`,
    text:
      `Hello ${name},\n\nYour certificate request for "${course}" has been rejected.\n\nReason: ${why}\n\n` +
      `If you have questions, please contact the administrator.${signature}`,
    html: layout({
      heading: "Certificate Request Update",
      headingColor: "#fca5a5",
      bodyHtml: `<p>Hello ${escapeHtml(name)},</p>
        <p>Your certificate request for <strong>${escapeHtml(course)}</strong> has been rejected.</p>
        <div style="background:#fff1f2;border-left:4px solid #e11d48;padding:12px 16px;border-radius:6px">
          <strong>Reason</strong>
          <p style="margin:6px 0 0;white-space:pre-wrap">${escapeHtml(why)}</p>
        </div>
        <p>If you have questions, please contact the administrator.</p>`,
    }),
  };
}

export function adminNewRequestEmail({ employee, request }) {
  const rows = [
    ["Request ID", request.id],
    ["Employee", employee.name || "Employee"],
    ["Employee email", employee.email || "Not provided"],
    ["Certificate type", request.certificate_type || "Not specified"],
    ["Course", request.course_name || "Not specified"],
    ["Duration", request.duration_months ? `${request.duration_months} month(s)` : "Not applicable"],
    ["Submitted", new Date(request.created_at || Date.now()).toISOString()],
    ["Additional details", request.additional_details || "None"],
  ];
  const url = links.adminRequest(request.id);

  return {
    subject: `New Certificate Request #${request.id} — ${employee.name || "Employee"}`,
    text: `A new certificate request is waiting for review.\n\n${detailsText(rows)}\n\nReview request (admin login required): ${url}`,
    html: layout({
      heading: "New Certificate Request",
      bodyHtml: `<p>A new employee certificate request is waiting for your review.</p>
        ${detailsTable(rows)}
        ${button(url, "Review Request")}
        <p style="color:#64748b;font-size:13px">This button opens the admin login page. The link does not approve or issue anything by itself.</p>`,
    }),
  };
}

// ------------------------------------------------------------
// Account status (activate / deactivate)
// ------------------------------------------------------------

export function accountStatusEmployeeEmail({ employeeName, isActive, changedBy }) {
  const status = isActive ? "activated" : "deactivated";
  const next = isActive
    ? "You can now log in to your employee account."
    : "Your login access has been suspended. Please contact the administrator.";

  return {
    subject: `Your ${BRAND} account has been ${status}`,
    text: `Hello ${employeeName || "Employee"},\n\nYour Certificate Portal account has been ${status}.\n\nUpdated by: ${changedBy}\n\n${next}${signature}`,
    html: layout({
      heading: `Account ${isActive ? "Activated" : "Deactivated"}`,
      headingColor: isActive ? "#67e8f9" : "#fca5a5",
      bodyHtml: `<p>Hello ${escapeHtml(employeeName || "Employee")},</p>
        <p>Your Certificate Portal account has been <strong>${status}</strong>.</p>
        <p>${escapeHtml(next)}</p>
        ${isActive ? button(links.employeeLogin(), "Log In") : ""}`,
    }),
  };
}

export function accountStatusAdminEmail({ employeeName, employeeEmail, isActive, changedBy }) {
  const status = isActive ? "Activated" : "Deactivated";
  const rows = [
    ["Employee", employeeName || "Employee"],
    ["Email", employeeEmail],
    ["Status", status],
    ["Updated by", changedBy],
  ];
  return {
    subject: `Employee Account ${status} — ${employeeName || "Employee"}`,
    text: detailsText(rows),
    html: layout({ heading: `Employee Account ${status}`, bodyHtml: detailsTable(rows) }),
  };
}

// ------------------------------------------------------------
// Revocation
// ------------------------------------------------------------

export function certificateRevokedEmployeeEmail({ employeeName, certificateNo, reason }) {
  return {
    subject: `Certificate Revoked — ${certificateNo}`,
    text: `Hello ${employeeName || "Employee"},\n\nYour certificate ${certificateNo} has been revoked.\n\nReason: ${reason}\n\nIf you have questions, please contact the administrator.${signature}`,
    html: layout({
      heading: "Certificate Revoked",
      headingColor: "#fca5a5",
      bodyHtml: `<p>Hello ${escapeHtml(employeeName || "Employee")},</p>
        <p>Your certificate has been revoked by the administrator.</p>
        ${detailsTable([["Certificate number", certificateNo], ["Reason", reason]])}
        <p>If you have questions, please contact the administrator.</p>`,
    }),
  };
}

export function certificateRevokedAdminEmail({ employeeName, employeeEmail, certificateNo, reason, revokedBy, employeeDeactivated }) {
  const rows = [
    ["Employee", employeeName || "Employee"],
    ["Employee email", employeeEmail || "Unavailable"],
    ["Certificate number", certificateNo],
    ["Reason", reason],
    ["Revoked by", revokedBy],
    ["Employee account deactivated", employeeDeactivated ? "Yes" : "No"],
  ];
  return {
    subject: `Certificate Revoked — ${certificateNo}`,
    text: `A certificate has been revoked.\n\n${detailsText(rows)}`,
    html: layout({
      heading: "Certificate Revocation Notification",
      headingColor: "#fca5a5",
      bodyHtml: `<p>A certificate has been revoked.</p>${detailsTable(rows)}`,
    }),
  };
}

// ------------------------------------------------------------
// Security emails
// ------------------------------------------------------------

export function deleteOtpEmail({ certificate, otp, minutes }) {
  const rows = [
    ["Certificate", certificate.certificate_no || `#${certificate.id}`],
    ["Recipient", certificate.recipient_name || "N/A"],
    ["Course", certificate.course_name || "N/A"],
  ];
  return {
    subject: "Certificate Deletion Verification OTP",
    text: `Your OTP to delete certificate ${rows[0][1]} is ${otp}. It expires in ${minutes} minutes and can be used once. If you did not request this, ignore this email.`,
    html: layout({
      heading: "Certificate Deletion Verification",
      headingColor: "#fca5a5",
      bodyHtml: `<p>A permanent deletion was requested for this certificate:</p>
        ${detailsTable(rows)}
        <p style="font-size:30px;font-weight:bold;letter-spacing:8px">${escapeHtml(otp)}</p>
        <p>This OTP expires in <strong>${minutes} minutes</strong> and can only be used once.</p>
        <p>If you did not request this deletion, please ignore this email.</p>`,
    }),
  };
}

export function passwordResetEmail({ name, resetUrl, minutes, isAdmin }) {
  const who = isAdmin ? "administrator password" : "password";
  return {
    subject: `${BRAND} Certificate Portal — ${isAdmin ? "Admin " : ""}Password Reset`,
    text:
      `Hello ${name || ""},\n\nWe received a request to reset your ${who}.\n\nReset your password here:\n${resetUrl}\n\n` +
      `This link expires in ${minutes} minutes.\n\nIf you did not request this, you can safely ignore this email.${signature}`,
    html: layout({
      heading: isAdmin ? "Admin Password Reset" : "Password Reset",
      bodyHtml: `<p>Hello ${escapeHtml(name || "")},</p>
        <p>We received a request to reset your ${who}.</p>
        ${button(resetUrl, "Reset Password")}
        <p style="color:#64748b">This link expires in ${minutes} minutes. If you did not request this, you can safely ignore this email.</p>`,
    }),
  };
}
