// ============================================================
// ESPARKS IT SOLUTIONS CERTIFICATE MANAGEMENT SYSTEM
// Backend API Server - ES Modules
// Express + PostgreSQL + Socket.IO
// ============================================================
import crypto from "crypto";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { sendGmailEmail } from "./utils/gmail.js";

// ESM equivalent of __dirname.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env before importing local modules that initialize the database
// or read environment variables at module scope.
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Dynamic imports ensure dotenv has run before db.js and route modules load.
const [
  { default: pool },
  socketModule,
  authModule,
  employeeAuthModule,
  notificationModule,
] = await Promise.all([
  import("./db.js"),
  import("./socket.js"),
  import("./routes/auth.js"),
  import("./routes/employeeAuth.js"),
  import("./routes/notifications.js"),
]);

const { initializeSocket, emitEmployeeNotification, emitAdminNotification } =
  socketModule;

const { router: authRouter, requireAdmin } = authModule;
const { router: employeeAuthRouter, requireEmployee } = employeeAuthModule;
const { router: notificationRouter, createNotification } = notificationModule;

// ============================================================
// 5. CREATE EXPRESS APPLICATION
// ============================================================

const app = express();

app.set("trust proxy", 1);

export default app;

app.disable("x-powered-by");

// ============================================================
// 6. ENVIRONMENT CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT) || 5000;

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5174";

// ============================================================
// GMAIL API EMAIL NOTIFICATIONS (NO SMTP)
// ============================================================

function escapeEmailHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendCertificateStatusEmail({
  to,
  employeeName,
  courseName,
  status,
  certificateNo,
  verificationToken,
  rejectionReason,
}) {
  if (!to || !String(to).trim()) {
    console.warn("[CERTIFICATE EMAIL] Employee email is missing.");
    return false;
  }

  if (!["issued", "rejected"].includes(status)) {
    throw new Error(`Invalid certificate email status: ${status}`);
  }

  const issued = status === "issued";
  const safeName = escapeEmailHtml(employeeName || "Employee");
  const safeCourse = escapeEmailHtml(courseName || "your course");
  const safeCertificateNo = escapeEmailHtml(certificateNo || "");
  const safeReason = escapeEmailHtml(
    rejectionReason || "Please contact the administrator for more information.",
  );

  const clientUrl = (process.env.CLIENT_URL || CLIENT_URL).replace(/\/+$/, "");
  const verificationUrl = verificationToken
    ? `${clientUrl}/verify?token=${encodeURIComponent(verificationToken)}`
    : `${clientUrl}/employee/dashboard`;

  const subject = issued
    ? "Your eSparks Certificate Has Been Issued"
    : "Update on Your eSparks Certificate Request";

  const text = issued
    ? `Hello ${employeeName || "Employee"},

Your certificate request for "${courseName || "your course"}" has been approved and your certificate has been issued.

Certificate number: ${certificateNo || "See your employee portal"}

View your certificate: ${verificationUrl}

Regards,
eSparks IT Solutions`
    : `Hello ${employeeName || "Employee"},

Your certificate request for "${courseName || "your course"}" has been rejected.

Reason: ${rejectionReason || "Please contact the administrator for more information."}

If you have questions, please contact the administrator.

Regards,
eSparks IT Solutions`;

  const html = issued
    ? `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033;line-height:1.6">
        <div style="background:#0b1728;padding:24px;border-radius:14px 14px 0 0;color:#fff">
          <h2 style="margin:0;color:#67e8f9">Certificate Issued</h2>
          <p>eSparks IT Solutions</p>
        </div>
        <div style="border:1px solid #dbe3ee;padding:24px;border-radius:0 0 14px 14px">
          <p>Hello ${safeName},</p>
          <p>Your certificate request for <strong>${safeCourse}</strong> has been approved and your certificate has been issued.</p>
          <p><strong>Certificate number:</strong> ${safeCertificateNo}</p>
          <p>
            <a href="${escapeEmailHtml(verificationUrl)}" style="display:inline-block;background:#0891b2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
              View Certificate
            </a>
          </p>
          <p>Regards,<br><strong>eSparks IT Solutions</strong></p>
        </div>
      </div>`
    : `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033;line-height:1.6">
        <div style="background:#0b1728;padding:24px;border-radius:14px 14px 0 0;color:#fff">
          <h2 style="margin:0;color:#fca5a5">Certificate Request Update</h2>
          <p>eSparks IT Solutions</p>
        </div>
        <div style="border:1px solid #dbe3ee;padding:24px;border-radius:0 0 14px 14px">
          <p>Hello ${safeName},</p>
          <p>Your certificate request for <strong>${safeCourse}</strong> has been rejected.</p>
          <div style="background:#fff1f2;border-left:4px solid #e11d48;padding:12px 16px;border-radius:6px">
            <strong>Reason</strong>
            <p style="margin:6px 0 0;white-space:pre-wrap">${safeReason}</p>
          </div>
          <p>If you have questions or believe this decision needs clarification, please contact the administrator.</p>
          <p>Regards,<br><strong>eSparks IT Solutions</strong></p>
        </div>
      </div>`;

  await sendGmailEmail({
    to: String(to).trim(),
    subject,
    text,
    html,
  });

  console.log(`[GMAIL] Certificate ${status} email accepted for ${to}`);

  return true;
}

async function sendCertificateStatusEmailSafely(details) {
  try {
    console.log("[CERTIFICATE EMAIL] Sending:", {
      status: details.status,
      recipient: details.to,
      course: details.courseName,
    });

    const sent = await sendCertificateStatusEmail(details);
    // console.log("[REJECTION] Sending rejection email now...");

    if (!sent) {
      console.error("[CERTIFICATE EMAIL] Email was skipped:", {
        status: details.status,
        recipient: details.to,
      });
      return false;
    }

    console.log(
      `[CERTIFICATE EMAIL] Successfully sent ${details.status} email to ${details.to}`,
    );

    return true;
  } catch (error) {
    console.error(
      `[CERTIFICATE EMAIL] Failed to send ${details.status} email:`,
      error,
    );
    return false;
  }
}

// Notify the administrator when an employee submits a certificate request.
async function sendAdminCertificateRequestEmail({ employee, request }) {
  const to = String(process.env.ADMIN_EMAIL || "nsujalkant@gmail.com").trim();
  const clientUrl = (process.env.CLIENT_URL || CLIENT_URL).replace(/\/+$/, "");
  const loginUrl = `${clientUrl}/admin/login?requestId=${encodeURIComponent(request.id)}`;
  const employeeName = escapeEmailHtml(employee.name || "Employee");
  const employeeEmail = escapeEmailHtml(employee.email || "Not provided");
  const certificateType = escapeEmailHtml(
    request.certificate_type || "Not specified",
  );
  const courseName = escapeEmailHtml(request.course_name || "Not specified");
  const details = escapeEmailHtml(
    request.additional_details || "No additional details provided.",
  );
  const duration = request.duration_months
    ? `${escapeEmailHtml(request.duration_months)} month(s)`
    : "Not applicable";
  const submittedAt = escapeEmailHtml(
    request.created_at || new Date().toISOString(),
  );
  try {
    console.log("Sending admin certificate notification...");
    console.log("Admin notification recipient:", to);

    await sendGmailEmail({
      to: String(to).trim(),
      subject: `New Certificate Request #${request.id} — ${employee.name || "Employee"}`,
      text: `A new certificate request is waiting for review.\n\nRequest ID: ${request.id}\nEmployee: ${employee.name || "Employee"}\nEmployee email: ${employee.email || "Not provided"}\nCertificate type: ${request.certificate_type || "Not specified"}\nCourse: ${request.course_name || "Not specified"}\nDuration: ${request.duration_months ? `${request.duration_months} month(s)` : "Not applicable"}\nAdditional details: ${request.additional_details || "None"}\nStatus: pending\n\nReview request (admin login required): ${loginUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6"><div style="background:#0b1728;padding:24px;border-radius:14px 14px 0 0;color:#fff"><h2 style="margin:0;color:#67e8f9">New Certificate Request</h2><p style="margin:6px 0 0">eSparks IT Solutions Certificate Portal</p></div><div style="border:1px solid #dbe3ee;border-top:0;padding:24px;border-radius:0 0 14px 14px"><p>A new employee certificate request is waiting for your review.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Request ID</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeEmailHtml(request.id)}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Employee</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${employeeName}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Employee email</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${employeeEmail}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Certificate type</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${certificateType}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Course</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${courseName}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Duration</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${duration}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>Submitted</strong></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${submittedAt}</td></tr><tr><td style="padding:8px;vertical-align:top"><strong>Additional details</strong></td><td style="padding:8px;white-space:pre-wrap">${details}</td></tr></table><p style="margin:24px 0"><a href="${escapeEmailHtml(loginUrl)}" style="display:inline-block;background:#0891b2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review Request</a></p><p style="color:#64748b;font-size:13px">For security, this button opens the admin login page first. Sign in to review the request. The email link does not approve or issue a certificate by itself.</p><p>Regards,<br><strong>Certificate Management System</strong></p></div></div>`,
    });

    console.log("Admin notification email sent successfully.");
  } catch (error) {
    console.error("Admin notification email failed:", error);
  }
}

async function sendAdminCertificateRequestEmailSafely(details) {
  try {
    await sendAdminCertificateRequestEmail(details);
  } catch (error) {
    console.error("Admin certificate request email failed:", error.message);
  }
}


