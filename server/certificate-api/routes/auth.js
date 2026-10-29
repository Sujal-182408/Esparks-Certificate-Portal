import express from "express";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import rateLimit from "express-rate-limit";

import crypto from "node:crypto";


import pool from "../db.js";
import { sendGmailEmail } from "../utils/gmail.js";

const router = express.Router();

// =====================================================

// CONFIG

// =====================================================

const ADMIN_COOKIE_NAME = "certificate_admin_session";

const ADMIN_JWT_ISSUER = "certificate-api";

const ADMIN_JWT_AUDIENCE = "certificate-admin";

const SESSION_MINUTES = 15;

const RESET_TOKEN_MINUTES = 30;

// =====================================================

// ENVIRONMENT

// =====================================================

const isProduction = process.env.NODE_ENV === "production";

// =====================================================

// RATE LIMITERS

// =====================================================

// Admin login

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot password

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,
});

// Reset password

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
    Buffer.byteLength(
      secret,

      "utf8",
    ) < 64
  ) {
    throw new Error("JWT_SECRET must be at least 64 bytes.");
  }

  return secret;
}

// =====================================================

// TRUSTED ORIGIN

// =====================================================

function requireTrustedOrigin(
  req,

  res,

  next,
) {
  try {
    const origin = req.get("origin");

    // Some requests such as server-side

    // requests may not contain Origin.

    if (!origin) {
      return next();
    }

    const trustedOrigins = [
      "http://localhost:5173",

      "http://127.0.0.1:5173",

      "http://localhost:5174",

      "http://127.0.0.1:5174",

      "http://192.168.1.5:5174",

      "https://q8n7zrnv-5173.inc1.devtunnels.ms",
    ];

    if (process.env.CLIENT_URL) {
      const clientUrl = process.env.CLIENT_URL.trim()

        .replace(/\/+$/, "");

      if (clientUrl && !trustedOrigins.includes(clientUrl)) {
        trustedOrigins.push(clientUrl);
      }
    }

    const normalizedOrigin = origin

      .trim()

      .replace(/\/+$/, "");

    if (!trustedOrigins.includes(normalizedOrigin)) {
      console.log(
        "❌ UNTRUSTED ORIGIN:",

        normalizedOrigin,
      );

      return res.status(403).json({
        message: "Untrusted request origin.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
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

// PASSWORD VALIDATION

// =====================================================

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    Buffer.byteLength(
      password,

      "utf8",
    ) <= 72
  );
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

// HTML ESCAPE

// =====================================================

function escapeHtml(value) {
  return String(value)
    .replace(
      /&/g,

      "&amp;",
    )

    .replace(
      /</g,

      "&lt;",
    )

    .replace(
      />/g,

      "&gt;",
    )

    .replace(
      /"/g,

      "&quot;",
    )

    .replace(
      /'/g,

      "&#039;",
    );
}

// =====================================================

// GMAIL API EMAIL DELIVERY

// =====================================================

// =====================================================

// SEND RESET EMAIL

// =====================================================

async function sendPasswordResetEmail({
  email,

  token,
}) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5174";

  const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(
    token,
  )}&type=admin`;

  await sendGmailEmail({

    to: email,

    subject: "Certificate Management System - Admin Password Reset",

    text:
      `Hello,\n\n` +
      `We received a request to reset your administrator password.\n\n` +
      `Reset your password here:\n` +
      `${resetUrl}\n\n` +
      `This link expires in ${RESET_TOKEN_MINUTES} minutes.\n\n` +
      `If you did not request this password reset, you can safely ignore this email.\n\n` +
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



          <h2 style="

            color:#22d3ee;

            margin-top:0;

          ">

            Admin Password Reset

          </h2>



          <p>

            We received a request to reset your

            administrator password.

          </p>



          <p>

            Click the button below to create

            a new password.

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



          <p style="

            color:#94a3b8;

          ">

            This link expires in

            ${RESET_TOKEN_MINUTES}

            minutes.

          </p>



          <p style="

            color:#64748b;

          ">

            If you did not request this password

            reset, you can safely ignore this email.

          </p>



        </div>

      </div>

    `,
  });
}

// =====================================================

// PUBLIC ADMIN

// =====================================================

function publicAdmin(admin) {
  return {
    id: admin.id,

    email: admin.email,

    role: "admin",

    is_active: admin.is_active,
  };
}

// =====================================================

// ADMIN SESSION MIDDLEWARE

// =====================================================

