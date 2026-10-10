const path = require("path");
const http = require("http");
const dotenv = require("dotenv");

// ============================================================
// LOAD .ENV BEFORE DB
// ============================================================

dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const pool = require("./db");

const {
  router: authRouter,
  requireAdmin,
} = require("./routes/auth");

const {
  router: employeeAuthRouter,
  requireEmployee,
} = require("./routes/employeeAuth");

const {
  router: notificationRouter,
  createNotification,
} = require("./routes/notifications");

// ============================================================
// ENVIRONMENT
// ============================================================

const PORT = Number(process.env.PORT) || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

// ============================================================
// APP
// ============================================================

const app = express();

app.disable("x-powered-by");

// ============================================================
// SECURITY
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://192.168.1.5:5173",
  "http://192.168.1.5:5174",
  CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ============================================================
// COOKIES + JSON
// ============================================================

app.use(cookieParser());

app.use(
  express.json({
    limit: "10kb",
  })
);

// ============================================================
// HTTP SERVER + SOCKET.IO
// ============================================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// ============================================================
// SOCKET.IO
// ============================================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ----------------------------------------------------------
  // EMPLOYEE ROOM
  // ----------------------------------------------------------

  socket.on("join:employee", (employeeId) => {
    if (!employeeId) return;

    socket.join(`employee:${employeeId}`);

    console.log(
      `Employee ${employeeId} joined notification room`
    );
  });

  // ----------------------------------------------------------
  // ADMIN ROOM
  // ----------------------------------------------------------

  socket.on("join:admin", (adminId) => {
    if (!adminId) return;

    socket.join(`admin:${adminId}`);

    console.log(
      `Admin ${adminId} joined notification room`
    );
  });

  // ----------------------------------------------------------
  // DISCONNECT
  // ----------------------------------------------------------

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      api: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Health check error:",
      error.message
    );

    return res.status(503).json({
      api: "ok",
      database: "disconnected",
    });
  }
});

// ============================================================
// AUTH ROUTES
// ============================================================

// Original employee auth route
//
// Example:
// POST /api/employee-auth/login
// POST /api/employee-auth/forgot-password
// POST /api/employee-auth/reset-password

app.use(
  "/api/employee-auth",
  employeeAuthRouter
);

// Compatibility route
//
// Also supports:
//
// POST /api/employee/auth/login
// POST /api/employee/auth/forgot-password
// POST /api/employee/auth/reset-password

app.use(
  "/api/employee/auth",
  employeeAuthRouter
);

// Admin authentication

app.use(
  "/api/auth",
  authRouter
);

// ============================================================
// NOTIFICATION ROUTES
// ============================================================

app.use(
  "/api",
  notificationRouter
);

// ============================================================
// ADMIN - ALL EMPLOYEES
// ============================================================

app.get(
  "/api/admin/employees",
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          e.id,
          e.name,
          e.email,
          e.is_active,
          e.created_at,
          e.last_login_at,
          COUNT(c.id)::int AS certificate_count
        FROM employee_users e
        LEFT JOIN certificates c
          ON c.employee_id = e.id
        GROUP BY
          e.id,
          e.name,
          e.email,
          e.is_active,
          e.created_at,
          e.last_login_at
        ORDER BY e.created_at DESC
      `);

      return res.json({
        employees: result.rows,
      });
    } catch (error) {
      console.error(
        "Admin employees error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch employees.",
        error: error.message,
        code: error.code,
      });
    }
  }
);

// ============================================================
// ADMIN - SINGLE EMPLOYEE
// ============================================================

app.get(
  "/api/admin/employees/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const employeeId =
        Number(req.params.id);

      if (
        !Number.isInteger(employeeId) ||
        employeeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid employee ID.",
        });
      }

      const employeeResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            is_active,
            created_at,
            last_login_at
          FROM employee_users
          WHERE id = $1
          LIMIT 1
          `,
          [employeeId]
        );

      if (
        employeeResult.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Employee not found.",
        });
      }

      const certificateResult =
        await pool.query(
          `
          SELECT
            c.*,
            e.name AS employee_name,
            e.email AS employee_email
          FROM certificates c
          LEFT JOIN employee_users e
            ON e.id = c.employee_id
          WHERE c.employee_id = $1
          ORDER BY
            c.issue_date DESC,
            c.id DESC
          `,
          [employeeId]
        );

      return res.json({
        employee:
          employeeResult.rows[0],
        certificates:
          certificateResult.rows,
      });
    } catch (error) {
      console.error(
        "Admin employee details error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch employee details.",
        error: error.message,
        code: error.code,
      });
    }
  }
);