async function sendEmployeeAccountStatusEmailsSafely({
  employee,
  isActive,
  changedBy = "Administrator",
}) {
  const status = isActive ? "Activated" : "Deactivated";
  const adminEmail = String(
    process.env.ADMIN_EMAIL || "nsujalkant@gmail.com"
  ).trim();

  const employeeName = employee.name || "Employee";
  const employeeEmail = String(employee.email || "").trim();

  if (!employeeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeEmail)) {
    console.error("[EMAIL FAILED] Invalid employee email:", employeeEmail);
    return {
      employeeEmailSent: false,
      adminEmailSent: false,
      employeeError: "Invalid employee email address.",
    };
  }

  const employeeMessage = `Hello ${employeeName},

Your eSparks Certificate Portal account has been ${status.toLowerCase()}.

Updated by: ${changedBy}

${
  isActive
    ? "You can now log in to your employee account."
    : "Your login access has been suspended. Please contact the administrator."
}`;

  const employeeHtml = `
    <h2>Account ${status}</h2>
    <p>Hello ${escapeEmailHtml(employeeName)},</p>
    <p>Your account has been ${status.toLowerCase()}.</p>
    <p>Updated by: ${escapeEmailHtml(changedBy)}</p>
  `;

  const adminMessage = `Employee: ${employeeName}
Email: ${employeeEmail}
Status: ${status}
Updated by: ${changedBy}`;

  const adminHtml = `
    <h2>Employee Account ${status}</h2>
    <p>Employee: ${escapeEmailHtml(employeeName)}</p>
    <p>Email: ${escapeEmailHtml(employeeEmail)}</p>
    <p>Status: ${status}</p>
  `;

  const emailJobs = [
    {
      name: "EMPLOYEE",
      to: employeeEmail,
      subject: `Your eSparks account has been ${status.toLowerCase()}`,
      text: employeeMessage,
      html: employeeHtml,
    },
    {
      name: "ADMIN",
      to: adminEmail,
      subject: `Employee Account ${status} — ${employeeName}`,
      text: adminMessage,
      html: adminHtml,
    },
  ];

  const results = await Promise.allSettled(
    emailJobs.map(async (mail) => {
      console.log(`[EMAIL] Sending ${mail.name} email to: ${mail.to}`);

      const result = await sendGmailEmail({
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });

      console.log(`[EMAIL SUCCESS] ${mail.name}:`, {
        accepted: result.accepted,
        rejected: result.rejected,
        messageId: result.messageId,
      });

      return result;
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `[EMAIL FAILED] ${emailJobs[index].name}:`,
        result.reason
      );
    }
  });

  return {
    employeeEmailSent: results[0].status === "fulfilled",
    adminEmailSent: results[1].status === "fulfilled",
  };
}


// ============================================================
// 7. CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://esparks-certificate-portal.vercel.app",
  "https://certificate.esparksit.com",
  CLIENT_URL,
].filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

console.log("CLIENT_URL:", CLIENT_URL);
console.log("CORS allowed origins:", uniqueAllowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || uniqueAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================================
// 9. SECURITY HEADERS
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// ============================================================
// 10. COOKIE PARSER
// ============================================================

app.use(cookieParser());

// ============================================================
// 11. JSON BODY PARSER
// ============================================================

app.use(
  express.json({
    limit: "10kb",
  }),
);

// ============================================================
// 12. CREATE HTTP SERVER
// ============================================================

const httpServer = http.createServer(app);

// ============================================================
// 13. SOCKET.IO INITIALIZATION
// ============================================================

initializeSocket(httpServer, uniqueAllowedOrigins);

// ============================================================
// 16. HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      ok: true,

      message: "Certificate API is running.",

      database: "connected",

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database error:", error);

    return res.status(503).json({
      ok: false,

      message: "Certificate API is running but database is unavailable.",

      database: "disconnected",

      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// 17. AUTHENTICATION ROUTES
// ============================================================

app.use("/api/employee-auth", employeeAuthRouter);

app.use("/api/auth", authRouter);

app.use("/api", notificationRouter);

// ============================================================
// 18. ADMIN TEST ROUTE
// ============================================================

app.get("/api/admin/test", requireAdmin, (req, res) => {
  return res.status(200).json({
    success: true,

    message: "Admin authentication is working.",

    admin: req.admin,
  });
});

// ============================================================
// 19. GET ALL EMPLOYEES
// ============================================================

app.get("/api/admin/employees", requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
        SELECT
          id,
          name,
          email,
          is_active,
          created_at
        FROM employee_users
        ORDER BY created_at DESC
      `);

    return res.status(200).json({
      success: true,

      employees: result.rows,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    next(error);
  }
});

// ============================================================
// 20. GET SINGLE EMPLOYEE
// ============================================================

app.get("/api/admin/employees/:id", requireAdmin, async (req, res, next) => {
  const employeeId = req.params.id;

  if (!/^[1-9]\d*$/.test(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    BigInt(employeeId);
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    let employeeResult;

    try {
      employeeResult = await pool.query(
        `SELECT id, name, email, is_active, created_at
           FROM employee_users
           WHERE id = $1
           LIMIT 1`,
        [employeeId],
      );
    } catch (error) {
      console.error("EMPLOYEE QUERY FAILED:", {
        code: error.code,
        message: error.message,
        table: error.table,
        column: error.column,
      });
      throw error;
    }

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    let certificateResult;

    try {
      certificateResult = await pool.query(
        `SELECT
             id,
             certificate_no,
             certificate_type,
             recipient_name,
             course_name,
             issuer_name,
             issue_date,
             verification_token,
             status,
             created_at,
             revoked_at
           FROM certificates
           WHERE employee_id = $1
           ORDER BY issue_date DESC NULLS LAST, id DESC`,
        [employeeId],
      );
    } catch (error) {
      console.error("CERTIFICATE QUERY FAILED:", {
        code: error.code,
        message: error.message,
        table: error.table,
        column: error.column,
      });
      throw error;
    }

    let rejectedResult;

    try {
      rejectedResult = await pool.query(
        `SELECT
       id,
       certificate_type,
       course_name,
       rejection_reason,
       created_at,
       reviewed_at
     FROM certificate_requests
     WHERE employee_id = $1
       AND LOWER(status) = 'rejected'
     ORDER BY reviewed_at DESC NULLS LAST, created_at DESC, id DESC`,
        [employeeId],
      );
    } catch (error) {
      console.error("REJECTED REQUEST QUERY FAILED:", {
        code: error.code,
        message: error.message,
        table: error.table,
        column: error.column,
      });
      throw error;
    }

    return res.status(200).json({
      success: true,
      employee: employeeResult.rows[0],
      certificates: certificateResult.rows,
      rejectedRequests: rejectedResult.rows,
    });
  } catch (error) {
    console.error("GET EMPLOYEE DETAILS FAILED:", {
      code: error.code,
      message: error.message,
    });
    return next(error);
  }
});

// ============================================================
// 20A. UPDATE EMPLOYEE ACTIVE / INACTIVE STATUS
// ============================================================

app.patch(
  "/api/admin/employees/:id/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const employeeId = Number(req.params.id);
      const { is_active } = req.body || {};

      if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID.",
        });
      }

      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_active must be a boolean.",
        });
      }

      // Get existing employee status
      const existingResult = await pool.query(
        `
          SELECT id, name, email, is_active
          FROM employee_users
          WHERE id = $1
        `,
        [employeeId],
      );

      if (!existingResult.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      const existingEmployee = existingResult.rows[0];

      // Avoid unnecessary updates and duplicate emails
      if (existingEmployee.is_active === is_active) {
        return res.status(200).json({
          success: true,
          message: `Employee account is already ${
            is_active ? "active" : "deactivated"
          }.`,
          employee: existingEmployee,
          emailNotifications: {
            sent: false,
            reason: "Status has not changed.",
          },
        });
      }

      // Update employee status
      const result = await pool.query(
        `
          UPDATE employee_users
          SET is_active = $1
          WHERE id = $2
          RETURNING id, name, email, is_active
        `,
        [is_active, employeeId],
      );

      const updatedEmployee = result.rows[0];

      // Send email notification safely
      let emailNotifications = null;

      try {
        emailNotifications = await sendEmployeeAccountStatusEmailsSafely({
          employee: updatedEmployee,
          isActive: is_active,
          changedBy: req.admin?.email || "Administrator",
        });
      } catch (emailError) {
        // Email failure must not affect the database update
        console.error("Employee status email notification error:", emailError);

        emailNotifications = {
          sent: false,
          error: "Employee status updated, but email notification failed.",
        };
      }

      return res.status(200).json({
        success: true,
        message: `Employee account ${
          is_active ? "activated" : "deactivated"
        } successfully.`,
        employee: updatedEmployee,
        emailNotifications,
      });
    } catch (error) {
      console.error("Update employee status error:", error);
      next(error);
    }
  },
);

// ============================================================
// 21. GET ALL CERTIFICATES
// ============================================================

app.get("/api/admin/certificates", requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
        SELECT
          c.id,
          c.certificate_no,
          c.certificate_type,
          c.recipient_name,
          c.course_name,
          c.issuer_name,
          c.issue_date,
          c.verification_token,
          c.status,
          c.created_at,
          c.revoked_at,
          c.employee_id,
          cr.duration_months,
          e.name AS employee_name,
          e.email AS employee_email
        FROM certificates c
        LEFT JOIN employee_users e
          ON e.id = c.employee_id
        LEFT JOIN certificate_requests cr
          ON cr.certificate_id = c.id
        ORDER BY
          c.issue_date DESC,
          c.id DESC
      `);

    return res.status(200).json({
      success: true,

      certificates: result.rows,
    });
  } catch (error) {
    console.error("Get certificates error:", error);

    next(error);
  }
});

// ============================================================
// 22. GET SINGLE CERTIFICATE
// ============================================================

app.get("/api/admin/certificates/:id", requireAdmin, async (req, res, next) => {
  try {
    const certificateId = Number(req.params.id);

    if (!Number.isInteger(certificateId) || certificateId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Invalid certificate ID.",
      });
    }

    const result = await pool.query(
      `
          SELECT
            c.*,
            cr.duration_months,
            e.name AS employee_name,
            e.email AS employee_email
          FROM certificates c
          LEFT JOIN employee_users e
            ON e.id = c.employee_id
          LEFT JOIN certificate_requests cr
            ON cr.certificate_id = c.id
          WHERE c.id = $1
        `,
      [certificateId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Certificate not found.",
      });
    }

    return res.status(200).json({
      success: true,

      certificate: result.rows[0],
    });
  } catch (error) {
    console.error("Get certificate error:", error);

    next(error);
  }
});

