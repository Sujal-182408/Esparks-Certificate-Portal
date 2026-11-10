// ============================================================
// services/employeeService.js — admin management of employee accounts
// ============================================================

import pool, { withTransaction } from "../config/db.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { notFound } from "../utils/httpError.js";
import { writeAuditLog } from "./auditLog.js";
import { sendEmailSafely } from "./mailer.js";
import { accountStatusAdminEmail, accountStatusEmployeeEmail } from "./emailTemplates.js";

export async function listEmployees() {
  const { rows } = await pool.query(
    `SELECT id, name, email, is_active, created_at
       FROM employee_users
      ORDER BY created_at DESC`,
  );
  return rows;
}

/** Employee profile + their certificates + their rejected requests. */
export async function getEmployeeDetails(employeeId) {
  // The three queries are independent, so run them in parallel.
  const [employee, certificates, rejectedRequests] = await Promise.all([
    pool.query(
      `SELECT id, name, email, is_active, created_at FROM employee_users WHERE id = $1`,
      [employeeId],
    ),
    pool.query(
      `SELECT id, certificate_no, certificate_type, recipient_name, course_name,
              issuer_name, issue_date, verification_token, status, created_at, revoked_at
         FROM certificates
        WHERE employee_id = $1
        ORDER BY issue_date DESC NULLS LAST, id DESC`,
      [employeeId],
    ),
    pool.query(
      `SELECT id, certificate_type, course_name, rejection_reason, created_at, reviewed_at
         FROM certificate_requests
        WHERE employee_id = $1 AND LOWER(status) = 'rejected'
        ORDER BY reviewed_at DESC NULLS LAST, created_at DESC, id DESC`,
      [employeeId],
    ),
  ]);

  if (employee.rows.length === 0) throw notFound("Employee not found.");

  return {
    employee: employee.rows[0],
    certificates: certificates.rows,
    rejectedRequests: rejectedRequests.rows,
  };
}

/**
 * Activate / deactivate an employee account.
 * Emails are only sent when the status actually changes.
 */
export async function setEmployeeActive(employeeId, isActive, admin) {
  const { employee, changed } = await withTransaction(async (client) => {
    const found = await client.query(
      `SELECT id, name, email, is_active FROM employee_users WHERE id = $1 FOR UPDATE`,
      [employeeId],
    );
    const current = found.rows[0];
    if (!current) throw notFound("Employee not found.");
    if (current.is_active === isActive) return { employee: current, changed: false };

    const updated = await client.query(
      `UPDATE employee_users SET is_active = $1 WHERE id = $2
       RETURNING id, name, email, is_active`,
      [isActive, employeeId],
    );

    await writeAuditLog(client, {
      action: "EMPLOYEE_STATUS_CHANGED",
      performedBy: admin.email,
      details: { employee_id: employeeId, is_active: isActive },
    });

    return { employee: updated.rows[0], changed: true };
  });

  if (!changed) {
    return {
      employee,
      message: `Employee account is already ${isActive ? "active" : "deactivated"}.`,
      emailNotifications: { sent: false, reason: "Status has not changed." },
    };
  }

  const emailNotifications = await sendAccountStatusEmails(employee, isActive, admin.email);
  return {
    employee,
    message: `Employee account ${isActive ? "activated" : "deactivated"} successfully.`,
    emailNotifications,
  };
}

/** Email the employee (and optionally the admin) about an account status change. */
export async function sendAccountStatusEmails(employee, isActive, changedBy, { notifyAdmin = true } = {}) {
  const [employeeEmailSent, adminEmailSent] = await Promise.all([
    employee.email
      ? sendEmailSafely({
          to: employee.email,
          ...accountStatusEmployeeEmail({ employeeName: employee.name, isActive, changedBy }),
        })
      : false,
    notifyAdmin && ADMIN_EMAIL
      ? sendEmailSafely({
          to: ADMIN_EMAIL,
          ...accountStatusAdminEmail({
            employeeName: employee.name,
            employeeEmail: employee.email,
            isActive,
            changedBy,
          }),
        })
      : false,
  ]);
  return { employeeEmailSent, adminEmailSent };
}