// ============================================================
// DEBUG - EMPLOYEE 5
// Remove this route before production
// ============================================================

app.get(
  "/api/debug/employee-5",
  async (req, res) => {
    try {
      const result =
        await pool.query(`
          SELECT *
          FROM employee_users
          WHERE id = 5
        `);

      return res.json(result.rows);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          error.message,
      });
    }
  }
);

// ============================================================
// ADMIN - ALL CERTIFICATES
// ============================================================

app.get(
  "/api/admin/certificates",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(`
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

            e.name AS employee_name,
            e.email AS employee_email

          FROM certificates c

          LEFT JOIN employee_users e
            ON e.id = c.employee_id

          ORDER BY
            c.created_at DESC
        `);

      return res.json({
        certificates:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Admin certificates fetch error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificates.",
        error: error.message,
        code: error.code,
      });
    }
  }
);

// ============================================================
// ADMIN - SINGLE CERTIFICATE
// ============================================================

app.get(
  "/api/admin/certificates/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const certificateId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate ID.",
        });
      }

      const result =
        await pool.query(
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

            e.name AS employee_name,
            e.email AS employee_email

          FROM certificates c

          LEFT JOIN employee_users e
            ON e.id = c.employee_id

          WHERE c.id = $1
          LIMIT 1
          `,
          [certificateId]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Certificate not found.",
        });
      }

      return res.json({
        certificate:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Admin certificate fetch error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificate.",
        error: error.message,
        code: error.code,
      });
    }
  }
);

// ============================================================
// ADMIN - CREATE / ISSUE CERTIFICATE
// ============================================================

app.post(
  "/api/admin/certificates",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        requestId,
        certificateType,
        courseName,
        issuerName,
        issueDate,
      } = req.body;

      const cleanRequestId =
        Number(requestId);

      const cleanCertificateType =
        String(
          certificateType || ""
        )
          .trim()
          .toUpperCase();

      const cleanCourseName =
        String(
          courseName || ""
        ).trim();

      const cleanIssuerName =
        String(
          issuerName || ""
        ).trim();

      const cleanIssueDate =
        String(
          issueDate || ""
        ).trim();

      if (
        !Number.isInteger(
          cleanRequestId
        ) ||
        cleanRequestId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate request ID.",
        });
      }

      if (
        !["CERT", "INTR"].includes(
          cleanCertificateType
        )
      ) {
        return res.status(400).json({
          message:
            "Certificate type must be CERT or INTR.",
        });
      }

      if (!cleanCourseName) {
        return res.status(400).json({
          message:
            "Course name is required.",
        });
      }

      if (
        cleanCourseName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Course name must not exceed 200 characters.",
        });
      }

      if (!cleanIssuerName) {
        return res.status(400).json({
          message:
            "Issuer name is required.",
        });
      }

      if (
        cleanIssuerName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Issuer name must not exceed 200 characters.",
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          cleanIssueDate
        )
      ) {
        return res.status(400).json({
          message:
            "Issue date must use YYYY-MM-DD format.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const requestResult =
        await client.query(
          `
          SELECT
            cr.*,
            e.name AS employee_name,
            e.email AS employee_email,
            e.is_active AS employee_is_active
          FROM certificate_requests cr
          JOIN employee_users e
            ON e.id = cr.employee_id
          WHERE cr.id = $1
          FOR UPDATE
          `,
          [cleanRequestId]
        );

      if (
        requestResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Certificate request not found.",
        });
      }

      const request =
        requestResult.rows[0];

      if (
        String(
          request.status
        ).toLowerCase() !==
        "pending"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "This certificate request has already been processed.",
        });
      }

      if (
        !request.employee_is_active
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "The employee account is inactive.",
        });
      }

      const year =
        new Date(
          `${cleanIssueDate}T00:00:00`
        ).getFullYear();

      const prefix =
        cleanCertificateType ===
        "INTR"
          ? "EITS-INTR"
          : "EITS-CERT";

      const numberResult =
        await client.query(
          `
          SELECT
            certificate_no
          FROM certificates
          WHERE certificate_no LIKE $1
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
          `,
          [
            `${prefix}-${year}-%`,
          ]
        );

      let nextNumber = 1001;

      if (
        numberResult.rows.length >
        0
      ) {
        const lastCertificate =
          numberResult.rows[0]
            .certificate_no;

        const match =
          String(
            lastCertificate
          ).match(
            /-(\d+)$/
          );

        if (match) {
          const parsedNumber =
            Number(match[1]);

          if (
            Number.isInteger(
              parsedNumber
            )
          ) {
            nextNumber =
              parsedNumber + 1;
          }
        }
      }

      const certificateNumber =
        `${prefix}-${year}-${nextNumber}`;

      const certificateResult =
        await client.query(
          `
          INSERT INTO certificates (
            certificate_no,
            certificate_type,
            employee_id,
            recipient_name,
            course_name,
            issuer_name,
            issue_date,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            'issued'
          )
          RETURNING *
          `,
          [
            certificateNumber,
            cleanCertificateType,
            request.employee_id,
            request.employee_name,
            cleanCourseName,
            cleanIssuerName,
            cleanIssueDate,
          ]
        );

      const certificate =
        certificateResult.rows[0];

      await client.query(
        `
        UPDATE certificate_requests
        SET
          status = 'issued',
          certificate_id = $1,
          reviewed_at = NOW(),
          issued_at = NOW()
        WHERE id = $2
        `,
        [
          certificate.id,
          cleanRequestId,
        ]
      );

      await client.query(
        `
        INSERT INTO certificate_audit_logs (
          certificate_id,
          action,
          performed_by,
          details
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        `,
        [
          certificate.id,
          "CERTIFICATE_ISSUED",
          req.admin?.email ||
            req.admin?.id ||
            "admin",
          JSON.stringify({
            requestId:
              cleanRequestId,
            employeeId:
              request.employee_id,
            certificateNo:
              certificate.certificate_no,
          }),
        ]
      );

      const employeeNotification =
        await createNotification(
          client,
          {
            recipientType:
              "employee",

            recipientId:
              request.employee_id,

            type:
              "CERTIFICATE_ISSUED",

            title:
              "Certificate Issued",

            message:
              `Your ${cleanCertificateType} certificate for "${cleanCourseName}" has been issued.`,

            certificateRequestId:
              cleanRequestId,

            certificateId:
              certificate.id,
          }
        );

      await client.query(
        "COMMIT"
      );

      if (
        employeeNotification
      ) {
        io.to(
          `employee:${request.employee_id}`
        ).emit(
          "notification:new",
          employeeNotification
        );
      }

      return res.status(201).json({
        message:
          "Certificate issued successfully.",

        certificate,

        request: {
          id: request.id,
          status: "issued",
          employee_id:
            request.employee_id,
        },
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "========================================"
      );

      console.error(
        "ADMIN CERTIFICATE CREATION ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Detail:",
        error.detail
      );

      console.error(
        "Hint:",
        error.hint
      );

      console.error(
        "Column:",
        error.column
      );

      console.error(
        "Constraint:",
        error.constraint
      );

      console.error(
        "========================================"
      );

      return res.status(500).json({
        message:
          "Failed to issue certificate.",
        error:
          error.message,
        code:
          error.code,
        detail:
          error.detail,
        hint:
          error.hint,
        column:
          error.column,
        constraint:
          error.constraint,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// ADMIN - UPDATE CERTIFICATE
// ============================================================

app.put(
  "/api/admin/certificates/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const certificateId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate ID.",
        });
      }

      const {
        courseName,
        issuerName,
        recipientName,
        issueDate,
      } = req.body;

      const cleanCourseName =
        String(
          courseName || ""
        ).trim();

      const cleanIssuerName =
        String(
          issuerName || ""
        ).trim();

      const cleanRecipientName =
        String(
          recipientName || ""
        ).trim();

      const cleanIssueDate =
        String(
          issueDate || ""
        ).trim();

      if (!cleanCourseName) {
        return res.status(400).json({
          message:
            "Course name is required.",
        });
      }

      if (
        cleanCourseName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Course name must not exceed 200 characters.",
        });
      }

      if (!cleanIssuerName) {
        return res.status(400).json({
          message:
            "Issuer name is required.",
        });
      }

      if (
        cleanIssuerName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Issuer name must not exceed 200 characters.",
        });
      }

      if (!cleanRecipientName) {
        return res.status(400).json({
          message:
            "Recipient name is required.",
        });
      }

      if (
        cleanRecipientName.length >
        150
      ) {
        return res.status(400).json({
          message:
            "Recipient name must not exceed 150 characters.",
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          cleanIssueDate
        )
      ) {
        return res.status(400).json({
          message:
            "Issue date must use YYYY-MM-DD format.",
        });
      }

      const result =
        await pool.query(
          `
          UPDATE certificates
          SET
            course_name = $1,
            issuer_name = $2,
            recipient_name = $3,
            issue_date = $4
          WHERE id = $5
          RETURNING *
          `,
          [
            cleanCourseName,
            cleanIssuerName,
            cleanRecipientName,
            cleanIssueDate,
            certificateId,
          ]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Certificate not found.",
        });
      }

      await pool.query(
        `
        INSERT INTO certificate_audit_logs (
          certificate_id,
          action,
          performed_by,
          details
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        `,
        [
          certificateId,
          "CERTIFICATE_UPDATED",
          req.admin?.email ||
            req.admin?.id ||
            "admin",
          JSON.stringify({
            certificateId,
          }),
        ]
      );

      return res.json({
        message:
          "Certificate updated successfully.",
        certificate:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Update certificate error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update certificate.",
        error:
          error.message,
        code:
          error.code,
      });
    }
  }
);

// ============================================================
// ADMIN - REVOKE CERTIFICATE
// ============================================================

app.patch(
  "/api/admin/certificates/:id/revoke",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const certificateId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate ID.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const certificateResult =
        await client.query(
          `
          SELECT *
          FROM certificates
          WHERE id = $1
          FOR UPDATE
          `,
          [certificateId]
        );

      if (
        certificateResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Certificate not found.",
        });
      }

      const certificate =
        certificateResult.rows[0];

      if (
        String(
          certificate.status
        ).toLowerCase() ===
        "revoked"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "Certificate is already revoked.",
        });
      }

      const revokeResult =
        await client.query(
          `
          UPDATE certificates
          SET
            status = 'revoked',
            revoked_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [certificateId]
        );

      const revokedCertificate =
        revokeResult.rows[0];

      await client.query(
        `
        INSERT INTO certificate_audit_logs (
          certificate_id,
          action,
          performed_by,
          details
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        `,
        [
          certificateId,
          "CERTIFICATE_REVOKED",
          req.admin?.email ||
            req.admin?.id ||
            "admin",
          JSON.stringify({
            certificateNo:
              certificate.certificate_no,
          }),
        ]
      );

      const notification =
        await createNotification(
          client,
          {
            recipientType:
              "employee",

            recipientId:
              certificate.employee_id,

            type:
              "CERTIFICATE_REVOKED",

            title:
              "Certificate Revoked",

            message:
              `Your certificate ${certificate.certificate_no} has been revoked.`,

            certificateId,
          }
        );

      await client.query(
        "COMMIT"
      );

      if (notification) {
        io.to(
          `employee:${certificate.employee_id}`
        ).emit(
          "notification:new",
          notification
        );
      }

      return res.json({
        message:
          "Certificate revoked successfully.",
        certificate:
          revokedCertificate,
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "Revoke certificate error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to revoke certificate.",
        error:
          error.message,
        code:
          error.code,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// ADMIN - DELETE CERTIFICATE
// ============================================================

app.delete(
  "/api/admin/certificates/:id",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const certificateId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate ID.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const certificateResult =
        await client.query(
          `
          SELECT *
          FROM certificates
          WHERE id = $1
          FOR UPDATE
          `,
          [certificateId]
        );

      if (
        certificateResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Certificate not found.",
        });
      }

      const certificate =
        certificateResult.rows[0];

      if (
        String(
          certificate.status
        ).toLowerCase() ===
        "issued"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "Issued certificates cannot be deleted. Revoke the certificate first.",
        });
      }

      await client.query(
        `
        DELETE FROM certificates
        WHERE id = $1
        `,
        [certificateId]
      );

      await client.query(
        "COMMIT"
      );

      console.log(
        "Certificate deleted:",
        {
          certificateId:
            certificate.id,

          certificateNo:
            certificate.certificate_no,

          performedBy:
            req.admin?.email ||
            req.admin?.id ||
            "admin",
        }
      );

      return res.json({
        message:
          "Certificate deleted successfully.",
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "Delete certificate error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete certificate.",
        error:
          error.message,
        code:
          error.code,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// EMPLOYEE - ALL OWN CERTIFICATES
// ============================================================

app.get(
  "/api/employee/certificates",
  requireEmployee,
  async (req, res) => {
    try {
      const employeeId =
        req.employee?.id;

      if (!employeeId) {
        return res.status(401).json({
          message:
            "Employee authentication required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT *
          FROM certificates
          WHERE employee_id = $1
            AND status = 'issued'
          ORDER BY
            issue_date DESC,
            id DESC
          `,
          [employeeId]
        );

      return res.json({
        certificates:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Employee certificates error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificates.",
        error:
          error.message,
        code:
          error.code,
      });
    }
  }
);

// ============================================================
// EMPLOYEE - SINGLE CERTIFICATE
// ============================================================

app.get(
  "/api/employee/certificates/:token",
  requireEmployee,
  async (req, res) => {
    try {
      const employeeId =
        req.employee?.id;

      const token =
        String(
          req.params.token || ""
        ).trim();

      if (!employeeId) {
        return res.status(401).json({
          message:
            "Employee authentication required.",
        });
      }

      if (
        !/^[0-9a-fA-F-]{36}$/.test(
          token
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid verification token.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT *
          FROM certificates
          WHERE verification_token = $1
            AND employee_id = $2
          LIMIT 1
          `,
          [
            token,
            employeeId,
          ]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Certificate not found.",
        });
      }

      return res.json({
        certificate:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Employee certificate details error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificate.",
        error:
          error.message,
        code:
          error.code,
      });
    }
  }
);

// ============================================================
// EMPLOYEE - QR
// ============================================================

app.get(
  "/api/employee/qr",
  requireEmployee,
  async (req, res) => {
    try {
      const employeeId =
        req.employee?.id;

      if (!employeeId) {
        return res.status(401).json({
          message:
            "Employee authentication required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            certificate_no,
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
          [employeeId]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "No issued certificate found.",
        });
      }

      return res.json({
        certificate:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Employee QR error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to generate QR information.",
        error:
          error.message,
        code:
          error.code,
      });
    }
  }
);

// ============================================================
// EMPLOYEE - CREATE CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/employee/certificate-requests",
  requireEmployee,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const employeeId =
        req.employee?.id;

      if (!employeeId) {
        return res.status(401).json({
          message:
            "Employee authentication required.",
        });
      }

      const {
        certificateType,
        courseName,
        additionalDetails,
      } = req.body;

      const cleanCertificateType =
        String(
          certificateType || ""
        )
          .trim()
          .toUpperCase();

      const cleanCourseName =
        String(
          courseName || ""
        ).trim();

      const cleanAdditionalDetails =
        String(
          additionalDetails || ""
        ).trim();

      if (
        !["CERT", "INTR"].includes(
          cleanCertificateType
        )
      ) {
        return res.status(400).json({
          message:
            "Certificate type must be CERT or INTR.",
        });
      }

      if (!cleanCourseName) {
        return res.status(400).json({
          message:
            "Course name is required.",
        });
      }

      if (
        cleanCourseName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Course name must not exceed 200 characters.",
        });
      }

      if (
        cleanAdditionalDetails.length >
        2000
      ) {
        return res.status(400).json({
          message:
            "Additional details must not exceed 2000 characters.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const employeeResult =
        await client.query(
          `
          SELECT
            id,
            name,
            email,
            is_active
          FROM employee_users
          WHERE id = $1
          LIMIT 1
          `,
          [employeeId]
        );

      if (
        employeeResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Employee account not found.",
        });
      }

      const employee =
        employeeResult.rows[0];

      if (!employee.is_active) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(403).json({
          message:
            "Employee account is inactive.",
        });
      }

      const pendingResult =
        await client.query(
          `
          SELECT
            id,
            certificate_type,
            course_name,
            status,
            created_at
          FROM certificate_requests
          WHERE employee_id = $1
            AND status = 'pending'
          ORDER BY
            created_at DESC
          LIMIT 1
          `,
          [employeeId]
        );

      if (
        pendingResult.rows.length >
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "You already have a pending certificate request.",

          request:
            pendingResult.rows[0],
        });
      }

      const requestResult =
        await client.query(
          `
          INSERT INTO certificate_requests (
            employee_id,
            certificate_type,
            course_name,
            additional_details,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'pending'
          )
          RETURNING
            id,
            employee_id,
            certificate_type,
            course_name,
            additional_details,
            status,
            certificate_id,
            rejection_reason,
            created_at,
            reviewed_at,
            issued_at
          `,
          [
            employeeId,
            cleanCertificateType,
            cleanCourseName,
            cleanAdditionalDetails ||
              null,
          ]
        );

      const request =
        requestResult.rows[0];

      await client.query(
        "COMMIT"
      );

      return res.status(201).json({
        message:
          "Certificate request submitted successfully.",

        request,
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "Employee certificate request error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to submit certificate request.",

        error:
          error.message,

        code:
          error.code,

        detail:
          error.detail,

        hint:
          error.hint,

        column:
          error.column,

        constraint:
          error.constraint,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// EMPLOYEE - OWN CERTIFICATE REQUESTS
// ============================================================

app.get(
  "/api/employee/certificate-requests",
  requireEmployee,
  async (req, res) => {
    try {
      const employeeId =
        req.employee?.id;

      if (!employeeId) {
        return res.status(401).json({
          message:
            "Employee authentication required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            employee_id,
            certificate_type,
            course_name,
            additional_details,
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
          [employeeId]
        );

      return res.status(200).json({
        requests:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Employee certificate requests error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificate requests.",
        error:
          error.message,
        code:
          error.code,
      });
    }
  }
);

// ============================================================
// ADMIN - CREATE CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/admin/certificate-requests",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        employeeId,
        certificateType,
        courseName,
        additionalDetails,
      } = req.body;

      const cleanEmployeeId =
        Number(employeeId);

      const cleanCertificateType =
        String(
          certificateType || ""
        )
          .trim()
          .toUpperCase();

      const cleanCourseName =
        String(
          courseName || ""
        ).trim();

      const cleanAdditionalDetails =
        String(
          additionalDetails || ""
        ).trim();

      if (
        !Number.isInteger(
          cleanEmployeeId
        ) ||
        cleanEmployeeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid employee ID.",
        });
      }

      if (
        !["CERT", "INTR"].includes(
          cleanCertificateType
        )
      ) {
        return res.status(400).json({
          message:
            "Certificate type must be CERT or INTR.",
        });
      }

      if (!cleanCourseName) {
        return res.status(400).json({
          message:
            "Course name is required.",
        });
      }

      if (
        cleanCourseName.length >
        200
      ) {
        return res.status(400).json({
          message:
            "Course name must not exceed 200 characters.",
        });
      }

      if (
        cleanAdditionalDetails.length >
        2000
      ) {
        return res.status(400).json({
          message:
            "Additional details must not exceed 2000 characters.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const employeeResult =
        await client.query(
          `
          SELECT
            id,
            name,
            email,
            is_active
          FROM employee_users
          WHERE id = $1
          LIMIT 1
          `,
          [cleanEmployeeId]
        );

      if (
        employeeResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Employee not found.",
        });
      }

      const employee =
        employeeResult.rows[0];

      if (!employee.is_active) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "Employee account is not active.",
        });
      }

      const pendingResult =
        await client.query(
          `
          SELECT id
          FROM certificate_requests
          WHERE employee_id = $1
            AND status = 'pending'
          LIMIT 1
          `,
          [cleanEmployeeId]
        );

      if (
        pendingResult.rows.length >
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "This employee already has a pending certificate request.",
        });
      }

      const requestResult =
        await client.query(
          `
          INSERT INTO certificate_requests (
            employee_id,
            certificate_type,
            course_name,
            additional_details,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'pending'
          )
          RETURNING
            id,
            employee_id,
            certificate_type,
            course_name,
            additional_details,
            status,
            certificate_id,
            rejection_reason,
            created_at,
            reviewed_at,
            issued_at
          `,
          [
            cleanEmployeeId,
            cleanCertificateType,
            cleanCourseName,
            cleanAdditionalDetails ||
              null,
          ]
        );

      const request =
        requestResult.rows[0];

      await client.query(
        "COMMIT"
      );

      return res.status(201).json({
        message:
          "Certificate request created successfully.",

        request,
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "Admin create certificate request error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create certificate request.",

        error:
          error.message,

        code:
          error.code,

        detail:
          error.detail,

        hint:
          error.hint,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// ADMIN - ALL CERTIFICATE REQUESTS
// ============================================================

app.get(
  "/api/admin/certificate-requests",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.employee_id,
            r.certificate_type,
            r.course_name,
            r.additional_details,
            r.status,
            r.certificate_id,
            r.rejection_reason,
            r.created_at,
            r.reviewed_at,
            r.issued_at,

            e.id AS employee_user_id,
            e.name AS employee_name,
            e.email AS employee_email,
            e.is_active AS employee_is_active,

            c.certificate_no,
            c.verification_token

          FROM certificate_requests r

          LEFT JOIN employee_users e
            ON e.id = r.employee_id

          LEFT JOIN certificates c
            ON c.id = r.certificate_id

          ORDER BY
            r.created_at DESC,
            r.id DESC
          `
        );

      return res.status(200).json({
        requests:
          result.rows,

        count:
          result.rows.length,
      });
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "ADMIN CERTIFICATE REQUESTS ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Detail:",
        error.detail
      );

      console.error(
        "Hint:",
        error.hint
      );

      console.error(
        "Column:",
        error.column
      );

      console.error(
        "========================================"
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificate requests.",

        error:
          error.message,

        code:
          error.code,

        detail:
          error.detail,

        hint:
          error.hint,

        column:
          error.column,
      });
    }
  }
);

// ============================================================
// ADMIN - SINGLE CERTIFICATE REQUEST
// ============================================================

app.get(
  "/api/admin/certificate-requests/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const requestId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          requestId
        ) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate request ID.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.employee_id,
            r.certificate_type,
            r.course_name,
            r.additional_details,
            r.status,
            r.certificate_id,
            r.rejection_reason,
            r.created_at,
            r.reviewed_at,
            r.issued_at,

            e.id AS employee_user_id,
            e.name AS employee_name,
            e.email AS employee_email,
            e.is_active AS employee_is_active

          FROM certificate_requests r

          LEFT JOIN employee_users e
            ON e.id = r.employee_id

          WHERE r.id = $1

          LIMIT 1
          `,
          [requestId]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Certificate request not found.",
        });
      }

      return res.status(200).json({
        request:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "ADMIN CERTIFICATE REQUEST DETAIL ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Detail:",
        error.detail
      );

      console.error(
        "Hint:",
        error.hint
      );

      console.error(
        "========================================"
      );

      return res.status(500).json({
        message:
          "Failed to fetch certificate request.",

        error:
          error.message,

        code:
          error.code,

        detail:
          error.detail,

        hint:
          error.hint,

        column:
          error.column,
      });
    }
  }
);

