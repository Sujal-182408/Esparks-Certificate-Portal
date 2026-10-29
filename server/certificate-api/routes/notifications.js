import express from "express";
import pool from "../db.js";
import { requireAdmin } from "./auth.js";
import { requireEmployee } from "./employeeAuth.js";

const router = express.Router();
const NOTIFICATION_LIMIT = 100;

function getPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getAuthenticatedId(value) {
  return getPositiveInteger(value);
}

function sendAuthenticationError(res, role) {
  return res.status(401).json({
    success: false,
    message: `${role} authentication required.`,
  });
}

function sendInvalidIdError(res, resource = "notification") {
  return res.status(400).json({
    success: false,
    message: `Invalid ${resource} ID.`,
  });
}

function handleRouteError(error, next, label) {
  console.error(`${label}:`, error);
  return next(error);
}

/* =========================================================
   CREATE NOTIFICATION
   Pass a PostgreSQL client here when the notification must be
   created inside an existing transaction; otherwise pool works.
========================================================= */

export async function createNotification(
  client,
  {
    recipientType,
    recipientId,
    type,
    title,
    message,
    certificateRequestId = null,
    certificateId = null,
  },
) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("A valid PostgreSQL client is required.");
  }

  if (!["employee", "admin"].includes(recipientType)) {
    throw new TypeError("recipientType must be 'employee' or 'admin'.");
  }

  const validRecipientId = getPositiveInteger(recipientId);
  if (!validRecipientId) {
    throw new TypeError("recipientId must be a positive integer.");
  }

  if (typeof type !== "string" || !type.trim()) {
    throw new TypeError("Notification type is required.");
  }
  if (typeof title !== "string" || !title.trim()) {
    throw new TypeError("Notification title is required.");
  }
  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError("Notification message is required.");
  }

  const result = await client.query(
    `
      INSERT INTO notifications (
        recipient_type,
        recipient_id,
        type,
        title,
        message,
        certificate_request_id,
        certificate_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        recipient_type,
        recipient_id,
        type,
        title,
        message,
        certificate_request_id,
        certificate_id,
        is_read,
        created_at
    `,
    [
      recipientType,
      validRecipientId,
      type.trim(),
      title.trim(),
      message.trim(),
      certificateRequestId,
      certificateId,
    ],
  );

  return result.rows[0];
}

/* =========================================================
   EMPLOYEE NOTIFICATIONS
========================================================= */

// GET EMPLOYEE NOTIFICATIONS
router.get(
  "/employee/notifications",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = getAuthenticatedId(req.employee?.id);
      if (!employeeId) return sendAuthenticationError(res, "Employee");

      const result = await pool.query(
        `
          SELECT
            n.id,
            n.recipient_type,
            n.recipient_id,
            n.type,
            n.title,
            n.message,
            n.certificate_request_id,
            n.certificate_id,
            n.is_read,
            n.created_at
          FROM notifications AS n
          WHERE n.recipient_type = 'employee'
            AND n.recipient_id = $1
          ORDER BY n.created_at DESC, n.id DESC
          LIMIT $2
        `,
        [employeeId, NOTIFICATION_LIMIT],
      );

      const unreadResult = await pool.query(
        `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE recipient_type = 'employee'
            AND recipient_id = $1
            AND is_read = FALSE
        `,
        [employeeId],
      );

      return res.status(200).json({
        success: true,
        notifications: result.rows,
        unreadCount: Number(unreadResult.rows[0]?.count ?? 0),
      });
    } catch (error) {
      return handleRouteError(error, next, "Get employee notifications error");
    }
  },
);

// MARK EMPLOYEE NOTIFICATION AS READ
router.patch(
  "/employee/notifications/:id/read",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = getAuthenticatedId(req.employee?.id);
      if (!employeeId) return sendAuthenticationError(res, "Employee");

      const notificationId = getPositiveInteger(req.params.id);
      if (!notificationId) return sendInvalidIdError(res);

      const result = await pool.query(
        `
          UPDATE notifications
          SET is_read = TRUE
          WHERE id = $1
            AND recipient_type = 'employee'
            AND recipient_id = $2
          RETURNING id, is_read
        `,
        [notificationId, employeeId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        notification: result.rows[0],
      });
    } catch (error) {
      return handleRouteError(error, next, "Mark employee notification read error");
    }
  },
);

