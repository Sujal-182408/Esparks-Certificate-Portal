// ============================================================
// middleware/errorHandlers.js — 404 + global error handler
// ============================================================
//
// Express 5 automatically forwards errors thrown inside `async` route
// handlers to the error handler below — so routes do NOT need their own
// try/catch just to call `next(error)`.
//
// SECURITY: for unexpected errors (status 500) we NEVER send
// `error.message` to the client. A database error message can reveal
// table names, column names or SQL. We log the details on the server and
// send a generic message. Only `HttpError`s (written by us, for users)
// have their message exposed.
// ============================================================

import { isProduction } from "../config/env.js";

/** Runs when no route matched. Must be registered after all routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: "Route not found." });
}

/** Express recognises an error handler by its FOUR parameters. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  // Malformed JSON body or body too large (thrown by express.json()).
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON request body." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }

  const status = Number(error.status || error.statusCode) || 500;
  const isClientError = status >= 400 && status < 500;

  if (!isClientError) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, error);
  }

  if (res.headersSent) return;

  const message =
    error.expose || (isClientError && !isProduction)
      ? error.message
      : isClientError
        ? "The request could not be processed."
        : "Internal server error. Please try again later.";

  return res.status(status).json({ success: false, message, ...(error.extra || {}) });
}