// ============================================================
// ADMIN - REJECT CERTIFICATE REQUEST
// ============================================================

app.post(
  "/api/admin/certificate-requests/:id/reject",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const requestId =
        Number(req.params.id);

      const rejectionReason =
        String(
          req.body?.rejectionReason ||
            ""
        ).trim();

      if (
        !Number.isInteger(
          requestId
        ) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid certificate request ID.",
        });
      }

      if (
        rejectionReason.length >
        1000
      ) {
        return res.status(400).json({
          message:
            "Rejection reason must not exceed 1000 characters.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const requestResult =
        await client.query(
          `
          SELECT
            cr.*,
            e.name AS employee_name,
            e.email AS employee_email
          FROM certificate_requests cr
          JOIN employee_users e
            ON e.id = cr.employee_id
          WHERE cr.id = $1
          FOR UPDATE
          `,
          [requestId]
        );

      if (
        requestResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "Certificate request not found.",
        });
      }

      const request =
        requestResult.rows[0];

      if (
        String(
          request.status
        ).toLowerCase() !==
        "pending"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "This certificate request has already been processed.",
        });
      }

      const updateResult =
        await client.query(
          `
          UPDATE certificate_requests
          SET
            status = 'rejected',
            rejection_reason = $1,
            reviewed_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            employee_id,
            certificate_type,
            course_name,
            additional_details,
            status,
            certificate_id,
            rejection_reason,
            created_at,
            reviewed_at,
            issued_at
          `,
          [
            rejectionReason ||
              "Certificate request rejected by administrator.",
            requestId,
          ]
        );

      const rejectedRequest =
        updateResult.rows[0];

      const notification =
        await createNotification(
          client,
          {
            recipientType:
              "employee",

            recipientId:
              request.employee_id,

            type:
              "CERTIFICATE_REQUEST_REJECTED",

            title:
              "Certificate Request Rejected",

            message:
              rejectionReason ||
              "Your certificate request has been rejected by the administrator.",

            certificateRequestId:
              requestId,
          }
        );

      await client.query(
        "COMMIT"
      );

      if (notification) {
        io.to(
          `employee:${request.employee_id}`
        ).emit(
          "notification:new",
          notification
        );
      }

      return res.json({
        message:
          "Certificate request rejected successfully.",

        request:
          rejectedRequest,
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }

      console.error(
        "Reject certificate request error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to reject certificate request.",

        error:
          error.message,

        code:
          error.code,
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================
// DEPRECATED ISSUE REQUEST ROUTE
// ============================================================

app.post(
  "/api/admin/certificate-requests/:id/issue",
  requireAdmin,
  async (req, res) => {
    return res.status(410).json({
      message:
        "This endpoint is deprecated. Use POST /api/admin/certificates with requestId.",
    });
  }
);

// ============================================================
// PUBLIC CERTIFICATE VERIFICATION
// ============================================================

const verifyLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 60,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many verification requests. Please try again later.",
    },
  });

