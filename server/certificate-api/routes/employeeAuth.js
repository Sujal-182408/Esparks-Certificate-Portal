import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import nodemailer from "nodemailer";

import pool from "../db.js";

import {
  requireTrustedOrigin,
} from "./auth.js";

const router = express.Router();

// =====================================================
// CONFIG
// =====================================================

const COOKIE_NAME =
  "certificate_employee_session";

const JWT_ISSUER =
  "certificate-api";

const JWT_AUDIENCE =
  "certificate-employee";

const SESSION_MINUTES = 15;

const RESET_TOKEN_MINUTES = 30;

// =====================================================
// ENVIRONMENT
// =====================================================

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL === "1";
// =====================================================
// LOGIN RATE LIMIT
// =====================================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// REGISTER RATE LIMIT
// =====================================================

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// FORGOT PASSWORD RATE LIMIT
// =====================================================

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// RESET PASSWORD RATE LIMIT
// =====================================================

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// JWT SECRET
// =====================================================

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (
    !secret ||
    Buffer.byteLength(secret, "utf8") < 64
  ) {
    throw new Error(
      "JWT_SECRET must be at least 64 bytes."
    );
  }

  return secret;
}

// =====================================================
// EMAIL NORMALIZATION
// =====================================================

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// =====================================================
// COMPANY EMAIL VALIDATION
// =====================================================

function isCompanyEmail(email) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@esparksit\.com$/i.test(
    email
  );
}

// =====================================================
// PUBLIC EMPLOYEE
// =====================================================

function publicEmployee(employee) {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: "employee",
  };
}

// =====================================================
// PASSWORD VALIDATION
// =====================================================

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

// =====================================================
// SET SESSION COOKIE
// =====================================================

function setSessionCookie(res, employee) {
  const token = jwt.sign(
    {
      sub: String(employee.id),
      role: "employee",
    },
    getJwtSecret(),
    {
      expiresIn: `${SESSION_MINUTES}m`,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,

    secure: isProduction,

    sameSite: isProduction
      ? "none"
      : "lax",

    path: "/",

    maxAge:
      SESSION_MINUTES * 60 * 1000,
  });
}

// =====================================================
// CLEAR SESSION
// =====================================================

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,

    secure: isProduction,

    sameSite: isProduction
      ? "none"
      : "lax",

    path: "/",
  });
}

// =====================================================
// GENERATE RESET TOKEN
// =====================================================

function generateResetToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

// =====================================================
// HASH RESET TOKEN
// =====================================================

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

// =====================================================
// MAIL TRANSPORTER
// =====================================================

function getMailTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASSWORD
  ) {
    throw new Error(
      "SMTP configuration is missing."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,

    port: Number(SMTP_PORT),

    secure:
      Number(SMTP_PORT) === 465,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// SEND RESET EMAIL
// =====================================================

async function sendPasswordResetEmail({
  email,
  name,
  token,
}) {
  const clientUrl =
    process.env.CLIENT_URL ||
    "http://localhost:5174";

  const resetUrl =
    `${clientUrl}/reset-password?token=${encodeURIComponent(
      token
    )}&type=employee`;

  const transporter =
    getMailTransporter();

  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_USER;

  await transporter.sendMail({
    from,

    to: email,

    subject:
      "Certificate Management System - Password Reset",

    text:
      `Hello ${name || "Employee"},\n\n` +
      `We received a request to reset your password.\n\n` +
      `Reset your password here:\n` +
      `${resetUrl}\n\n` +
      `This link expires in ${RESET_TOKEN_MINUTES} minutes.\n\n` +
      `If you did not request this reset, you can safely ignore this email.\n\n` +
      `Certificate Management System`,

    html: `
      <div style="
        font-family:Arial,sans-serif;
        background:#05080d;
        padding:32px;
      ">
        <div style="
          max-width:600px;
          margin:auto;
          background:#0b1118;
          border:1px solid #164e63;
          border-radius:16px;
          padding:32px;
          color:#e5f9ff;
        ">
          <h2 style="color:#22d3ee;">
            Password Reset
          </h2>

          <p>
            Hello ${escapeHtml(
              name || "Employee"
            )},
          </p>

          <p>
            We received a request to reset your password.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p>
            <a
              href="${escapeHtml(resetUrl)}"
              style="
                display:inline-block;
                background:#06b6d4;
                color:#001018;
                padding:12px 20px;
                border-radius:8px;
                text-decoration:none;
                font-weight:bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p style="color:#94a3b8;">
            This link expires in
            ${RESET_TOKEN_MINUTES} minutes.
          </p>

          <p style="color:#64748b;">
            If you did not request this reset,
            you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

// =====================================================
// REGISTER
// POST /api/employee-auth/register
// =====================================================

router.post(
  "/register",
  registerLimiter,
  requireTrustedOrigin,
  async (req, res, next) => {
    try {
      const name =
        typeof req.body?.name === "string"
          ? req.body.name.trim()
          : "";

      const email =
        normalizeEmail(
          req.body?.email
        );

      const password =
        req.body?.password;

      // NAME
      if (!name || name.length > 100) {
        return res.status(400).json({
          message:
            "Name is required and must be at most 100 characters.",
        });
      }

      // EMAIL
      if (
        !email ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+$/.test(email)
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid email address.",
        });
      }

      // COMPANY EMAIL
      if (!isCompanyEmail(email)) {
        return res.status(403).json({
          message:
            "Only eSparks IT Solutions company email addresses are allowed.",
        });
      }

      // PASSWORD
      if (!validPassword(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 10 characters and no more than 72 UTF-8 bytes.",
        });
      }

      // HASH
      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      // CREATE EMPLOYEE
      const result =
        await pool.query(
          `
          INSERT INTO employee_users
          (
            name,
            email,
            password_hash
          )
          VALUES
          (
            $1,
            $2,
            $3
          )
          RETURNING
            id,
            name,
            email
          `,
          [
            name,
            email,
            passwordHash,
          ]
        );

      const employee =
        result.rows[0];

      // SESSION
      setSessionCookie(
        res,
        employee
      );

      return res.status(201).json({
        message:
          "Employee registered successfully.",

        employee:
          publicEmployee(
            employee
          ),
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message:
            "An account with this email already exists.",
        });
      }

      return next(error);
    }
  }
);

// =====================================================
// LOGIN
// POST /api/employee-auth/login
// =====================================================

router.post(
  "/login",
  loginLimiter,
  requireTrustedOrigin,
  async (req, res, next) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      const password =
        req.body?.password;

      if (
        !email ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          message:
            "Email and password are required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            password_hash,
            is_active
          FROM employee_users
          WHERE LOWER(email) = $1
          LIMIT 1
          `,
          [email]
        );

      const employee =
        result.rows[0];

      if (
        !employee ||
        !employee.is_active ||
        !employee.password_hash
      ) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          employee.password_hash
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      await pool.query(
        `
        UPDATE employee_users
        SET
          last_login_at =
            CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [employee.id]
      );

      setSessionCookie(
        res,
        employee
      );

      return res.json({
        message:
          "Employee login successful.",

        employee:
          publicEmployee(
            employee
          ),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// =====================================================
// ME
// GET /api/employee-auth/me
// =====================================================

router.get(
  "/me",
  async (req, res, next) => {
    try {
      const token =
        req.cookies?.[
          COOKIE_NAME
        ];

      if (!token) {
        return res.status(401).json({
          message:
            "Employee session not found.",
        });
      }

      let payload;

      try {
        payload =
          jwt.verify(
            token,
            getJwtSecret(),
            {
              issuer:
                JWT_ISSUER,

              audience:
                JWT_AUDIENCE,
            }
          );
      } catch {
        clearSessionCookie(res);

        return res.status(401).json({
          message:
            "Employee session is invalid or expired.",
        });
      }

      if (
        payload.role !== "employee" ||
        !payload.sub
      ) {
        clearSessionCookie(res);

        return res.status(401).json({
          message:
            "Invalid employee session.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            is_active
          FROM employee_users
          WHERE
            id = $1
            AND is_active = TRUE
          LIMIT 1
          `,
          [payload.sub]
        );

      if (
        result.rows.length === 0
      ) {
        clearSessionCookie(res);

        return res.status(401).json({
          message:
            "Employee account is inactive or no longer exists.",
        });
      }

      const employee =
        result.rows[0];

      return res.json({
        employee:
          publicEmployee(
            employee
          ),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// =====================================================
// FORGOT PASSWORD
// POST /api/employee-auth/forgot-password
// =====================================================

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  requireTrustedOrigin,
  async (req, res, next) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      // Always same response to prevent
      // account enumeration.

      const safeResponse = {
        success: true,

        message:
          "If the account exists, a password reset link has been sent.",
      };

      if (
        !email ||
        email.length > 254
      ) {
        return res.json(
          safeResponse
        );
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            is_active
          FROM employee_users
          WHERE LOWER(email) = $1
          LIMIT 1
          `,
          [email]
        );

      if (
        result.rows.length === 0
      ) {
        return res.json(
          safeResponse
        );
      }

      const employee =
        result.rows[0];

      if (!employee.is_active) {
        return res.json(
          safeResponse
        );
      }

      // INVALIDATE OLD TOKENS
      await pool.query(
        `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE
          user_type = 'employee'
          AND user_id = $1
          AND used_at IS NULL
        `,
        [employee.id]
      );

      // GENERATE TOKEN
      const token =
        generateResetToken();

      const tokenHash =
        hashResetToken(
          token
        );

      // STORE HASH
      await pool.query(
        `
        INSERT INTO password_reset_tokens
        (
          user_type,
          user_id,
          token_hash,
          expires_at
        )
        VALUES
        (
          'employee',
          $1,
          $2,
          CURRENT_TIMESTAMP +
            INTERVAL '${RESET_TOKEN_MINUTES} minutes'
        )
        `,
        [
          employee.id,
          tokenHash,
        ]
      );

      // SEND EMAIL
      try {
        await sendPasswordResetEmail({
          email:
            employee.email,

          name:
            employee.name,

          token,
        });
      } catch (mailError) {
        console.error(
          "Employee reset email error:",
          mailError.message
        );

        await pool.query(
          `
          UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE token_hash = $1
          `,
          [tokenHash]
        );
      }

      return res.json(
        safeResponse
      );
    } catch (error) {
      return next(error);
    }
  }
);

// =====================================================
// RESET PASSWORD
// POST /api/employee-auth/reset-password
// =====================================================

router.post(
  "/reset-password",
  resetPasswordLimiter,
  requireTrustedOrigin,
  async (req, res, next) => {
    const client =
      await pool.connect();

    let transactionStarted =
      false;

    try {
      const token =
        String(
          req.body?.token || ""
        ).trim();

      const password =
        req.body?.password;

      if (
        !token ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          message:
            "Reset token and new password are required.",
        });
      }

      if (!validPassword(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 10 characters and no more than 72 UTF-8 bytes.",
        });
      }

      const tokenHash =
        hashResetToken(
          token
        );

      await client.query(
        "BEGIN"
      );

      transactionStarted =
        true;

      // FIND VALID TOKEN
      const resetResult =
        await client.query(
          `
          SELECT
            id,
            user_id
          FROM password_reset_tokens
          WHERE
            token_hash = $1
            AND user_type = 'employee'
            AND used_at IS NULL
            AND expires_at > CURRENT_TIMESTAMP
          FOR UPDATE
          `,
          [tokenHash]
        );

      if (
        resetResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        transactionStarted =
          false;

        return res.status(400).json({
          message:
            "Invalid or expired password reset link.",
        });
      }

      const reset =
        resetResult.rows[0];

      // HASH NEW PASSWORD
      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      // UPDATE PASSWORD
      await client.query(
        `
        UPDATE employee_users
        SET
          password_hash = $1
        WHERE id = $2
        `,
        [
          passwordHash,
          reset.user_id,
        ]
      );

      // INVALIDATE ALL RESET TOKENS
      await client.query(
        `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE
          user_type = 'employee'
          AND user_id = $1
          AND used_at IS NULL
        `,
        [reset.user_id]
      );

      await client.query(
        "COMMIT"
      );

      transactionStarted =
        false;

      return res.json({
        success: true,

        message:
          "Password reset successful. Please login again.",
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query(
            "ROLLBACK"
          );
        } catch {}
      }

      return next(error);
    } finally {
      client.release();
    }
  }
);

// =====================================================
// LOGOUT
// POST /api/employee-auth/logout
// =====================================================

router.post(
  "/logout",
  requireTrustedOrigin,
  (req, res) => {
    clearSessionCookie(res);

    return res.json({
      message:
        "Employee logged out successfully.",
    });
  }
);

// =====================================================
// REQUIRE EMPLOYEE
// =====================================================

async function requireEmployee(
  req,
  res,
  next
) {
  try {
    const token =
      req.cookies?.[
        COOKIE_NAME
      ];

    if (!token) {
      return res.status(401).json({
        message:
          "Employee authentication required.",
      });
    }

    let payload;

    try {
      payload =
        jwt.verify(
          token,
          getJwtSecret(),
          {
            issuer:
              JWT_ISSUER,

            audience:
              JWT_AUDIENCE,
          }
        );
    } catch {
      clearSessionCookie(res);

      return res.status(401).json({
        message:
          "Invalid or expired employee session.",
      });
    }

    if (
      payload.role !== "employee" ||
      !payload.sub
    ) {
      clearSessionCookie(res);

      return res.status(403).json({
        message:
          "Employee access only.",
      });
    }

    const result =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          is_active
        FROM employee_users
        WHERE
          id = $1
          AND is_active = TRUE
        LIMIT 1
        `,
        [payload.sub]
      );

    if (
      result.rows.length === 0
    ) {
      clearSessionCookie(res);

      return res.status(401).json({
        message:
          "Employee account is inactive or no longer exists.",
      });
    }

    const employee =
      result.rows[0];

    req.employee =
      publicEmployee(
        employee
      );

    return next();
  } catch (error) {
    return next(error);
  }
}

// =====================================================
// EXPORT
// =====================================================

export {
  router,
  requireEmployee,
};