async function requireAdmin(
  req,

  res,

  next,
) {
  try {
    const token = req.cookies?.[ADMIN_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        message: "Admin authentication required.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,

        getJwtSecret(),

        {
          issuer: ADMIN_JWT_ISSUER,

          audience: ADMIN_JWT_AUDIENCE,
        },
      );
    } catch {
      return res.status(401).json({
        message: "Invalid or expired admin session.",
      });
    }

    if (decoded.role !== "admin" || !decoded.id) {
      return res.status(403).json({
        message: "Admin access required.",
      });
    }

    // -------------------------------------------------

    // Verify admin still exists and is active.

    // -------------------------------------------------

    const result = await pool.query(
      `

        SELECT

          id,

          email,

          role,

          is_active

        FROM admin_users

        WHERE

          id = $1

          AND is_active = TRUE

        LIMIT 1

        `,

      [decoded.id],
    );

    if (result.rows.length === 0) {
      res.clearCookie(
        ADMIN_COOKIE_NAME,

        {
          httpOnly: true,

          secure: isProduction,

          sameSite: isProduction ? "none" : "lax",

          path: "/",
        },
      );

      return res.status(401).json({
        message: "Admin account is inactive or no longer exists.",
      });
    }

    const admin = result.rows[0];

    // Make sure the DB role is actually admin.

    if (admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required.",
      });
    }

    req.admin = publicAdmin(admin);

    return next();
  } catch (error) {
    console.error(
      "❌ Admin authentication error:",

      error.message,
    );

    return next(error);
  }
}

// =====================================================

// ADMIN LOGIN

// POST /api/auth/login

// =====================================================