// ============================================================
// 23. CREATE CERTIFICATE
// ============================================================
//
// IMPORTANT:
//
// This is the ONLY endpoint that creates a certificate
// from a certificate request.
//
// Flow:
//
// Employee Request
//        ↓
// Admin clicks Issue
//        ↓
// Create Certificate Page
//        ↓
// POST /api/admin/certificates
//        ↓
// Certificate created
//        ↓
// Request becomes issued
//
// ============================================================

app.post("/api/admin/certificates", requireAdmin, async (req, res, next) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const { requestId, certificateType, courseName, issuerName, issueDate } =
      req.body;

    // ========================================================
    // 1. VALIDATE REQUEST ID
    // ========================================================

    const cleanRequestId = Number(requestId);

    if (!Number.isInteger(cleanRequestId) || cleanRequestId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Valid requestId is required.",
      });
    }

    // ========================================================
    // 2. VALIDATE CERTIFICATE TYPE
    // ========================================================

    const cleanCertificateType = String(certificateType || "CERT")
      .trim()
      .toUpperCase();

    if (!["CERT", "INTR"].includes(cleanCertificateType)) {
      return res.status(400).json({
        success: false,

        message: "Certificate type must be CERT or INTR.",
      });
    }

    // ========================================================
    // 3. VALIDATE COURSE NAME
    // ========================================================

    const cleanCourseName = String(courseName || "").trim();

    if (!cleanCourseName) {
      return res.status(400).json({
        success: false,

        message: "Course name is required.",
      });
    }

    if (cleanCourseName.length > 200) {
      return res.status(400).json({
        success: false,

        message: "Course name must not exceed 200 characters.",
      });
    }

    // ========================================================
    // 4. VALIDATE ISSUER NAME
    // ========================================================

    const cleanIssuerName = String(issuerName || "eSparks IT Solutions").trim();

    if (!cleanIssuerName) {
      return res.status(400).json({
        success: false,

        message: "Issuer name is required.",
      });
    }

    if (cleanIssuerName.length > 200) {
      return res.status(400).json({
        success: false,

        message: "Issuer name must not exceed 200 characters.",
      });
    }

    // ========================================================
    // 5. VALIDATE ISSUE DATE
    // ========================================================

    let cleanIssueDate = null;

    if (issueDate) {
      const dateString = String(issueDate).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return res.status(400).json({
          success: false,

          message: "Issue date must be in YYYY-MM-DD format.",
        });
      }

      const parsedDate = new Date(`${dateString}T00:00:00Z`);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,

          message: "Invalid issue date.",
        });
      }

      cleanIssueDate = dateString;
    }

    // ========================================================
    // 6. START TRANSACTION
    // ========================================================

    await client.query("BEGIN");

    transactionStarted = true;

    // ========================================================
    // 7. LOCK CERTIFICATE REQUEST
    // ========================================================

    const requestResult = await client.query(
      `
            SELECT
              cr.id,
              cr.employee_id,
              cr.status,
              cr.certificate_id,
              cr.certificate_type,
              cr.course_name,
              cr.duration_months,

              e.name AS employee_name,
              e.email AS employee_email,
              e.is_active

            FROM certificate_requests cr

            INNER JOIN employee_users e
              ON e.id = cr.employee_id

            WHERE cr.id = $1

            FOR UPDATE
          `,
      [cleanRequestId],
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");

      transactionStarted = false;

      return res.status(404).json({
        success: false,

        message: "Certificate request not found.",
      });
    }

    const request = requestResult.rows[0];

    // ========================================================
    // 8. PREVENT DOUBLE ISSUANCE
    // ========================================================

    if (request.status === "issued" || request.certificate_id) {
      await client.query("ROLLBACK");

      transactionStarted = false;

      return res.status(409).json({
        success: false,

        message: "This certificate request has already been issued.",

        certificateId: request.certificate_id || null,
      });
    }

    // ========================================================
    // 9. REQUEST MUST BE PENDING
    // ========================================================

    if (request.status !== "pending") {
      await client.query("ROLLBACK");

      transactionStarted = false;

      return res.status(409).json({
        success: false,

        message: `This certificate request cannot be issued because its current status is "${request.status}".`,
      });
    }

    // ========================================================
    // 10. VERIFY EMPLOYEE
    // ========================================================

    if (!request.is_active) {
      await client.query("ROLLBACK");

      transactionStarted = false;

      return res.status(400).json({
        success: false,

        message: "The employee account is inactive.",
      });
    }

    const employeeId = Number(request.employee_id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      await client.query("ROLLBACK");

      transactionStarted = false;

      return res.status(400).json({
        success: false,

        message: "The certificate request has an invalid employee.",
      });
    }

    // ========================================================
    // 11. GENERATE CERTIFICATE NUMBER
    // ========================================================

    const certificateYear = new Date().getFullYear();
    const prefix = cleanCertificateType === "CERT" ? "EITS-CERT" : "EITS-INTR";
    const certificatePattern = `${prefix}-${certificateYear}-%`;

    const sequenceResult = await client.query(
      `
    INSERT INTO certificate_number_sequences (
      certificate_type,
      certificate_year,
      next_number
    )
    VALUES (
      $1,
      $2,
      GREATEST(
        1002,
        COALESCE(
          (
            SELECT MAX(
              substring(certificate_no FROM '[0-9]+$')::integer
            ) + 1
            FROM certificates
            WHERE certificate_type::text = $4::text
              AND certificate_no LIKE $3
          ),
          1002
        )
      )
    )
    ON CONFLICT (certificate_type, certificate_year)
    DO UPDATE SET
      next_number = GREATEST(
        certificate_number_sequences.next_number,
        COALESCE(
          (
            SELECT MAX(
              substring(certificate_no FROM '[0-9]+$')::integer
            ) + 1
            FROM certificates
            WHERE certificate_type::text = $4::text
              AND certificate_no LIKE $3
          ),
          1002
        )
      )
    RETURNING next_number
  `,
      [
        cleanCertificateType,
        certificateYear,
        certificatePattern,
        cleanCertificateType,
      ],
    );

    const generatedNumber = Number(sequenceResult.rows[0].next_number);

    await client.query(
      `
    UPDATE certificate_number_sequences
    SET next_number = next_number + 1
    WHERE certificate_type = $1
      AND certificate_year = $2
  `,
      [cleanCertificateType, certificateYear],
    );

    const certificateNo = `${prefix}-${certificateYear}-${generatedNumber}`;

    // ========================================================
    // 12. CREATE CERTIFICATE
    // ========================================================

    const certificateResult = await client.query(
      `
            INSERT INTO certificates
            (
              certificate_no,
              certificate_type,
              employee_id,
              recipient_name,
              course_name,
              issuer_name,
              issue_date,
              status
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              COALESCE($7::date, CURRENT_DATE),
              'issued'
            )
            RETURNING
              id,
              certificate_no,
              certificate_type,
              employee_id,
              recipient_name,
              course_name,
              issuer_name,
              issue_date,
              verification_token,
              status,
              created_at,
              revoked_at
          `,
      [
        certificateNo,

        cleanCertificateType,

        employeeId,

        request.employee_name,

        cleanCourseName,

        cleanIssuerName,

        cleanIssueDate,
      ],
    );

    const certificate = certificateResult.rows[0];

    // ========================================================
    // 13. UPDATE REQUEST
    // ========================================================

    const updateRequestResult = await client.query(
      `
            UPDATE certificate_requests
            SET
              status = 'issued',
              certificate_id = $1,
              reviewed_at = CURRENT_TIMESTAMP,
              issued_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND status = 'pending'
            RETURNING *
          `,
      [certificate.id, cleanRequestId],
    );

    if (updateRequestResult.rows.length === 0) {
      throw new Error(
        "Certificate request could not be updated after certificate creation.",
      );
    }


    // ========================================================
    // 14. AUDIT LOG
    // ========================================================

    await client.query(
      `
          INSERT INTO certificate_audit_logs
          (
            certificate_id,
            action,
            performed_by,
            details
          )
          VALUES
          (
            $1,
            'CERTIFICATE_CREATED',
            $2,
            $3::jsonb
          )
        `,
      [
        certificate.id,

        req.admin?.email || "admin",

        JSON.stringify({
          certificate_no: certificate.certificate_no,

          employee_id: employeeId,

          employee_email: request.employee_email,

          request_id: cleanRequestId,
        }),
      ],
    );

    // ========================================================
    // 15. EMPLOYEE NOTIFICATION
    // ========================================================

    const notification = await createNotification(client, {
      recipientType: "employee",

      recipientId: employeeId,

      type: "CERTIFICATE_ISSUED",

      title: "Certificate Issued",

      message: `Your ${cleanCertificateType} certificate for "${cleanCourseName}" has been issued successfully. Certificate number: ${certificate.certificate_no}.`,

      certificateRequestId: cleanRequestId,

      certificateId: certificate.id,
    });

    // ========================================================
    // 16. COMMIT
    // ========================================================

    await client.query("COMMIT");

    transactionStarted = false;

    // ========================================================
    // 17. REAL-TIME NOTIFICATION
    // ========================================================

    emitEmployeeNotification(employeeId, notification);

    // Send email after commit so email delivery issues cannot roll back issuance.
    await sendCertificateStatusEmailSafely({
      to: request.employee_email,
      employeeName: request.employee_name,
      courseName: cleanCourseName,
      status: "issued",
      certificateNo: certificate.certificate_no,
      verificationToken: certificate.verification_token,
    });

    // ========================================================
    // 18. RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message: "Certificate created successfully.",

      certificate,

      request: updateRequestResult.rows[0],
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Certificate transaction rollback error:", rollbackError);
      }
    }

    console.error("Create certificate error:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// 24. UPDATE CERTIFICATE
// ============================================================

app.put("/api/admin/certificates/:id", requireAdmin, async (req, res, next) => {
  try {
    const certificateId = Number(req.params.id);

    if (!Number.isInteger(certificateId) || certificateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid certificate ID.",
      });
    }

    const { courseName, issuerName, recipientName, issueDate } = req.body;

    const cleanField = (value) => (value == null ? null : String(value).trim());

    const cleanCourseName = cleanField(courseName);
    const cleanIssuerName = cleanField(issuerName);
    const cleanRecipientName = cleanField(recipientName);

    if (cleanCourseName !== null && !cleanCourseName) {
      return res.status(400).json({
        success: false,
        message: "Course name cannot be empty.",
      });
    }

    if (cleanIssuerName !== null && !cleanIssuerName) {
      return res.status(400).json({
        success: false,
        message: "Issuer name cannot be empty.",
      });
    }

    if (cleanRecipientName !== null && !cleanRecipientName) {
      return res.status(400).json({
        success: false,
        message: "Recipient name cannot be empty.",
      });
    }

    if (cleanCourseName && cleanCourseName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Course name must not exceed 200 characters.",
      });
    }

    if (cleanIssuerName && cleanIssuerName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Issuer name must not exceed 200 characters.",
      });
    }

    if (cleanRecipientName && cleanRecipientName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Recipient name must not exceed 150 characters.",
      });
    }

    let cleanIssueDate = null;

    if (issueDate != null && issueDate !== "") {
      const dateString = String(issueDate).trim();
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Issue date must be in YYYY-MM-DD format.",
        });
      }

      const [, year, month, day] = match;
      const parsedDate = new Date(Date.UTC(+year, +month - 1, +day));

      if (
        parsedDate.getUTCFullYear() !== +year ||
        parsedDate.getUTCMonth() !== +month - 1 ||
        parsedDate.getUTCDate() !== +day
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue date.",
        });
      }

      cleanIssueDate = dateString;
    }

    const result = await pool.query(
      `
        UPDATE certificates
        SET
          course_name = COALESCE($1, course_name),
          issuer_name = COALESCE($2, issuer_name),
          recipient_name = COALESCE($3, recipient_name),
          issue_date = COALESCE($4::date, issue_date)
        WHERE id = $5
        RETURNING *
      `,
      [
        cleanCourseName,
        cleanIssuerName,
        cleanRecipientName,
        cleanIssueDate,
        certificateId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate updated successfully.",
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error("Update certificate error:", error);
    next(error);
  }
});