app.get(
  "/api/verify/:token",
  verifyLimiter,
  async (req, res) => {
    try {
      const token =
        String(
          req.params.token || ""
        ).trim();

      if (
        !/^[0-9a-fA-F-]{36}$/.test(
          token
        )
      ) {
        return res.status(400).json({
          valid: false,

          message:
            "Invalid verification token.",
        });
      }

      const result =
        await pool.query(
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
            status,
            created_at,
            revoked_at
          FROM certificates
          WHERE verification_token = $1
          LIMIT 1
          `,
          [token]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res.status(404).json({
          valid: false,

          message:
            "Certificate not found.",
        });
      }

      const certificate =
        result.rows[0];

      if (
        String(
          certificate.status
        ).toLowerCase() ===
        "issued"
      ) {
        return res.json({
          valid: true,

          status: "issued",

          certificate,
        });
      }

      return res.json({
        valid: false,

        status: "revoked",

        certificateNo:
          certificate.certificate_no,

        message:
          "This certificate has been revoked.",
      });
    } catch (error) {
      console.error(
        "Certificate verification error:",
        error
      );

      return res.status(500).json({
        valid: false,

        message:
          "Certificate verification failed.",

        error:
          error.message,

        code:
          error.code,
      });
    }
  }
);

// ============================================================
// API 404
// ============================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      message:
        "API endpoint not found.",
    });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res.status(500).json({
      message:
        "Internal server error.",
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    await pool.query(
      "SELECT 1"
    );

    console.log(
      "PostgreSQL connected successfully."
    );

    server.listen(
      PORT,
      () => {
        console.log(
          `Certificate API running on port ${PORT}`
        );

        console.log(
          `Health: http://localhost:${PORT}/api/health`
        );

        console.log(
          `Employee Auth: http://localhost:${PORT}/api/employee-auth`
        );

        console.log(
          `Employee Auth Compatibility: http://localhost:${PORT}/api/employee/auth`
        );
      }
    );
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();