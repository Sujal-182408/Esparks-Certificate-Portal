// ============================================================
// routes/adminAuth.routes.js — mounted at /api/auth
// ============================================================
//
//   POST /api/auth/login             email + password -> session cookie
//   GET  /api/auth/me                current admin (used by route guards)
//   POST /api/auth/logout
//   POST /api/auth/forgot-password   email a reset link
//   POST /api/auth/reset-password    token + new password
//
// There is no admin registration endpoint on purpose. Admins are created
// with `npm run create-admin` (scripts/createAdmin.js).
// ============================================================

import express from "express";
import pool from "../config/db.js";
import { publicAdmin, requireAdmin } from "../middleware/auth.js";
import { forgotPasswordLimiter, loginLimiter, resetPasswordLimiter } from "../middleware/rateLimiters.js";
import { endSession, startSession } from "../services/sessionService.js";
import { requestPasswordReset, resetPassword } from "../services/passwordResetService.js";
import { verifyPasswordOrDummy } from "../utils/passwords.js";
import { normalizeEmail } from "../utils/validation.js";

const router = express.Router();

const FORGOT_PASSWORD_RESPONSE = {
  success: true,
  message: "If the account exists, a password reset link has been sent.",
};

router.post("/login", loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, is_active
       FROM admin_users
      WHERE LOWER(email) = $1
      LIMIT 1`,
    [email],
  );
  const admin = rows[0];

  // Check the password FIRST, and always run bcrypt (see utils/passwords.js),
  // so an attacker can't learn which emails are admins — neither from the
  // message nor from how long the response takes.
  const passwordOk = await verifyPasswordOrDummy(password, admin?.password_hash);
  if (!admin || !passwordOk || admin.role !== "admin") {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  if (!admin.is_active) {
    return res.status(403).json({ success: false, message: "Admin account is inactive." });
  }

  await pool.query(`UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`, [admin.id]);
  startSession(res, "admin", admin.id);

  return res.json({ success: true, message: "Admin login successful.", admin: publicAdmin(admin) });
});

router.get("/me", requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, role, is_active, created_at, last_login_at
       FROM admin_users WHERE id = $1`,
    [req.admin.id],
  );
  const admin = rows[0];
  return res.json({
    success: true,
    admin: { ...publicAdmin(admin), created_at: admin.created_at, last_login_at: admin.last_login_at },
  });
});

router.post("/logout", (req, res) => {
  endSession(res, "admin");
  return res.json({ success: true, message: "Admin logout successful." });
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  await requestPasswordReset("admin", normalizeEmail(req.body?.email));
  return res.json(FORGOT_PASSWORD_RESPONSE);
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  await resetPassword("admin", req.body?.token, req.body?.password);
  endSession(res, "admin");
  return res.json({ success: true, message: "Password reset successful. Please login again." });
});

export default router;