// ===================================
// ===================================

async function sendCertificateRevocationEmailsSafely({
  employee,
  certificate,
  reason,
  adminEmail,
  revokedBy,
}) {
  const employeeName = employee?.name || "Employee";
  const employeeEmail = String(employee?.email || "").trim();
  const adminRecipient = String(adminEmail || "").trim();

  const certificateNumber =
    certificate?.certificate_no || "N/A";

  const results = {
    employeeEmailSent: false,
    adminEmailSent: false,
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);

  const employeeHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;">
      <h2 style="color:#dc2626;">Certificate Revoked</h2>
      <p>Hello ${escapeHtml(employeeName)},</p>
      <p>Your certificate has been revoked by the administrator.</p>
      <p><strong>Certificate Number:</strong> ${escapeHtml(certificateNumber)}</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>If you have questions, please contact the administrator.</p>
      <p>Regards,<br/>eSparks IT Solutions</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;">
      <h2 style="color:#dc2626;">Certificate Revocation Notification</h2>
      <p>A certificate has been revoked.</p>
      <p><strong>Employee:</strong> ${escapeHtml(employeeName)}</p>
      <p><strong>Employee Email:</strong> ${escapeHtml(employeeEmail || "Unavailable")}</p>
      <p><strong>Certificate Number:</strong> ${escapeHtml(certificateNumber)}</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p><strong>Revoked By:</strong> ${escapeHtml(revokedBy)}</p>
    </div>
  `;

  const emailTasks = [];

  if (employeeEmail) {
    emailTasks.push({
      type: "employee",
      to: employeeEmail,
      subject: `Certificate Revoked — ${certificateNumber}`,
      text: `Hello ${employeeName},

Your certificate ${certificateNumber} has been revoked.

Reason: ${reason}

Regards,
eSparks IT Solutions`,
      html: employeeHtml,
    });
  } else {
    console.warn("[CERTIFICATE EMAIL] Employee email unavailable.");
  }

  if (adminRecipient) {
    emailTasks.push({
      type: "admin",
      to: adminRecipient,
      subject: `Certificate Revoked — ${certificateNumber}`,
      text: `A certificate has been revoked.

Employee: ${employeeName}
Employee Email: ${employeeEmail || "Unavailable"}
Certificate Number: ${certificateNumber}
Reason: ${reason}
Revoked By: ${revokedBy}`,
      html: adminHtml,
    });
  } else {
    console.error("[CERTIFICATE EMAIL] Admin email unavailable.");
  }

  const emailResults = await Promise.allSettled(
    emailTasks.map(async (email) => {
      console.log(
        `[CERTIFICATE EMAIL] Sending revocation email to ${email.type}: ${email.to}`,
      );

      return sendGmailEmail({
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    }),
  );

  emailResults.forEach((result, index) => {
    const type = emailTasks[index].type;

    if (result.status === "fulfilled") {
      results[
        type === "employee"
          ? "employeeEmailSent"
          : "adminEmailSent"
      ] = true;

      console.log(
        `[CERTIFICATE EMAIL] Successfully sent revocation email to ${emailTasks[index].to}`,
      );
    } else {
      console.error(
        `[CERTIFICATE EMAIL] Failed to send ${type} revocation email:`,
        result.reason,
      );
    }
  });

  return results;
}


// ============================================================
// 25. REVOKE CERTIFICATE
// ============================================================



app.patch(
  "/api/admin/certificates/:id/revoke",
  requireAdmin,
  async (req, res, next) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
      const certificateId = Number(req.params.id);
      const {
        reason,
        deactivateEmployee = false,
      } = req.body || {};

      const revocationReason =
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "Certificate revoked by administrator.";

      if (!Number.isInteger(certificateId) || certificateId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid certificate ID.",
        });
      }

      if (typeof deactivateEmployee !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "deactivateEmployee must be a boolean.",
        });
      }

      await client.query("BEGIN");
      transactionStarted = true;

      // Fetch and lock certificate.
      const certificateResult = await client.query(
        `
          SELECT *
          FROM certificates
          WHERE id = $1
          FOR UPDATE
        `,
        [certificateId],
      );

      if (certificateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: "Certificate not found.",
        });
      }

      const existingCertificate = certificateResult.rows[0];

      if (existingCertificate.status === "revoked") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message: "Certificate is already revoked.",
        });
      }

      // Fetch and lock employee.
      let employee = null;
      let employeeWasActive = false;

      if (existingCertificate.employee_id) {
        const employeeResult = await client.query(
          `
            SELECT id, name, email, is_active
            FROM employee_users
            WHERE id = $1
            FOR UPDATE
          `,
          [existingCertificate.employee_id],
        );

        employee = employeeResult.rows[0] || null;
        employeeWasActive = employee?.is_active === true;
      }

      // Revoke certificate.
      const result = await client.query(
        `
          UPDATE certificates
          SET
            status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `,
        [certificateId],
      );

      const certificate = result.rows[0];

      // Deactivate employee only when checkbox is checked.
      if (deactivateEmployee && employee && employeeWasActive) {
        await client.query(
          `
            UPDATE employee_users
            SET is_active = false
            WHERE id = $1
          `,
          [employee.id],
        );
      }

      // Save audit log.
      await client.query(
        `
          INSERT INTO certificate_audit_logs
          (
            certificate_id,
            action,
            performed_by,
            details
          )
          VALUES ($1, 'CERTIFICATE_REVOKED', $2, $3::jsonb)
        `,
        [
          certificateId,
          req.admin?.email || "admin",
          JSON.stringify({
            reason: revocationReason,
            employeeDeactivated:
              Boolean(deactivateEmployee && employee && employeeWasActive),
          }),
        ],
      );

      // Create employee notification.
      let notification = null;

      if (existingCertificate.employee_id) {
        notification = await createNotification(client, {
          recipientType: "employee",
          recipientId: existingCertificate.employee_id,
          type: "CERTIFICATE_REVOKED",
          title: "Certificate Revoked",
          message: `Your certificate ${existingCertificate.certificate_no} has been revoked by the administrator.`,
          certificateId,
        });
      }

      // Commit database changes.
      await client.query("COMMIT");
      transactionStarted = false;

      // Emit notification after successful commit.
      if (notification && existingCertificate.employee_id) {
        try {
          emitEmployeeNotification(
            existingCertificate.employee_id,
            notification,
          );
        } catch (notificationError) {
          console.error(
            "[REVOKE] Notification emission error:",
            notificationError,
          );
        }
      }

      // Email configuration.
      const adminEmail = String(
        process.env.ADMIN_EMAIL || "nsujalkant@gmail.com",
      ).trim();

      const revokedBy = req.admin?.email || "Administrator";

      const emailNotifications = {
        revocation: {
          employeeEmailSent: false,
          adminEmailSent: false,
        },
        accountDeactivation: {
          employeeEmailSent: false,
          adminEmailSent: false,
        },
      };

      // Always send certificate revocation emails.
      // Employee email is sent when an employee record exists.
      // Admin notification can also be sent when only certificate details exist.
      try {
        emailNotifications.revocation =
          await sendCertificateRevocationEmailsSafely({
            employee: employee || {
              name: existingCertificate.employee_name || "Employee",
              email: existingCertificate.employee_email || null,
            },
            certificate,
            reason: revocationReason,
            adminEmail,
            revokedBy,
          });
      } catch (emailError) {
        console.error(
          "[REVOKE] Certificate revocation email error:",
          emailError,
        );
      }

      // Send account deactivation emails only when:
      // 1. Checkbox was checked.
      // 2. Employee exists.
      // 3. Employee was previously active.
      if (deactivateEmployee && employee && employeeWasActive) {
        try {
          emailNotifications.accountDeactivation =
            await sendEmployeeAccountStatusEmailsSafely({
              employee,
              isActive: false,
              changedBy: revokedBy,
            });
        } catch (emailError) {
          console.error(
            "[REVOKE] Employee deactivation email error:",
            emailError,
          );
        }
      }

      return res.status(200).json({
        success: true,
        message:
          deactivateEmployee && employee && employeeWasActive
            ? "Certificate revoked and employee account deactivated successfully."
            : "Certificate revoked successfully.",
        certificate,
        employeeDeactivated: Boolean(
          deactivateEmployee && employee && employeeWasActive,
        ),
        emailNotifications,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "[REVOKE] Rollback error:",
            rollbackError,
          );
        }
      }

      console.error("[REVOKE] Certificate revocation error:", error);
      next(error);
    } finally {
      client.release();
    }
  },
);



// ============================================================
// 26. DELETE CERTIFICATE PERMANENTLY
// ============================================================

app.post(
  "/api/admin/certificates/:id/delete-otp",
  requireAdmin,
  async (req, res, next) => {
    try {
      const certificateId = Number(req.params.id);
      const adminId = Number(req.admin?.id);
      const adminEmail = String(req.admin?.email || "").trim().toLowerCase();

      if (!Number.isSafeInteger(certificateId) || certificateId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid certificate ID.",
        });
      }

      if (!Number.isSafeInteger(adminId) || adminId <= 0 || !adminEmail) {
        return res.status(401).json({
          success: false,
          message: "Admin authentication details are missing.",
        });
      }

      const certificateResult = await pool.query(
        `SELECT id, certificate_no, recipient_name, course_name, status
         FROM certificates
         WHERE id = $1`,
        [certificateId]
      );

      if (!certificateResult.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Certificate not found.",
        });
      }

      const previousOtp = await pool.query(
        `SELECT last_sent_at
         FROM certificate_delete_otps
         WHERE admin_id = $1
           AND certificate_id = $2
           AND consumed_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [adminId, certificateId]
      );

      if (previousOtp.rowCount) {
        const lastSentAt = new Date(previousOtp.rows[0].last_sent_at).getTime();
        const remaining = Math.ceil((60000 - (Date.now() - lastSentAt)) / 1000);

        if (remaining > 0) {
          return res.status(429).json({
            success: false,
            message: `Please wait ${remaining} seconds before requesting another OTP.`,
          });
        }
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      const challengeId = crypto.randomUUID();
      const otpHash = crypto
        .createHash("sha256")
        .update(`${challengeId}:${otp}`)
        .digest("hex");

      await pool.query(
        `UPDATE certificate_delete_otps
         SET consumed_at = NOW()
         WHERE admin_id = $1
           AND certificate_id = $2
           AND consumed_at IS NULL`,
        [adminId, certificateId]
      );

      await pool.query(
        `INSERT INTO certificate_delete_otps
          (id, admin_id, admin_email, certificate_id, otp_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')`,
        [challengeId, adminId, adminEmail, certificateId, otpHash]
      );

      const certificate = certificateResult.rows[0];

      try {
        await sendGmailEmail({
          to: adminEmail,
          subject: "Certificate Deletion Verification OTP",
          text: `Your OTP to delete certificate ${certificate.certificate_no || `#${certificate.id}`} is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#17212b">
              <h2>Certificate Deletion Verification</h2>
              <p>A deletion request was made for this certificate:</p>
              <p><strong>Certificate:</strong> ${String(certificate.certificate_no || certificate.id)}</p>
              <p><strong>Recipient:</strong> ${String(certificate.recipient_name || "N/A")}</p>
              <p><strong>Course:</strong> ${String(certificate.course_name || "N/A")}</p>
              <p style="font-size:30px;font-weight:bold;letter-spacing:8px">${otp}</p>
              <p>This OTP expires in <strong>5 minutes</strong> and can only be used once.</p>
              <p>If you did not request this deletion, please ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        await pool.query(
          `UPDATE certificate_delete_otps
           SET consumed_at = NOW()
           WHERE id = $1`,
          [challengeId]
        );
        throw emailError;
      }

      return res.status(200).json({
        success: true,
        message: `Verification OTP sent to ${adminEmail}.`,
        challengeId,
        expiresIn: 300,
        resendAfter: 60,
      });
    } catch (error) {
      console.error("Certificate deletion OTP error:", error);
      next(error);
    }
  }
);