// GET EMPLOYEE UNREAD NOTIFICATION COUNT
router.get(
  "/employee/notifications/unread-count",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId = getAuthenticatedId(req.employee?.id);
      if (!employeeId) return sendAuthenticationError(res, "Employee");

      const result = await pool.query(
        `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE recipient_type = 'employee'
            AND recipient_id = $1
            AND is_read = FALSE
        `,
        [employeeId],
      );

      return res.status(200).json({
        success: true,
        unreadCount: Number(result.rows[0]?.count ?? 0),
      });
    } catch (error) {
      return handleRouteError(error, next, "Employee unread notification count error");
    }
  },
);

/* =========================================================
   ADMIN NOTIFICATIONS
========================================================= */

// GET ADMIN NOTIFICATIONS
router.get(
  "/admin/notifications",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId = getAuthenticatedId(req.admin?.id);
      if (!adminId) return sendAuthenticationError(res, "Admin");

      const result = await pool.query(
        `
          SELECT
            n.id,
            n.recipient_type,
            n.recipient_id,
            n.type,
            n.title,
            n.message,
            n.certificate_request_id,
            n.certificate_id,
            n.is_read,
            n.created_at,
            cr.employee_id,
            cr.certificate_type,
            cr.course_name,
            cr.status AS request_status,
            eu.name AS employee_name,
            eu.email AS employee_email
          FROM notifications AS n
          LEFT JOIN certificate_requests AS cr
            ON cr.id = n.certificate_request_id
          LEFT JOIN employee_users AS eu
            ON eu.id = cr.employee_id
          WHERE n.recipient_type = 'admin'
            AND n.recipient_id = $1
          ORDER BY n.created_at DESC, n.id DESC
          LIMIT $2
        `,
        [adminId, NOTIFICATION_LIMIT],
      );

      const unreadResult = await pool.query(
        `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE recipient_type = 'admin'
            AND recipient_id = $1
            AND is_read = FALSE
        `,
        [adminId],
      );

      return res.status(200).json({
        success: true,
        notifications: result.rows,
        unreadCount: Number(unreadResult.rows[0]?.count ?? 0),
      });
    } catch (error) {
      return handleRouteError(error, next, "Get admin notifications error");
    }
  },
);

// MARK ALL ADMIN NOTIFICATIONS AS READ
// Keep this route before /:id/read.
router.patch(
  "/admin/notifications/read-all",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId = getAuthenticatedId(req.admin?.id);
      if (!adminId) return sendAuthenticationError(res, "Admin");

      const result = await pool.query(
        `
          UPDATE notifications
          SET is_read = TRUE
          WHERE recipient_type = 'admin'
            AND recipient_id = $1
            AND is_read = FALSE
          RETURNING id
        `,
        [adminId],
      );

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        updatedCount: result.rowCount,
      });
    } catch (error) {
      return handleRouteError(error, next, "Mark all admin notifications read error");
    }
  },
);

// MARK ONE ADMIN NOTIFICATION AS READ
router.patch(
  "/admin/notifications/:id/read",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId = getAuthenticatedId(req.admin?.id);
      if (!adminId) return sendAuthenticationError(res, "Admin");

      const notificationId = getPositiveInteger(req.params.id);
      if (!notificationId) return sendInvalidIdError(res);

      const result = await pool.query(
        `
          UPDATE notifications
          SET is_read = TRUE
          WHERE id = $1
            AND recipient_type = 'admin'
            AND recipient_id = $2
          RETURNING id, is_read
        `,
        [notificationId, adminId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        notification: result.rows[0],
      });
    } catch (error) {
      return handleRouteError(error, next, "Mark admin notification read error");
    }
  },
);

// GET ADMIN UNREAD NOTIFICATION COUNT
router.get(
  "/admin/notifications/unread-count",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId = getAuthenticatedId(req.admin?.id);
      if (!adminId) return sendAuthenticationError(res, "Admin");

      const result = await pool.query(
        `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE recipient_type = 'admin'
            AND recipient_id = $1
            AND is_read = FALSE
        `,
        [adminId],
      );

      return res.status(200).json({
        success: true,
        unreadCount: Number(result.rows[0]?.count ?? 0),
      });
    } catch (error) {
      return handleRouteError(error, next, "Admin unread notification count error");
    }
  },
);

export { router };
export default router