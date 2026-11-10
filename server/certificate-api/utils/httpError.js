// ============================================================
// utils/httpError.js — errors that already know their HTTP status
// ============================================================
//
// Instead of writing this in every route:
//
//     return res.status(404).json({ success: false, message: "Not found." });
//
// a route (or a service it calls) can simply:
//
//     throw new HttpError(404, "Certificate not found.");
//
// The global error handler (middleware/errorHandlers.js) turns it into
// the JSON response. This works from deep inside helper functions and
// inside `withTransaction`, which rolls back automatically.
// ============================================================

export class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code (400, 401, 403, 404, 409 ...)
   * @param {string} message Safe, user-facing message
   * @param {object} [extra] Extra JSON fields to include in the response
   */
  constructor(status, message, extra = undefined) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.extra = extra;
    // Marks the message as safe to show to the user (see errorHandlers.js).
    this.expose = true;
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const unauthorized = (message, extra) => new HttpError(401, message, extra);
export const forbidden = (message, extra) => new HttpError(403, message, extra);
export const notFound = (message, extra) => new HttpError(404, message, extra);
export const conflict = (message, extra) => new HttpError(409, message, extra);