//=============================================================
// 26.A Delete Verification
//=============================================================

 app.post(
  "/api/admin/certificates/:id/confirm-delete",
  requireAdmin,
  async (req, res, next) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
      const certificateId = Number(req.params.id);
      const adminId = Number(req.admin?.id);
      const adminEmail = String(req.admin?.email || "").trim().toLowerCase();
      const { challengeId, otp } = req.body || {};

      if (!Number.isSafeInteger(certificateId) || certificateId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid certificate ID.",
        });
      }

      if (!Number.isSafeInteger(adminId) || adminId <= 0 || !adminEmail) {
        return res.status(401).json({
          success: false,
          message: "Admin authentication details are missing.",
        });
      }

      if (
        typeof challengeId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(challengeId) ||
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp)
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid verification OTP is required.",
        });
      }

      await client.query("BEGIN");
      transactionStarted = true;

      const otpResult = await client.query(
        `SELECT *
         FROM certificate_delete_otps
         WHERE id = $1
           AND admin_id = $2
           AND admin_email = $3
           AND certificate_id = $4
         FOR UPDATE`,
        [challengeId, adminId, adminEmail, certificateId]
      );

      if (!otpResult.rowCount) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Invalid verification request. Please request a new OTP.",
        });
      }

      const otpRecord = otpResult.rows[0];

      if (otpRecord.consumed_at) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "This OTP has already been used. Request a new OTP.",
        });
      }

      if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
        await client.query(
          `UPDATE certificate_delete_otps
           SET consumed_at = NOW()
           WHERE id = $1`,
          [challengeId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        });
      }

      if (otpRecord.attempts >= 5) {
        await client.query(
          `UPDATE certificate_delete_otps
           SET consumed_at = NOW()
           WHERE id = $1`,
          [challengeId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(429).json({
          success: false,
          message: "Maximum OTP attempts reached. Request a new OTP.",
        });
      }

      const submittedHash = crypto
        .createHash("sha256")
        .update(`${challengeId}:${otp}`)
        .digest("hex");

      const storedHash = Buffer.from(otpRecord.otp_hash, "hex");
      const submittedBuffer = Buffer.from(submittedHash, "hex");
      const isValidOtp =
        storedHash.length === submittedBuffer.length &&
        crypto.timingSafeEqual(storedHash, submittedBuffer);

      if (!isValidOtp) {
        const nextAttempts = otpRecord.attempts + 1;

        await client.query(
          `UPDATE certificate_delete_otps
           SET attempts = $1,
               consumed_at = CASE WHEN $1 >= 5 THEN NOW() ELSE consumed_at END
           WHERE id = $2`,
          [nextAttempts, challengeId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(nextAttempts >= 5 ? 429 : 400).json({
          success: false,
          message:
            nextAttempts >= 5
              ? "Maximum OTP attempts reached. Request a new OTP."
              : `Incorrect OTP. ${5 - nextAttempts} attempts remaining.`,
        });
      }

      const certificateResult = await client.query(
        `SELECT id, certificate_no, certificate_type, employee_id,
                recipient_name, course_name, issuer_name, issue_date, status
         FROM certificates
         WHERE id = $1
         FOR UPDATE`,
        [certificateId]
      );

      if (!certificateResult.rowCount) {
        await client.query(
          `UPDATE certificate_delete_otps
           SET consumed_at = NOW()
           WHERE id = $1`,
          [challengeId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: "Certificate not found.",
        });
      }

      const certificate = certificateResult.rows[0];

      // Preserve audit records while removing their FK reference.
      await client.query(
        `UPDATE certificate_audit_logs
         SET certificate_id = NULL
         WHERE certificate_id = $1`,
        [certificateId]
      );

      // certificate_requests and notifications use ON DELETE SET NULL.
      const deleteResult = await client.query(
        `DELETE FROM certificates
         WHERE id = $1
         RETURNING id, certificate_no`,
        [certificateId]
      );

      if (!deleteResult.rowCount) {
        throw new Error("Certificate deletion failed.");
      }

      await client.query(
        `INSERT INTO certificate_audit_logs
          (certificate_id, action, performed_by, details)
         VALUES (NULL, 'CERTIFICATE_DELETED', $1, $2::jsonb)`,
        [
          adminEmail,
          JSON.stringify({
            certificate_id: certificate.id,
            certificate_no: certificate.certificate_no,
            certificate_type: certificate.certificate_type,
            employee_id: certificate.employee_id,
            recipient_name: certificate.recipient_name,
            course_name: certificate.course_name,
            issuer_name: certificate.issuer_name,
            issue_date: certificate.issue_date,
            previous_status: certificate.status,
            deleted_by: adminEmail,
            deleted_at: new Date().toISOString(),
          }),
        ]
      );

      await client.query(
        `UPDATE certificate_delete_otps
         SET consumed_at = NOW()
         WHERE id = $1`,
        [challengeId]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return res.status(200).json({
        success: true,
        message: "Certificate verified and deleted successfully.",
        certificate: deleteResult.rows[0],
      });
    } catch (error) {
      if (transactionStarted) {
        await client.query("ROLLBACK").catch(() => {});
      }

      console.error("Verified certificate deletion error:", error);
      next(error);
    } finally {
      client.release();
    }
  }
);

// ============================================================
// 27. GET ALL EMPLOYEE CERTIFICATES
// ============================================================

app.get(
  "/api/employee/certificates",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = Number(req.employee?.id);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(401).json({
          success: false,

          message: "Employee authentication required.",
        });
      }

      const result = await pool.query(
        `
            SELECT
              c.id,
              c.certificate_no,
              c.certificate_type,
              c.recipient_name,
              c.course_name,
              c.issuer_name,
              c.issue_date,
              c.verification_token,
              c.status,
              c.created_at,
              c.revoked_at
            FROM certificates c
            WHERE c.employee_id = $1
              AND c.status = 'issued'
            ORDER BY
              c.issue_date DESC,
              c.id DESC
          `,
        [employeeId],
      );

      return res.status(200).json({
        success: true,

        certificates: result.rows,
      });
    } catch (error) {
      console.error("Get employee certificates error:", error);

      next(error);
    }
  },
);

