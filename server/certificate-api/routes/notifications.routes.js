// ============================================================
// routes/notifications.routes.js — the bell menu
// ============================================================
//
// Admins and employees have exactly the same notification features, so
// instead of copy-pasting every route twice we use a small FACTORY:
// `buildNotificationRouter(role)` returns a router for that role.
//
// Mounted in routes/index.js as:
//   /api/admin/notifications     (role = "admin")
//   /api/employee/notifications  (role = "employee")
//
//   GET   /                 latest 100 + unread count
//   GET   /unread-count
//   PATCH /read-all         (was missing for employees — the client called it and got 404)
//   PATCH /:id/read
//
// Route ORDER matters: "/read-all" must be declared before "/:id/read",
// otherwise Express could treat "read-all" as an :id.
// ============================================================

import express from "express";
import pool from "../config/db.js";
import { requireAdmin, requireEmployee } from "../middleware/auth.js";
import { notFound } from "../utils/httpError.js";
import { parseId } from "../utils/validation.js";

const NOTIFICATION_LIMIT = 100;

const GUARDS = { admin: requireAdmin, employee: requireEmployee };

/** The logged-in user's ID for this role. */
const currentUserId = (req, role) => (role === "admin" ? req.admin.id : req.employee.id);

async function countUnread(role, userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM notifications
      WHERE recipient_type = $1 AND recipient_id = $2 AND is_read = FALSE`,
    [role, userId],
  );
  return rows[0]?.count ?? 0;
}

export function buildNotificationRouter(role) {
  const router = express.Router();
  router.use(GUARDS[role]);

  router.get("/", async (req, res) => {
    const userId = currentUserId(req, role);

    // Admins also see which employee/request the notification is about.
    const extraColumns =
      role === "admin"
        ? `, cr.employee_id, cr.certificate_type, cr.course_name, cr.status AS request_status,
             eu.name AS employee_name, eu.email AS employee_email`
        : "";
    const extraJoins =
      role === "admin"
        ? `LEFT JOIN certificate_requests cr ON cr.id = n.certificate_request_id
           LEFT JOIN employee_users eu ON eu.id = cr.employee_id`
        : "";

    const [list, unreadCount] = await Promise.all([
      pool.query(
        `SELECT n.id, n.recipient_type, n.recipient_id, n.type, n.title, n.message,
                n.certificate_request_id, n.certificate_id, n.is_read, n.created_at
                ${extraColumns}
           FROM notifications n
           ${extraJoins}
          WHERE n.recipient_type = $1 AND n.recipient_id = $2
          ORDER BY n.created_at DESC, n.id DESC
          LIMIT $3`,
        [role, userId, NOTIFICATION_LIMIT],
      ),
      countUnread(role, userId),
    ]);

    res.json({ success: true, notifications: list.rows, unreadCount });
  });

  router.get("/unread-count", async (req, res) => {
    res.json({ success: true, unreadCount: await countUnread(role, currentUserId(req, role)) });
  });

  router.patch("/read-all", async (req, res) => {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
        WHERE recipient_type = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [role, currentUserId(req, role)],
    );
    res.json({ success: true, message: "All notifications marked as read.", updatedCount: result.rowCount });
  });

  router.patch("/:id/read", async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = TRUE
        WHERE id = $1 AND recipient_type = $2 AND recipient_id = $3
        RETURNING id, is_read`,
      [parseId(req.params.id, "notification"), role, currentUserId(req, role)],
    );
    if (rows.length === 0) throw notFound("Notification not found.");
    res.json({ success: true, message: "Notification marked as read.", notification: rows[0] });
  });

  return router;
}
