// ============================================================
// services/certificateRequestService.js — employee certificate requests
// ============================================================
//
// Rule: an employee can have at most ONE pending request at a time.
// We check this inside a transaction, and the database should also have
// a partial unique index as the final safety net (see docs/schema.sql):
//
//   CREATE UNIQUE INDEX ... ON certificate_requests (employee_id)
//   WHERE status = 'pending';
//
// If two requests race, the index makes the second INSERT fail with
// PostgreSQL error code 23505 (unique_violation), which we turn into 409.
// ============================================================

import pool, { withTransaction } from "../config/db.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { writeAuditLog } from "./auditLog.js";
import { createNotification, pushNotification } from "./notificationService.js";
import { sendEmailSafely } from "./mailer.js";
import { adminNewRequestEmail, requestRejectedEmail } from "./emailTemplates.js";

const PG_UNIQUE_VIOLATION = "23505";

const REQUEST_COLUMNS = `
  cr.id, cr.employee_id, cr.certificate_type, cr.course_name, cr.additional_details,
  cr.duration_months, cr.status, cr.certificate_id, cr.rejection_reason,
  cr.created_at, cr.reviewed_at, cr.issued_at`;

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

/**
 * Create a pending request.
 * @param {number} employeeId
 * @param {{ certificateType: string, courseName: string, additionalDetails: string, durationMonths: number|null }} input
 * @param {{ createdByAdmin?: { email: string } }} [options]
 */
export async function createRequest(employeeId, input, { createdByAdmin } = {}) {
  const found = await pool.query(
    `SELECT id, name, email, is_active FROM employee_users WHERE id = $1`,
    [employeeId],
  );
  const employee = found.rows[0];
  if (!employee) throw notFound("Employee not found.");
  if (!employee.is_active) {
    throw createdByAdmin
      ? badRequest("Employee account is inactive.")
      : forbidden("Employee account is inactive.");
  }

  const duplicateMessage = createdByAdmin
    ? "This employee already has a pending certificate request."
    : "You already have a pending certificate request.";

  let result;
  try {
    result = await withTransaction(async (client) => {
      const pending = await client.query(
        `SELECT id FROM certificate_requests
          WHERE employee_id = $1 AND status = 'pending'
          LIMIT 1 FOR UPDATE`,
        [employeeId],
      );
      if (pending.rows.length > 0) throw conflict(duplicateMessage);

      const inserted = await client.query(
        `INSERT INTO certificate_requests
           (employee_id, certificate_type, course_name, additional_details, duration_months, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [
          employeeId,
          input.certificateType,
          input.courseName,
          input.additionalDetails || null,
          input.durationMonths,
        ],
      );
      const request = inserted.rows[0];
      const notifications = [];

      if (createdByAdmin) {
        // Admin created it on the employee's behalf -> tell the employee.
        notifications.push(
          await createNotification(client, {
            recipientType: "employee",
            recipientId: employeeId,
            type: "CERTIFICATE_REQUEST_CREATED",
            title: "Certificate Request Created",
            message: `An administrator created a ${input.certificateType} certificate request for "${input.courseName}" on your behalf.`,
            certificateRequestId: request.id,
          }),
        );
        await writeAuditLog(client, {
          action: "CERTIFICATE_REQUEST_CREATED",
          performedBy: createdByAdmin.email,
          details: {
            certificate_request_id: request.id,
            employee_id: employeeId,
            certificate_type: input.certificateType,
          },
        });
      } else {
        // Employee created it -> tell EVERY active admin (previously only
        // the admin with the lowest ID was notified).
        const admins = await client.query(
          `SELECT id FROM admin_users WHERE is_active = TRUE AND role = 'admin'`,
        );
        for (const admin of admins.rows) {
          notifications.push(
            await createNotification(client, {
              recipientType: "admin",
              recipientId: admin.id,
              type: "CERTIFICATE_REQUEST",
              title: "New Certificate Request",
              message: `${employee.name} (${employee.email}) submitted a ${input.certificateType} certificate request for "${input.courseName}".`,
              certificateRequestId: request.id,
            }),
          );
        }
      }

      return { request, notifications };
    });
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) throw conflict(duplicateMessage);
    throw error;
  }

  // ---- After COMMIT ----
  result.notifications.forEach(pushNotification);

  if (!createdByAdmin) {
    if (ADMIN_EMAIL) {
      await sendEmailSafely({
        to: ADMIN_EMAIL,
        ...adminNewRequestEmail({ employee, request: result.request }),
      });
    } else {
      console.warn("[MAIL] ADMIN_EMAIL is not set — skipping new request email.");
    }
  }

  return result.request;
}

// ------------------------------------------------------------
// Read
// ------------------------------------------------------------

export async function listRequestsForEmployee(employeeId) {
  const { rows } = await pool.query(
    `SELECT ${REQUEST_COLUMNS}
       FROM certificate_requests cr
      WHERE cr.employee_id = $1
      ORDER BY cr.created_at DESC, cr.id DESC`,
    [employeeId],
  );
  return rows;
}

export async function listAllRequests() {
  const { rows } = await pool.query(
    `SELECT ${REQUEST_COLUMNS}, e.name AS employee_name, e.email AS employee_email
       FROM certificate_requests cr
       LEFT JOIN employee_users e ON e.id = cr.employee_id
      ORDER BY cr.created_at DESC, cr.id DESC`,
  );
  return rows;
}

export async function getRequestById(requestId) {
  const { rows } = await pool.query(
    `SELECT ${REQUEST_COLUMNS},
            e.name AS employee_name, e.email AS employee_email, e.is_active AS employee_active
       FROM certificate_requests cr
       JOIN employee_users e ON e.id = cr.employee_id
      WHERE cr.id = $1`,
    [requestId],
  );
  if (rows.length === 0) throw notFound("Certificate request not found.");
  return rows[0];
}

// ------------------------------------------------------------
// Reject
// ------------------------------------------------------------

export async function rejectRequest(requestId, reason, admin) {
  const { request, notification, employee } = await withTransaction(async (client) => {
    const found = await client.query(
      `SELECT cr.*, e.name AS employee_name, e.email AS employee_email
         FROM certificate_requests cr
         JOIN employee_users e ON e.id = cr.employee_id
        WHERE cr.id = $1
        FOR UPDATE OF cr`,
      [requestId],
    );
    const existing = found.rows[0];
    if (!existing) throw notFound("Certificate request not found.");
    if (existing.status !== "pending") throw conflict("Only pending requests can be rejected.");

    const updated = await client.query(
      `UPDATE certificate_requests
          SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [reason, requestId],
    );

    const saved = await createNotification(client, {
      recipientType: "employee",
      recipientId: existing.employee_id,
      type: "CERTIFICATE_REQUEST_REJECTED",
      title: "Certificate Request Rejected",
      message: `Your ${existing.certificate_type} certificate request for "${existing.course_name}" was rejected. Reason: ${reason}`,
      certificateRequestId: existing.id,
    });

    await writeAuditLog(client, {
      action: "CERTIFICATE_REQUEST_REJECTED",
      performedBy: admin.email,
      details: { certificate_request_id: existing.id, employee_id: existing.employee_id, reason },
    });

    return {
      request: updated.rows[0],
      notification: saved,
      employee: { name: existing.employee_name, email: existing.employee_email, course: existing.course_name },
    };
  });

  pushNotification(notification);
  await sendEmailSafely({
    to: employee.email,
    ...requestRejectedEmail({ employeeName: employee.name, courseName: employee.course, reason }),
  });

  return request;
}