// ============================================================
// 27A. GET SINGLE EMPLOYEE CERTIFICATE
// ============================================================

app.get(
  "/api/employee/certificates/:token",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = Number(req.employee?.id);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(401).json({
          success: false,

          message: "Employee authentication required.",
        });
      }

      const token = String(req.params.token || "").trim();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(token)) {
        return res.status(400).json({
          success: false,

          message: "Invalid certificate verification token.",
        });
      }

      const result = await pool.query(
        `
            SELECT
              id,
              certificate_no,
              certificate_type,
              employee_id,
              recipient_name,
              course_name,
              issuer_name,
              issue_date,
              verification_token,
              status,
              created_at,
              revoked_at
            FROM certificates
            WHERE verification_token = $1
              AND employee_id = $2
            LIMIT 1
          `,
        [token, employeeId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,

          message:
            "Certificate not found or you do not have permission to view it.",
        });
      }

      const certificate = result.rows[0];

      if (certificate.status !== "issued") {
        return res.status(403).json({
          success: false,

          message:
            "This certificate has been revoked and is no longer available.",
        });
      }

      return res.status(200).json({
        success: true,

        certificate,
      });
    } catch (error) {
      console.error("Get employee certificate error:", error);

      next(error);
    }
  },
);

// ============================================================
// 28. EMPLOYEE OLD QR ROUTE
// ============================================================

app.get("/api/employee/qr", requireEmployee, async (req, res, next) => {
  try {
    const employeeId = Number(req.employee?.id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(401).json({
        success: false,

        message: "Employee authentication required.",
      });
    }

    const result = await pool.query(
      `
            SELECT
              id,
              certificate_no,
              certificate_type,
              recipient_name,
              course_name,
              issuer_name,
              issue_date,
              verification_token,
              status
            FROM certificates
            WHERE employee_id = $1
              AND status = 'issued'
            ORDER BY
              issue_date DESC,
              id DESC
            LIMIT 1
          `,
      [employeeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "No issued certificate found.",
      });
    }

    const certificate = result.rows[0];

    const verificationUrl = `${CLIENT_URL}/verify?token=${encodeURIComponent(
      certificate.verification_token,
    )}`;

    return res.status(200).json({
      success: true,

      certificate,

      verificationUrl,
    });
  } catch (error) {
    console.error("Get employee QR error:", error);

    next(error);
  }
});

// ============================================================
// 29. EMPLOYEE GENERATE QR
// ============================================================

app.post("/api/employee/qr", requireEmployee, async (req, res, next) => {
  try {
    const employeeId = Number(req.employee?.id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(401).json({
        success: false,

        message: "Employee authentication required.",
      });
    }

    const result = await pool.query(
      `
            SELECT
              id,
              certificate_no,
              certificate_type,
              recipient_name,
              course_name,
              issuer_name,
              issue_date,
              verification_token,
              status
            FROM certificates
            WHERE employee_id = $1
              AND status = 'issued'
            ORDER BY
              issue_date DESC,
              id DESC
            LIMIT 1
          `,
      [employeeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "No issued certificate found.",
      });
    }

    const certificate = result.rows[0];

    const verificationUrl = `${CLIENT_URL}/verify?token=${encodeURIComponent(
      certificate.verification_token,
    )}`;

    return res.status(200).json({
      success: true,

      certificate,

      verificationUrl,
    });
  } catch (error) {
    console.error("Generate employee QR error:", error);

    next(error);
  }
});

// ============================================================
// 31. EMPLOYEE CREATE CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/employee/certificate-requests",
  requireEmployee,
  async (req, res, next) => {
    const client = await pool.connect();

    let transactionStarted = false;

    try {
      const {
        certificate_type,
        course_name,
        additional_details,
        duration_months,
      } = req.body;

      const employeeId = Number(req.employee?.id);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(401).json({
          success: false,

          message: "Employee authentication required.",
        });
      }

      const cleanCertificateType = String(certificate_type || "")
        .trim()
        .toUpperCase();

      if (!["CERT", "INTR"].includes(cleanCertificateType)) {
        return res.status(400).json({
          success: false,

          message: "Certificate type must be CERT or INTR.",
        });
      }

      // Internship duration is required only for INTR.
      // CERT requests always store NULL duration.
      let cleanDurationMonths = null;

      if (cleanCertificateType === "INTR") {
        const months = Number(duration_months);

        if (!Number.isInteger(months) || months < 1 || months > 24) {
          return res.status(400).json({
            success: false,

            message: "Internship duration must be between 1 and 24 months.",
          });
        }

        cleanDurationMonths = months;
      }

      const cleanCourseName = String(course_name || "").trim();

      if (!cleanCourseName) {
        return res.status(400).json({
          success: false,

          message: "Course name is required.",
        });
      }

      if (cleanCourseName.length > 200) {
        return res.status(400).json({
          success: false,

          message: "Course name must not exceed 200 characters.",
        });
      }

      const cleanAdditionalDetails =
        additional_details == null ? "" : String(additional_details).trim();

      if (cleanAdditionalDetails.length > 2000) {
        return res.status(400).json({
          success: false,

          message: "Additional details must not exceed 2000 characters.",
        });
      }

      const employeeResult = await client.query(
        `
            SELECT
              id,
              name,
              email,
              is_active
            FROM employee_users
            WHERE id = $1
          `,
        [employeeId],
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,

          message: "Employee not found.",
        });
      }

      const employee = employeeResult.rows[0];

      if (!employee.is_active) {
        return res.status(403).json({
          success: false,

          message: "Employee account is inactive.",
        });
      }

      await client.query("BEGIN");

      transactionStarted = true;

      const pendingResult = await client.query(
        `
            SELECT id
            FROM certificate_requests
            WHERE employee_id = $1
              AND status = 'pending'
            LIMIT 1
            FOR UPDATE
          `,
        [employeeId],
      );

      if (pendingResult.rows.length > 0) {
        await client.query("ROLLBACK");

        transactionStarted = false;

        return res.status(409).json({
          success: false,

          message: "You already have a pending certificate request.",
        });
      }

      const requestResult = await client.query(
        `
            INSERT INTO certificate_requests
            (
              employee_id,
              certificate_type,
              course_name,
              additional_details,
              duration_months,
              status
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              'pending'
            )
            RETURNING *
          `,
        [
          employeeId,

          cleanCertificateType,

          cleanCourseName,

          cleanAdditionalDetails || null,

          cleanDurationMonths,
        ],
      );

      const request = requestResult.rows[0];

      const adminResult = await client.query(
        `
            SELECT
              id,
              email
            FROM admin_users
            WHERE is_active = TRUE
            ORDER BY id ASC
            LIMIT 1
          `,
      );

      let adminNotification = null;

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];

        adminNotification = await createNotification(client, {
          recipientType: "admin",

          recipientId: admin.id,

          type: "CERTIFICATE_REQUEST",

          title: "New Certificate Request",

          message: `${employee.name} (${employee.email}) submitted a ${cleanCertificateType} certificate request for "${cleanCourseName}".`,

          certificateRequestId: request.id,
        });
      }

      await client.query("COMMIT");

      transactionStarted = false;

      if (adminNotification && adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];

        emitAdminNotification(admin.id, adminNotification);
      }

      // Email is sent after the request transaction commits. A mail failure
      // must not undo a successfully saved employee request.
      await sendAdminCertificateRequestEmailSafely({
        employee,
        request,
      });

      return res.status(201).json({
        success: true,

        message: "Certificate request submitted successfully.",

        request,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Certificate request rollback error:", rollbackError);
        }
      }

      console.error("Employee certificate request error:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,

          message: "You already have a pending certificate request.",
        });
      }

      next(error);
    } finally {
      client.release();
    }
  },
);

// ============================================================
// 32. GET EMPLOYEE CERTIFICATE REQUESTS
// ============================================================

app.get(
  "/api/employee/certificate-requests",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = Number(req.employee?.id);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(401).json({
          success: false,

          message: "Employee authentication required.",
        });
      }

      const result = await pool.query(
        `
            SELECT
              id,
              certificate_type,
              course_name,
              additional_details,
              duration_months,
              status,
              certificate_id,
              rejection_reason,
              created_at,
              reviewed_at,
              issued_at
            FROM certificate_requests
            WHERE employee_id = $1
            ORDER BY
              created_at DESC,
              id DESC
          `,
        [employeeId],
      );

      return res.status(200).json({
        success: true,

        requests: result.rows,
      });
    } catch (error) {
      console.error("Get employee certificate requests error:", error);

      next(error);
    }
  },
);