router.post(
  "/login",

  loginLimiter,

  requireTrustedOrigin,

  async (
    req,

    res,

    next,
  ) => {
    try {
      const email = normalizeEmail(req.body?.email);

      const password = req.body?.password;

      if (!email || typeof password !== "string") {
        return res.status(400).json({
          message: "Email and password are required.",
        });
      }

      // ------------------------------------------------

      // Exact admin_users schema

      // ------------------------------------------------

      const result = await pool.query(
        `

          SELECT

            id,

            email,

            password_hash,

            role,

            is_active

          FROM admin_users

          WHERE LOWER(email) = $1

          LIMIT 1

          `,

        [email],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      const admin = result.rows[0];

      // Only admin role can log in here.

      if (admin.role !== "admin") {
        return res.status(403).json({
          message: "Admin access required.",
        });
      }

      if (!admin.is_active) {
        return res.status(403).json({
          message: "Admin account is inactive.",
        });
      }

      if (!admin.password_hash) {
        return res.status(500).json({
          message: "Admin password is not configured.",
        });
      }

      const passwordMatch = await bcrypt.compare(
        password,

        admin.password_hash,
      );

      if (!passwordMatch) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      // Update login timestamp.

      await pool.query(
        `

        UPDATE admin_users

        SET

          last_login_at =

            CURRENT_TIMESTAMP

        WHERE id = $1

        `,

        [admin.id],
      );

      // ------------------------------------------------

      // Create JWT

      // ------------------------------------------------

      const token = jwt.sign(
        {
          id: admin.id,

          email: admin.email,

          role: "admin",
        },

        getJwtSecret(),

        {
          expiresIn: `${SESSION_MINUTES}m`,

          issuer: ADMIN_JWT_ISSUER,

          audience: ADMIN_JWT_AUDIENCE,
        },
      );

      // ------------------------------------------------

      // Cookie

      // ------------------------------------------------

      res.cookie(
        ADMIN_COOKIE_NAME,

        token,

        {
          httpOnly: true,

          secure: isProduction,

          sameSite: isProduction ? "none" : "lax",

          path: "/",

          maxAge: SESSION_MINUTES * 60 * 1000,
        },
      );

      return res.json({
        message: "Admin login successful.",

        admin: publicAdmin(admin),
      });
    }  catch (error) {
  console.error("ADMIN LOGIN FAILED:", {
    name: error.name,
    message: error.message,
    code: error.code,
    table: error.table,
    column: error.column,
    constraint: error.constraint,
    stack: error.stack,
  });

  return next(error);
}
  },
);
// =====================================================

// ADMIN ME

// GET /api/auth/me

// =====================================================

router.get(
  "/me",

  requireAdmin,

  async (
    req,

    res,

    next,
  ) => {
    try {
      const result = await pool.query(
        `

          SELECT

            id,

            email,

            role,

            is_active,

            created_at,

            last_login_at

          FROM admin_users

          WHERE id = $1

          LIMIT 1

          `,

        [req.admin.id],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Admin account not found.",
        });
      }

      const admin = result.rows[0];

      if (!admin.is_active) {
        return res.status(403).json({
          message: "Admin account is inactive.",
        });
      }

      if (admin.role !== "admin") {
        return res.status(403).json({
          message: "Admin access required.",
        });
      }

      return res.json({
        admin: {
          id: admin.id,

          email: admin.email,

          role: "admin",

          is_active: admin.is_active,

          created_at: admin.created_at,

          last_login_at: admin.last_login_at,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

// =====================================================

// FORGOT PASSWORD

// POST /api/auth/forgot-password

// =====================================================

router.post(
  "/forgot-password",

  forgotPasswordLimiter,

  requireTrustedOrigin,

  async (
    req,

    res,

    next,
  ) => {
    try {
      const email = normalizeEmail(req.body?.email);

      // Always same response.

      // Prevents account enumeration.

      const safeResponse = {
        success: true,

        message: "If the account exists, a password reset link has been sent.",
      };

      if (!email || email.length > 254) {
        return res.json(safeResponse);
      }

      // ------------------------------------------------

      // Find admin

      // ------------------------------------------------

      const result = await pool.query(
        `

          SELECT

            id,

            email,

            role,

            is_active

          FROM admin_users

          WHERE LOWER(email) = $1

          LIMIT 1

          `,

        [email],
      );

      if (result.rows.length === 0) {
        return res.json(safeResponse);
      }

      const admin = result.rows[0];

      if (admin.role !== "admin" || !admin.is_active) {
        return res.json(safeResponse);
      }

      // ------------------------------------------------

      // Invalidate previous reset tokens

      // ------------------------------------------------

      await pool.query(
        `

        UPDATE password_reset_tokens

        SET

          used_at =

            CURRENT_TIMESTAMP

        WHERE

          user_type = 'admin'

          AND user_id = $1

          AND used_at IS NULL

        `,

        [admin.id],
      );

      // ------------------------------------------------

      // Generate token

      // ------------------------------------------------

      const token = generateResetToken();

      const tokenHash = hashResetToken(token);

      // ------------------------------------------------

      // Save token hash

      // ------------------------------------------------

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

          'admin',

          $1,

          $2,

          CURRENT_TIMESTAMP +

            INTERVAL '${RESET_TOKEN_MINUTES} minutes'

        )

        `,

        [admin.id, tokenHash],
      );

      // ------------------------------------------------

      // Send email

      // ------------------------------------------------

      try {
        await sendPasswordResetEmail({
          email: admin.email,

          token,
        });
      } catch (mailError) {
        console.error(
          "❌ Admin password reset email error:",

          mailError.message,
        );

        // Disable unusable token.

        await pool.query(
          `

          UPDATE password_reset_tokens

          SET

            used_at =

              CURRENT_TIMESTAMP

          WHERE

            token_hash = $1

          `,

          [tokenHash],
        );
      }

      return res.json(safeResponse);
    } catch (error) {
      return next(error);
    }
  },
);

// =====================================================

// RESET PASSWORD

// POST /api/auth/reset-password

// =====================================================

router.post(
  "/reset-password",

  resetPasswordLimiter,

  requireTrustedOrigin,

  async (
    req,

    res,

    next,
  ) => {
    const client = await pool.connect();

    let transactionStarted = false;

    try {
      const token = String(req.body?.token || "").trim();

      const password = req.body?.password;

      if (!token || typeof password !== "string") {
        return res.status(400).json({
          message: "Reset token and new password are required.",
        });
      }

      if (!validPassword(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 10 characters and no more than 72 UTF-8 bytes.",
        });
      }

      const tokenHash = hashResetToken(token);

      await client.query("BEGIN");

      transactionStarted = true;

      // ------------------------------------------------

      // Find valid token

      // ------------------------------------------------

      const resetResult = await client.query(
        `

          SELECT

            id,

            user_id

          FROM password_reset_tokens

          WHERE

            token_hash = $1

            AND user_type = 'admin'

            AND used_at IS NULL

            AND expires_at > CURRENT_TIMESTAMP

          FOR UPDATE

          `,

        [tokenHash],
      );

      if (resetResult.rows.length === 0) {
        await client.query("ROLLBACK");

        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid or expired password reset link.",
        });
      }

      const reset = resetResult.rows[0];

      // ------------------------------------------------

      // Hash new password

      // ------------------------------------------------

      const passwordHash = await bcrypt.hash(
        password,

        12,
      );

      // ------------------------------------------------

      // Update admin password

      // ------------------------------------------------

      await client.query(
        `

        UPDATE admin_users

        SET

          password_hash = $1

        WHERE id = $2

        `,

        [passwordHash, reset.user_id],
      );

      // ------------------------------------------------

      // Invalidate ALL admin reset tokens

      // ------------------------------------------------

      await client.query(
        `

        UPDATE password_reset_tokens

        SET

          used_at =

            CURRENT_TIMESTAMP

        WHERE

          user_type = 'admin'

          AND user_id = $1

          AND used_at IS NULL

        `,

        [reset.user_id],
      );

      await client.query("COMMIT");

      transactionStarted = false;

      return res.json({
        success: true,

        message: "Password reset successful. Please login again.",
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch {}
      }

      return next(error);
    } finally {
      client.release();
    }
  },
);

// =====================================================

// ADMIN LOGOUT

// POST /api/auth/logout

// =====================================================

router.post(
  "/logout",

  requireTrustedOrigin,

  (_req, res) => {
    res.clearCookie(
      ADMIN_COOKIE_NAME,

      {
        httpOnly: true,

        secure: isProduction,

        sameSite: isProduction ? "none" : "lax",

        path: "/",
      },
    );

    return res.json({
      message: "Admin logout successful.",
    });
  },
);

// =====================================================

// EXPORTS

// =====================================================

export { router, requireAdmin, requireTrustedOrigin };
export default router;