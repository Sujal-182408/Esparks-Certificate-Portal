const express = require("express");
const router = express.Router();

const pool = require("../db");

const {
  requireAdmin,
} = require("./auth");

const {
  requireEmployee,
} = require("./employeeAuth");

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

async function createNotification(
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
  const result =
    await client.query(
      `
        INSERT INTO notifications
        (
          recipient_type,
          recipient_id,
          type,
          title,
          message,
          certificate_request_id,
          certificate_id
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
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
        recipientId,
        type,
        title,
        message,
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
      const employeeId =
        Number(req.employee?.id);

      if (
        !Number.isInteger(
          employeeId,
        ) ||
        employeeId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Employee authentication required.",
        });
      }

      const result =
        await pool.query(
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
            FROM notifications n
            WHERE n.recipient_type =
              'employee'
              AND n.recipient_id = $1
            ORDER BY
              n.created_at DESC
            LIMIT 100
          `,
          [employeeId],
        );

      const unreadResult =
        await pool.query(
          `
            SELECT
              COUNT(*)::int AS count
            FROM notifications
            WHERE recipient_type =
              'employee'
              AND recipient_id = $1
              AND is_read = FALSE
          `,
          [employeeId],
        );

      return res.status(200).json({
        success: true,

        notifications:
          result.rows,

        unreadCount:
          Number(
            unreadResult.rows[0]
              ?.count || 0,
          ),
      });
    } catch (error) {
      console.error(
        "Get employee notifications error:",
        error,
      );

      next(error);
    }
  },
);


// MARK EMPLOYEE NOTIFICATION AS READ

router.patch(
  "/employee/notifications/:id/read",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId =
        Number(req.employee?.id);

      const notificationId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          employeeId,
        ) ||
        employeeId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Employee authentication required.",
        });
      }

      if (
        !Number.isInteger(
          notificationId,
        ) ||
        notificationId <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid notification ID.",
        });
      }

      const result =
        await pool.query(
          `
            UPDATE notifications
            SET
              is_read = TRUE
            WHERE id = $1
              AND recipient_type =
                'employee'
              AND recipient_id = $2
            RETURNING
              id,
              is_read
          `,
          [
            notificationId,
            employeeId,
          ],
        );

      if (
        result.rowCount === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Notification marked as read.",

        notification:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Mark employee notification read error:",
        error,
      );

      next(error);
    }
  },
);


// GET EMPLOYEE UNREAD NOTIFICATION COUNT

router.get(
  "/employee/notifications/unread-count",
  requireEmployee,
  async (req, res, next) => {
    try {
      const employeeId =
        Number(req.employee?.id);

      if (
        !Number.isInteger(
          employeeId,
        ) ||
        employeeId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Employee authentication required.",
        });
      }

      const result =
        await pool.query(
          `
            SELECT
              COUNT(*)::int AS count
            FROM notifications
            WHERE recipient_type =
              'employee'
              AND recipient_id = $1
              AND is_read = FALSE
          `,
          [employeeId],
        );

      return res.status(200).json({
        success: true,

        unreadCount:
          Number(
            result.rows[0]
              ?.count || 0,
          ),
      });
    } catch (error) {
      console.error(
        "Employee unread notification count error:",
        error,
      );

      next(error);
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
      const adminId =
        Number(req.admin?.id);

      if (
        !Number.isInteger(
          adminId,
        ) ||
        adminId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Admin authentication required.",
        });
      }

      const result =
        await pool.query(
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

            FROM notifications n

            LEFT JOIN certificate_requests cr
              ON cr.id =
                n.certificate_request_id

            LEFT JOIN employee_users eu
              ON eu.id =
                cr.employee_id

            WHERE n.recipient_type =
              'admin'
              AND n.recipient_id = $1

            ORDER BY
              n.created_at DESC

            LIMIT 100
          `,
          [adminId],
        );

      const unreadResult =
        await pool.query(
          `
            SELECT
              COUNT(*)::int AS count
            FROM notifications
            WHERE recipient_type =
              'admin'
              AND recipient_id = $1
              AND is_read = FALSE
          `,
          [adminId],
        );

      return res.status(200).json({
        success: true,

        notifications:
          result.rows,

        unreadCount:
          Number(
            unreadResult.rows[0]
              ?.count || 0,
          ),
      });
    } catch (error) {
      console.error(
        "Get admin notifications error:",
        error,
      );

      next(error);
    }
  },
);


// MARK ALL ADMIN NOTIFICATIONS AS READ
// IMPORTANT:
// This MUST be before /:id/read.

router.patch(
  "/admin/notifications/read-all",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId =
        Number(req.admin?.id);

      if (
        !Number.isInteger(
          adminId,
        ) ||
        adminId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Admin authentication required.",
        });
      }

      const result =
        await pool.query(
          `
            UPDATE notifications
            SET
              is_read = TRUE
            WHERE recipient_type =
              'admin'
              AND recipient_id = $1
              AND is_read = FALSE
            RETURNING id
          `,
          [adminId],
        );

      return res.status(200).json({
        success: true,

        message:
          "All notifications marked as read.",

        updatedCount:
          result.rows.length,
      });
    } catch (error) {
      console.error(
        "Mark all admin notifications read error:",
        error,
      );

      next(error);
    }
  },
);


// MARK ONE ADMIN NOTIFICATION AS READ

router.patch(
  "/admin/notifications/:id/read",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId =
        Number(req.admin?.id);

      const notificationId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          adminId,
        ) ||
        adminId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Admin authentication required.",
        });
      }

      if (
        !Number.isInteger(
          notificationId,
        ) ||
        notificationId <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid notification ID.",
        });
      }

      const result =
        await pool.query(
          `
            UPDATE notifications
            SET
              is_read = TRUE
            WHERE id = $1
              AND recipient_type =
                'admin'
              AND recipient_id = $2
            RETURNING
              id,
              is_read
          `,
          [
            notificationId,
            adminId,
          ],
        );

      if (
        result.rowCount === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Notification marked as read.",

        notification:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Mark admin notification read error:",
        error,
      );

      next(error);
    }
  },
);


// GET ADMIN UNREAD NOTIFICATION COUNT

router.get(
  "/admin/notifications/unread-count",
  requireAdmin,
  async (req, res, next) => {
    try {
      const adminId =
        Number(req.admin?.id);

      if (
        !Number.isInteger(
          adminId,
        ) ||
        adminId <= 0
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Admin authentication required.",
        });
      }

      const result =
        await pool.query(
          `
            SELECT
              COUNT(*)::int AS count
            FROM notifications
            WHERE recipient_type =
              'admin'
              AND recipient_id = $1
              AND is_read = FALSE
          `,
          [adminId],
        );

      return res.status(200).json({
        success: true,

        unreadCount:
          Number(
            result.rows[0]
              ?.count || 0,
          ),
      });
    } catch (error) {
      console.error(
        "Admin unread notification count error:",
        error,
      );

      next(error);
    }
  },
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  router,
  createNotification,
};