// ============================================================
// 33. ADMIN CREATE CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/admin/certificate-requests",
  requireAdmin,
  async (req, res, next) => {
    const client = await pool.connect();

    let transactionStarted = false;

    try {
      const {
        employeeId,
        certificateType,
        courseName,
        additionalDetails,
        durationMonths,
      } = req.body;

      const cleanEmployeeId = Number(employeeId);

      if (!Number.isInteger(cleanEmployeeId) || cleanEmployeeId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Valid employeeId is required.",
        });
      }

      const cleanCertificateType = String(certificateType || "")
        .trim()
        .toUpperCase();

      if (!["CERT", "INTR"].includes(cleanCertificateType)) {
        return res.status(400).json({
          success: false,

          message: "Certificate type must be CERT or INTR.",
        });
      }

      // Internship duration is required only for INTR.
      // CERT requests always store NULL duration.
      let cleanDurationMonths = null;

      if (cleanCertificateType === "INTR") {
        const months = Number(durationMonths);

        if (!Number.isInteger(months) || months < 1 || months > 24) {
          return res.status(400).json({
            success: false,

            message: "Internship duration must be between 1 and 24 months.",
          });
        }

        cleanDurationMonths = months;
      }

      const cleanCourseName = String(courseName || "").trim();

      if (!cleanCourseName) {
        return res.status(400).json({
          success: false,

          message: "Course name is required.",
        });
      }

      if (cleanCourseName.length > 200) {
        return res.status(400).json({
          success: false,

          message: "Course name must not exceed 200 characters.",
        });
      }

      const cleanAdditionalDetails =
        additionalDetails == null ? "" : String(additionalDetails).trim();

      if (cleanAdditionalDetails.length > 2000) {
        return res.status(400).json({
          success: false,

          message: "Additional details must not exceed 2000 characters.",
        });
      }

      const employeeResult = await client.query(
        `
            SELECT
              id,
              name,
              email,
              is_active
            FROM employee_users
            WHERE id = $1
          `,
        [cleanEmployeeId],
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,

          message: "Employee not found.",
        });
      }

      const employee = employeeResult.rows[0];

      if (!employee.is_active) {
        return res.status(400).json({
          success: false,

          message: "Employee account is inactive.",
        });
      }

      await client.query("BEGIN");

      transactionStarted = true;

      const pendingResult = await client.query(
        `
            SELECT id
            FROM certificate_requests
            WHERE employee_id = $1
              AND status = 'pending'
            LIMIT 1
            FOR UPDATE
          `,
        [cleanEmployeeId],
      );

      if (pendingResult.rows.length > 0) {
        await client.query("ROLLBACK");

        transactionStarted = false;

        return res.status(409).json({
          success: false,

          message: "This employee already has a pending certificate request.",
        });
      }

      const requestResult = await client.query(
        `
            INSERT INTO certificate_requests
            (
              employee_id,
              certificate_type,
              course_name,
              additional_details,
              duration_months,
              status
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              'pending'
            )
            RETURNING *
          `,
        [
          cleanEmployeeId,

          cleanCertificateType,

          cleanCourseName,

          cleanAdditionalDetails || null,

          cleanDurationMonths,
        ],
      );

      const request = requestResult.rows[0];

      const employeeNotification = await createNotification(client, {
        recipientType: "employee",

        recipientId: cleanEmployeeId,

        type: "CERTIFICATE_REQUEST_CREATED",

        title: "Certificate Request Created",

        message: `An administrator created a ${cleanCertificateType} certificate request for "${cleanCourseName}" on your behalf.`,

        certificateRequestId: request.id,
      });

      await client.query(
        `
          INSERT INTO certificate_audit_logs
          (
            certificate_id,
            action,
            performed_by,
            details
          )
          VALUES
          (
            NULL,
            'CERTIFICATE_REQUEST_CREATED',
            $1,
            $2::jsonb
          )
        `,
        [
          req.admin?.email || "admin",

          JSON.stringify({
            certificate_request_id: request.id,

            employee_id: cleanEmployeeId,

            certificate_type: cleanCertificateType,
          }),
        ],
      );

      await client.query("COMMIT");

      transactionStarted = false;

      emitEmployeeNotification(cleanEmployeeId, employeeNotification);

      return res.status(201).json({
        success: true,

        message: "Certificate request created successfully.",

        request,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Admin request rollback error:", rollbackError);
        }
      }

      console.error("Admin create certificate request error:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,

          message: "This employee already has a pending certificate request.",
        });
      }

      next(error);
    } finally {
      client.release();
    }
  },
);

// ============================================================
// 34. GET ALL ADMIN CERTIFICATE REQUESTS
// ============================================================

app.get(
  "/api/admin/certificate-requests",
  requireAdmin,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `
            SELECT
              cr.id,
              cr.employee_id,
              cr.certificate_type,
              cr.course_name,
              cr.additional_details,
              cr.duration_months,
              cr.status,
              cr.certificate_id,
              cr.rejection_reason,
              cr.created_at,
              cr.reviewed_at,
              cr.issued_at,

              e.name AS employee_name,
              e.email AS employee_email

            FROM certificate_requests cr

            LEFT JOIN employee_users e
              ON e.id = cr.employee_id

            ORDER BY
              cr.created_at DESC,
              cr.id DESC
          `,
      );

      return res.status(200).json({
        success: true,

        requests: result.rows,
      });
    } catch (error) {
      console.error("Get admin certificate requests error:", error);

      next(error);
    }
  },
);

// ============================================================
// 34A. GET SINGLE ADMIN CERTIFICATE REQUEST
// ============================================================
//
// Used by:
//
// /admin/certificates/create?requestId=123
//
// The frontend sends ONLY the request ID.
//
// Employee identity is resolved from PostgreSQL.
//
// ============================================================

app.get(
  "/api/admin/certificate-requests/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);

      // ========================================================
      // 1. VALIDATE REQUEST ID
      // ========================================================

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid certificate request ID.",
        });
      }

      // ========================================================
      // 2. GET REQUEST + EMPLOYEE
      // ========================================================

      const result = await pool.query(
        `
            SELECT
              cr.id,
              cr.employee_id,
              cr.certificate_type,
              cr.course_name,
              cr.additional_details,
              cr.duration_months,
              cr.status,
              cr.certificate_id,
              cr.rejection_reason,
              cr.created_at,
              cr.reviewed_at,
              cr.issued_at,

              e.name AS employee_name,
              e.email AS employee_email,
              e.is_active AS employee_active

            FROM certificate_requests cr

            INNER JOIN employee_users e
              ON e.id = cr.employee_id

            WHERE cr.id = $1

            LIMIT 1
          `,
        [requestId],
      );

      // ========================================================
      // 3. REQUEST NOT FOUND
      // ========================================================

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,

          message: "Certificate request not found.",
        });
      }

      // ========================================================
      // 4. RETURN REQUEST
      // ========================================================

      return res.status(200).json({
        success: true,

        request: result.rows[0],
      });
    } catch (error) {
      console.error("Get single admin certificate request error:", error);

      next(error);
    }
  },
);

// ============================================================
// 35. REJECT CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/admin/certificate-requests/:id/reject",
  requireAdmin,
  async (req, res, next) => {
    const client = await pool.connect();

    let transactionStarted = false;

    try {
      const requestId = Number(req.params.id);

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid certificate request ID.",
        });
      }

      const reason = String(
        req.body?.reason || req.body?.rejectionReason || "",
      ).trim();

      const finalReason = reason || "Request rejected by administrator.";

      if (finalReason.length > 2000) {
        return res.status(400).json({
          success: false,

          message: "Rejection reason must not exceed 2000 characters.",
        });
      }

      await client.query("BEGIN");

      transactionStarted = true;

      const requestResult = await client.query(
        `
            SELECT
              cr.*,
              e.name AS employee_name,
              e.email AS employee_email
            FROM certificate_requests cr
            INNER JOIN employee_users e
              ON e.id = cr.employee_id
            WHERE cr.id = $1
            FOR UPDATE OF cr
          `,
        [requestId],
      );

      if (requestResult.rows.length === 0) {
        await client.query("ROLLBACK");

        transactionStarted = false;

        return res.status(404).json({
          success: false,

          message: "Certificate request not found.",
        });
      }

      const request = requestResult.rows[0];

      console.log("[REJECTION] Employee email:", request.employee_email);
      console.log("[REJECTION] Employee name:", request.employee_name);

      if (request.status !== "pending") {
        await client.query("ROLLBACK");

        transactionStarted = false;

        return res.status(409).json({
          success: false,

          message: "Only pending requests can be rejected.",
        });
      }

      const updatedResult = await client.query(
        `
            UPDATE certificate_requests
            SET
              status = 'rejected',
              rejection_reason = $1,
              reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
          `,
        [finalReason, requestId],
      );

      const updatedRequest = updatedResult.rows[0];

      const notification = await createNotification(client, {
        recipientType: "employee",

        recipientId: request.employee_id,

        type: "CERTIFICATE_REQUEST_REJECTED",

        title: "Certificate Request Rejected",

        message: `Your ${request.certificate_type} certificate request for "${request.course_name}" was rejected. Reason: ${finalReason}`,

        certificateRequestId: request.id,
      });

      await client.query(
        `
          INSERT INTO certificate_audit_logs
          (
            certificate_id,
            action,
            performed_by,
            details
          )
          VALUES
          (
            NULL,
            'CERTIFICATE_REQUEST_REJECTED',
            $1,
            $2::jsonb
          )
        `,
        [
          req.admin?.email || "admin",

          JSON.stringify({
            certificate_request_id: request.id,

            employee_id: request.employee_id,

            reason: finalReason,
          }),
        ],
      );

      await client.query("COMMIT");

      transactionStarted = false;

      emitEmployeeNotification(request.employee_id, notification);

      // Send email after commit; a mail failure must not undo rejection.
      await sendCertificateStatusEmailSafely({
        to: request.employee_email,
        employeeName: request.employee_name,
        courseName: request.course_name,
        status: "rejected",
        rejectionReason: finalReason,
      });

      return res.status(200).json({
        success: true,

        message: "Certificate request rejected successfully.",

        request: updatedRequest,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Reject rollback error:", rollbackError);
        }
      }

      console.error("Reject certificate request error:", error);

      next(error);
    } finally {
      client.release();
    }
  },
);

// ============================================================
// 36. ISSUE CERTIFICATE REQUEST
// ============================================================
//
// THIS ROUTE DOES NOT CREATE A CERTIFICATE.
//
// The old implementation has intentionally been removed.
//
// ============================================================

app.post(
  "/api/admin/certificate-requests/:id/issue",
  requireAdmin,
  async (req, res) => {
    return res.status(410).json({
      success: false,

      message:
        "This endpoint is deprecated. Open the certificate creation page and confirm the certificate details before creating the certificate.",
    });
  },
);

// ============================================================
// 43. PUBLIC CERTIFICATE VERIFICATION RATE LIMIT
// ============================================================

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    valid: false,
    status: "invalid",
    message: "Too many verification requests. Please try again later.",
  },
});

// ============================================================
// 44. PUBLIC CERTIFICATE VERIFICATION
// ============================================================

