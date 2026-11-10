// ============================================================
// middleware/auth.js — protect routes: requireAdmin / requireEmployee
// ============================================================
//
// WHAT IS MIDDLEWARE?
// -------------------
// A function `(req, res, next)` that runs BEFORE the route handler.
// It can either:
//   - stop the request (send a 401/403 response), or
//   - call `next()` to continue to the route.
//
// Usage:
//     router.get("/admin/employees", requireAdmin, handler);
//
// After `requireAdmin` succeeds, the handler can trust `req.admin`.
// After `requireEmployee` succeeds, the handler can trust `req.employee`.
// Never take the user ID from the request body — always from here.
// ============================================================

import pool from "../config/db.js";
import { endSession, readSessionUserId, SESSION_TYPES } from "../services/sessionService.js";

/** Public shape of an admin (never include password_hash!). */
export function publicAdmin(admin) {
  return { id: admin.id, email: admin.email, role: "admin", is_active: admin.is_active };
}

/** Public shape of an employee. */
export function publicEmployee(employee) {
  return { id: employee.id, name: employee.name, email: employee.email, role: "employee" };
}

export async function requireAdmin(req, res, next) {
  const adminId = readSessionUserId(req.cookies?.[SESSION_TYPES.admin.cookieName], "admin");

  if (!adminId) {
    endSession(res, "admin");
    return res.status(401).json({ success: false, message: "Admin authentication required." });
  }

  // The token may still be valid even though the account was disabled
  // a minute ago — so we always re-check the database.
  const { rows } = await pool.query(
    `SELECT id, email, role, is_active
       FROM admin_users
      WHERE id = $1 AND is_active = TRUE AND role = 'admin'
      LIMIT 1`,
    [adminId],
  );

  if (rows.length === 0) {
    endSession(res, "admin");
    return res
      .status(401)
      .json({ success: false, message: "Admin account is inactive or no longer exists." });
  }

  req.admin = publicAdmin(rows[0]);
  return next();
}

export async function requireEmployee(req, res, next) {
  const employeeId = readSessionUserId(
    req.cookies?.[SESSION_TYPES.employee.cookieName],
    "employee",
  );

  if (!employeeId) {
    endSession(res, "employee");
    return res
      .status(401)
      .json({ success: false, message: "Employee authentication required." });
  }

  const { rows } = await pool.query(
    `SELECT id, name, email, is_active
       FROM employee_users
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1`,
    [employeeId],
  );

  if (rows.length === 0) {
    endSession(res, "employee");
    return res
      .status(401)
      .json({ success: false, message: "Employee account is inactive or no longer exists." });
  }

  req.employee = publicEmployee(rows[0]);
  return next();
}
