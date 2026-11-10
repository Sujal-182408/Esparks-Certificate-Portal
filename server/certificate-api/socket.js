// ============================================================
// socket.js — real-time notifications (Socket.IO)
// ============================================================
//
// SECURITY FIX
// ------------
// The old version let ANY visitor send `join:employee 5` and silently
// receive employee #5's notifications (certificate numbers, rejection
// reasons ...). Socket.IO events are just messages from the client: you
// must never trust an ID the client sends you.
//
// Now the user is identified ONCE, during the connection handshake, from
// the same httpOnly session cookie the REST API uses. The server puts the
// socket into the right room itself; the client cannot choose a room.
//
// Rooms:   "employee:<id>"   "admin:<id>"
//
// NOTE: Vercel serverless functions cannot keep WebSocket connections
// open, so real-time push only works when the API runs as a long-lived
// Node process (`npm start`). On Vercel, `io` is never initialised and
// `emitToUser` quietly does nothing — notifications are still saved in
// the database and appear when the list is loaded.
// ============================================================

import { Server } from "socket.io";
import { parseCookieHeader, readSessionUserId, SESSION_TYPES } from "./services/sessionService.js";

/** @type {Server | null} */
let io = null;

/** Attach Socket.IO to the HTTP server. Call once from server.js. */
export function initializeSocket(httpServer, allowedOrigins) {
  if (io) throw new Error("Socket.IO has already been initialized.");

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true, methods: ["GET", "POST"] },
    maxHttpBufferSize: 10_000,
  });

  // Authentication middleware: runs before "connection".
  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);

    const adminId = readSessionUserId(cookies[SESSION_TYPES.admin.cookieName], "admin");
    const employeeId = readSessionUserId(cookies[SESSION_TYPES.employee.cookieName], "employee");

    if (!adminId && !employeeId) {
      return next(new Error("Authentication required."));
    }

    socket.data.rooms = [
      adminId && `admin:${adminId}`,
      employeeId && `employee:${employeeId}`,
    ].filter(Boolean);

    return next();
  });

  io.on("connection", (socket) => {
    socket.join(socket.data.rooms);
  });

  console.log("[SOCKET] Socket.IO initialized (cookie-authenticated rooms).");
  return io;
}

/**
 * Emit an event to one user. Safe to call when Socket.IO is not running.
 * @param {"admin"|"employee"} recipientType
 * @param {number} recipientId
 */
export function emitToUser(recipientType, recipientId, event, payload) {
  if (!io) return;
  io.to(`${recipientType}:${Number(recipientId)}`).emit(event, payload);
}