app.get("/api/verify/:token", verifyLimiter, async (req, res, next) => {
  try {
    const token = String(req.params.token || "").trim();

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(token)) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "invalid",
        message: "Invalid certificate verification token.",
      });
    }

    const result = await pool.query(
      `
          SELECT
            c.id,
            c.certificate_no,
            c.certificate_type,
            c.employee_id,
            c.recipient_name,
            c.course_name,
            c.issuer_name,
            c.issue_date,
            c.verification_token,
            c.status,
            c.created_at,
            c.revoked_at,

            cr.duration_months

          FROM certificates c

          LEFT JOIN certificate_requests cr
            ON cr.certificate_id = c.id

          WHERE c.verification_token = $1

          LIMIT 1
        `,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        status: "invalid",
        message:
          "This certificate could not be verified against our official company records.",
      });
    }

    const certificate = result.rows[0];

    // ============================================================
    // UPDATE EMPLOYEE ACTIVE / INACTIVE STATUS
    // ============================================================

    app.patch(
      "/api/admin/employees/:id/status",
      requireAdmin,
      async (req, res, next) => {
        try {
          const employeeId = Number(req.params.id);
          const { is_active } = req.body || {};

          if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid employee ID.",
            });
          }

          if (typeof is_active !== "boolean") {
            return res.status(400).json({
              success: false,
              message: "is_active must be a boolean.",
            });
          }

          const result = await pool.query(
            `
          UPDATE employee_users
          SET is_active = $1
          WHERE id = $2
          RETURNING id, name, email, is_active
        `,
            [is_active, employeeId],
          );

          if (!result.rows.length) {
            return res.status(404).json({
              success: false,
              message: "Employee not found.",
            });
          }

          return res.status(200).json({
            success: true,
            message: `Employee account ${
              is_active ? "activated" : "deactivated"
            } successfully.`,
            employee: result.rows[0],
          });
        } catch (error) {
          console.error("Update employee status error:", error);
          next(error);
        }
      },
    );

    // ============================================================
    // REVOKE CERTIFICATE + DEACTIVATE EMPLOYEE + EMAILS
    // ============================================================

    app.patch(
      "/api/admin/certificates/:id/revoke",
      requireAdmin,
      async (req, res, next) => {
        let client;
        let transactionStarted = false;

        try {
          const certificateId = Number(req.params.id);

          if (!Number.isSafeInteger(certificateId) || certificateId <= 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid certificate ID.",
            });
          }

          const reason = String(
            req.body?.reason || "Certificate revoked by administrator.",
          ).trim();

          if (reason.length > 2000) {
            return res.status(400).json({
              success: false,
              message: "Revocation reason must not exceed 2000 characters.",
            });
          }

          const revokedBy = req.admin?.email || "admin";

          // 1. CONNECT TO DATABASE
          client = await pool.connect();

          // 2. START TRANSACTION
          await client.query("BEGIN");
          transactionStarted = true;

          // 3. GET CERTIFICATE AND EMPLOYEE DETAILS
          const certificateResult = await client.query(
            `
          SELECT
            c.*,
            e.name AS employee_name,
            e.email AS employee_email
          FROM certificates c
          LEFT JOIN employee_users e
            ON e.id = c.employee_id
          WHERE c.id = $1
          FOR UPDATE OF c
        `,
            [certificateId],
          );

          if (!certificateResult.rows.length) {
            return res.status(404).json({
              success: false,
              message: "Certificate not found.",
            });
          }

          const existingCertificate = certificateResult.rows[0];

          // 4. PREVENT DUPLICATE REVOCATION
          if (existingCertificate.status === "revoked") {
            return res.status(409).json({
              success: false,
              message: "Certificate is already revoked.",
            });
          }

          // 5. REVOKE CERTIFICATE
          const updateResult = await client.query(
            `
          UPDATE certificates
          SET
            status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `,
            [certificateId],
          );

          const certificate = {
            ...updateResult.rows[0],
            employee_id: existingCertificate.employee_id,
            employee_name: existingCertificate.employee_name,
            employee_email: existingCertificate.employee_email,
          };

          // 6. AUTOMATICALLY DEACTIVATE EMPLOYEE
          let deactivatedEmployee = null;

          if (existingCertificate.employee_id) {
            const employeeUpdate = await client.query(
              `
            UPDATE employee_users
            SET is_active = FALSE
            WHERE id = $1
            RETURNING id, name, email, is_active
          `,
              [existingCertificate.employee_id],
            );

            deactivatedEmployee = employeeUpdate.rows[0] || null;

            if (!deactivatedEmployee) {
              throw new Error("Employee account could not be updated.");
            }
          }

          // 7. AUDIT LOG
          await client.query(
            `
          INSERT INTO certificate_audit_logs
          (
            certificate_id,
            action,
            performed_by,
            details
          )
          VALUES ($1, 'CERTIFICATE_REVOKED', $2, $3::jsonb)
        `,
            [
              certificateId,
              revokedBy,
              JSON.stringify({
                reason,
                employee_id: existingCertificate.employee_id,
                employee_name: existingCertificate.employee_name,
                employee_email: existingCertificate.employee_email,
                employee_deactivated: Boolean(deactivatedEmployee),
                certificate_no: existingCertificate.certificate_no,
              }),
            ],
          );

          // 8. EMPLOYEE IN-APP NOTIFICATION
          let notification = null;

          if (existingCertificate.employee_id) {
            notification = await createNotification(client, {
              recipientType: "employee",
              recipientId: existingCertificate.employee_id,
              type: "CERTIFICATE_REVOKED",
              title: "Certificate Revoked",
              message: `Your certificate ${existingCertificate.certificate_no} has been revoked by the administrator. Your employee account has also been deactivated. Reason: ${reason}`,
              certificateId,
            });
          }

          // 9. COMMIT DATABASE TRANSACTION
          await client.query("COMMIT");
          transactionStarted = false;

          // 10. REAL-TIME NOTIFICATION
          if (notification && existingCertificate.employee_id) {
            try {
              emitEmployeeNotification(
                existingCertificate.employee_id,
                notification,
              );
            } catch (notificationError) {
              console.error("Real-time notification error:", notificationError);
            }
          }

          // 11. SEND EMPLOYEE AND ADMIN EMAILS
          const emailNotifications = {
  revocation: {
    employeeEmailSent: false,
    adminEmailSent: false,
  },
  accountDeactivation: {
    employeeEmailSent: false,
    adminEmailSent: false,
  },
};

// Always send certificate revocation emails.
try {
  emailNotifications.revocation =
    await sendCertificateRevocationEmailsSafely({
      employee: employee || {
        name: existingCertificate.employee_name,
        email: existingCertificate.employee_email,
      },
      certificate,
      reason: revocationReason,
      adminEmail: process.env.ADMIN_EMAIL || "nsujalkant@gmail.com",
      revokedBy,
    });
} catch (emailError) {
  console.error(
    "[REVOKE] Certificate revocation email error:",
    emailError,
  );
}

// Send account deactivation emails only when the checkbox was checked
// and the employee was previously active.
if (deactivateEmployee && employee && employeeWasActive) {
  try {
    emailNotifications.accountDeactivation =
      await sendEmployeeAccountStatusEmailsSafely({
        employee,
        isActive: false,
        changedBy: revokedBy,
      });
  } catch (emailError) {
    console.error(
      "[REVOKE] Employee deactivation email error:",
      emailError,
    );
  }
}

          // 12. SUCCESS RESPONSE
          return res.status(200).json({
            success: true,
            message:
              "Certificate revoked and employee account deactivated successfully.",
            certificate,
            employee: deactivatedEmployee,
            emailNotifications: emailResults,
          });
        } catch (error) {
          if (client && transactionStarted) {
            try {
              await client.query("ROLLBACK");
            } catch (rollbackError) {
              console.error("Revoke rollback error:", rollbackError);
            }
          }

          console.error("Revoke certificate error:", error);
          return next(error);
        } finally {
          if (client) {
            client.release();
          }
        }
      },
    );

    /* =====================================================
         VALID / ISSUED CERTIFICATE
      ===================================================== */

    return res.status(200).json({
      success: true,

      valid: true,

      status: "valid",

      message:
        "This certificate has been successfully verified against our official company records.",

      certificate: {
        id: certificate.id,

        certificate_no: certificate.certificate_no,

        certificate_type: certificate.certificate_type,

        employee_id: certificate.employee_id,

        recipient_name: certificate.recipient_name,

        course_name: certificate.course_name,

        issuer_name: certificate.issuer_name,

        issue_date: certificate.issue_date,

        verification_token: certificate.verification_token,

        duration_months: certificate.duration_months,

        status: certificate.status,

        created_at: certificate.created_at,

        revoked_at: certificate.revoked_at,
      },
    });
  } catch (error) {
    console.error("Public certificate verification error:", error);

    next(error);
  }
});

// ============================================================
// 45. 404 ROUTE
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,

    message: "Route not found.",

    path: req.originalUrl,
  });
});

// ============================================================
// 46. GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    success: false,

    message: error.message || "Internal server error.",
  });
});

// ============================================================
// 47. DATABASE STARTUP CHECK
// ============================================================

async function startServer() {
  try {
    console.log("Checking PostgreSQL connection...");

    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully.");

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log("========================================");

      console.log(`🚀 Certificate API running on port ${PORT}`);

      console.log(`🌐 Client URL: ${CLIENT_URL}`);

      console.log("🐘 PostgreSQL connected");

      console.log("🔌 Socket.IO real-time notifications enabled");

      console.log("📜 Multi-certificate employee API enabled");

      console.log("🔐 Public certificate verification enabled");

      console.log("🔒 Protected employee certificate view enabled");

      console.log("📝 Secure certificate request workflow enabled");

      console.log("========================================");
    });

    httpServer.on("error", (error) => {
      console.error("HTTP server error:", error);

      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      }

      process.exit(1);
    });
  } catch (error) {
    console.error("Server startup failed:");

    console.error(error);

    process.exit(1);
  }
}

// ============================================================
// 48. START APPLICATION
// ============================================================

if (!process.env.VERCEL) {
  startServer();
}
