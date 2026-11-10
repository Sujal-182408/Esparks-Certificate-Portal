// ============================================================
// routes/employeeAuth.routes.js — mounted at /api/employee-auth
// ============================================================
//
//   POST /api/employee-auth/register
//   POST /api/employee-auth/login
//   GET  /api/employee-auth/me
//   POST /api/employee-auth/logout
//   POST /api/employee-auth/forgot-password
//   POST /api/employee-auth/reset-password
// ============================================================

import express from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { publicEmployee, requireEmployee } from "../middleware/auth.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimiters.js";
import { endSession, startSession } from "../services/sessionService.js";
import { BCRYPT_ROUNDS, requestPasswordReset, resetPassword } from "../services/passwordResetService.js";
import { verifyPasswordOrDummy } from "../utils/passwords.js";
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  PASSWORD_RULE_MESSAGE,
} from "../utils/validation.js";

const router = express.Router();

// Who may self-register. Company addresses, plus Gmail (current business
// rule — e.g. for interns). Change it here, in one place.
const ALLOWED_EMAIL_DOMAINS = ["esparksit.com", "gmail.com"];

function hasAllowedDomain(email) {
  const domain = email.split("@").pop();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

router.post("/register", registerLimiter, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!name || name.length > 100) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required and must be at most 100 characters." });
  }
  if (!email || email.length > 254 || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }
  if (!hasAllowedDomain(email)) {
    return res.status(403).json({
      success: false,
      message: "Only Esparks IT Solutions Private Limited company email addresses or Gmail addresses are allowed.",
    });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, message: PASSWORD_RULE_MESSAGE });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const { rows } = await pool.query(
      `INSERT INTO employee_users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash],
    );
    startSession(res, "employee", rows[0].id);
    return res
      .status(201)
      .json({ success: true, message: "Employee registered successfully.", employee: publicEmployee(rows[0]) });
  } catch (error) {
    // 23505 = unique_violation (email already registered)
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "An account with this email already exists." });
    }
    throw error;
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, is_active
       FROM employee_users
      WHERE LOWER(email) = $1
      LIMIT 1`,
    [email],
  );
  const employee = rows[0];

  // Password is checked BEFORE the "suspended" check. Otherwise anyone
  // could type any email and learn whether that person's account was
  // suspended, without knowing the password.
  const passwordOk = await verifyPasswordOrDummy(password, employee?.password_hash);
  if (!employee || !passwordOk) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  if (!employee.is_active) {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",
      message: "Your account has been suspended. Please contact the administrator for assistance.",
    });
  }

  await pool.query(`UPDATE employee_users SET last_login_at = NOW() WHERE id = $1`, [employee.id]);
  startSession(res, "employee", employee.id);

  return res.json({
    success: true,
    message: "Employee login successful.",
    employee: publicEmployee(employee),
  });
});

// requireEmployee already loads + validates the employee.
router.get("/me", requireEmployee, (req, res) => {
  return res.json({ success: true, employee: req.employee });
});

router.post("/logout", (req, res) => {
  endSession(res, "employee");
  return res.json({ success: true, message: "Employee logged out successfully." });
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  await requestPasswordReset("employee", normalizeEmail(req.body?.email));
  return res.json({
    success: true,
    message: "If the account exists, a password reset link has been sent.",
  });
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  await resetPassword("employee", req.body?.token, req.body?.password);
  // Force a fresh login with the new password.
  endSession(res, "employee");
  return res.json({ success: true, message: "Password reset successful. Please login again." });
});

export default router;
