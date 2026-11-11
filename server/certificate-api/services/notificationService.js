// ============================================================
// services/notificationService.js — in-app notifications
// ============================================================
//
// A notification is a row in the `notifications` table, shown in the
// bell menu of the employee/admin dashboard.
//
// Pattern used everywhere in this project:
//
//   const notification = await withTransaction(async (client) => {
//     ...change data...
//     return createNotification(client, {...});   // same transaction
//   });
//   pushNotification(notification);               // AFTER commit
//
// Why pass `client`? So the notification is saved in the SAME transaction
// as the change it describes: either both are saved or neither is.
//
// Why push after commit? If we pushed a real-time event first and the
// transaction then failed, the user would see a notification for
// something that never happened.
// ============================================================

import { emitToUser } from "../socket.js";

/**
 * Insert a notification row.
 * @param {{ query: Function }} client  pool or transaction client
 * @param {{
 *   recipientType: "employee" | "admin",
 *   recipientId: number,
 *   type: string,
 *   title: string,
 *   message: string,
 *   certificateRequestId?: number | null,
 *   certificateId?: number | null,
 * }} data
 */
export async function createNotification(client, data) {
  const {
    recipientType,
    recipientId,
    type,
    title,
    message,
    certificateRequestId = null,
    certificateId = null,
  } = data;

  if (!["employee", "admin"].includes(recipientType)) {
    throw new TypeError("recipientType must be 'employee' or 'admin'.");
  }
  if (!Number.isSafeInteger(Number(recipientId)) || Number(recipientId) <= 0) {
    throw new TypeError("recipientId must be a positive integer.");
  }
  for (const [field, value] of Object.entries({ type, title, message })) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(`Notification ${field} is required.`);
    }
  }

  const { rows } = await client.query(
    `INSERT INTO notifications
       (recipient_type, recipient_id, type, title, message, certificate_request_id, certificate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, recipient_type, recipient_id, type, title, message,
               certificate_request_id, certificate_id, is_read, created_at`,
    [
      recipientType,
      Number(recipientId),
      type.trim(),
      title.trim(),
      message.trim(),
      certificateRequestId,
      certificateId,
    ],
  );

  return rows[0];
}

/**
 * Send a saved notification to the user's browser in real time.
 * Never throws: real-time delivery is best-effort (the user still sees
 * the notification next time the list is loaded).
 */
export function pushNotification(notification) {
  if (!notification) return;
  try {
    emitToUser(notification.recipient_type, notification.recipient_id, "notification:new", notification);
  } catch (error) {
    console.error("[NOTIFY] Real-time push failed:", error.message);
  }
}
