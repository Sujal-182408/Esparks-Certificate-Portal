
// ============================================================
// socket.js — Real-Time Notifications (Socket.IO)
// ============================================================
//
// SECURITY
// --------
// Socket.IO connections are authenticated using the same
// HTTP-only session cookies as the REST API.
//
// The server verifies the user's identity and assigns the
// socket to a private room. Clients cannot choose their rooms
// or subscribe to another user's notifications.
//
// Private Rooms:
//   employee:<id>
//   admin:<id>
//
// VERCEL
// ------
// Uses the WebSocket transport with the configured Vercel
// function endpoint. Notifications also remain stored in the
// database and can be retrieved through REST APIs.
//
// ============================================================


// ============================================================
// IMPORTS
// ============================================================

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "./config/db.js";

import {
  parseCookieHeader,
  readSessionUserId,
  SESSION_TYPES,
} from "./services/sessionService.js";


// ============================================================
// SOCKET.IO INSTANCE
// ============================================================

/** @type {Server | null} */
let io = null;


// ============================================================
// AUTHENTICATION CONFIGURATION
// ============================================================

const SESSION_RECHECK_INTERVAL = 60 * 1000;


// ============================================================
// VERIFY ADMIN SESSION
// ============================================================

async function authenticateAdmin(token) {
  // Verify the token using the shared session service.
  const adminId = readSessionUserId(token, "admin");

  if (!adminId) {
    throw new Error("Invalid or expired admin session.");
  }

  // Confirm that the admin account still exists and is active.
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        role,
        is_active
      FROM admin_users
      WHERE
        id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [adminId],
  );

  if (!result.rows.length) {
    throw new Error(
      "Admin account is inactive or no longer exists.",
    );
  }

  const admin = result.rows[0];

  if (
    admin.role !== "admin" ||
    admin.is_active !== true
  ) {
    throw new Error("Admin access denied.");
  }

  return {
    id: Number(admin.id),
    email: admin.email,
    role: "admin",
  };
}


// ============================================================
// VERIFY EMPLOYEE SESSION
// ============================================================

async function authenticateEmployee(token) {
  // Verify the token using the shared session service.
  const employeeId = readSessionUserId(token, "employee");

  if (!employeeId) {
    throw new Error("Invalid or expired employee session.");
  }

  // Confirm that the employee account still exists and is active.
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        is_active
      FROM employee_users
      WHERE
        id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [employeeId],
  );

  if (!result.rows.length) {
    throw new Error(
      "Employee account is inactive or no longer exists.",
    );
  }

  const employee = result.rows[0];

  if (employee.is_active !== true) {
    throw new Error("Employee access denied.");
  }

  return {
    id: Number(employee.id),
    name: employee.name,
    email: employee.email,
    role: "employee",
  };
}


// ============================================================
// RECHECK CONNECTED USER ACCOUNT
// ============================================================

async function isAccountStillActive(user) {
  // Revalidate administrator account.
  if (user.role === "admin") {
    const result = await pool.query(
      `
        SELECT id
        FROM admin_users
        WHERE
          id = $1
          AND role = 'admin'
          AND is_active = TRUE
        LIMIT 1
      `,
      [user.id],
    );

    return result.rows.length > 0;
  }

  // Revalidate employee account.
  if (user.role === "employee") {
    const result = await pool.query(
      `
        SELECT id
        FROM employee_users
        WHERE
          id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [user.id],
    );

    return result.rows.length > 0;
  }

  return false;
}


// ============================================================
// INITIALIZE SOCKET.IO
// ============================================================

/**
 * Attach Socket.IO to the HTTP server.
 *
 * Call this function only once from server.js.
 *
 * @param {import("node:http").Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {Server}
 */

export function initializeSocket(
  httpServer,
  allowedOrigins = [],
) {
  if (io) {
    throw new Error(
      "Socket.IO has already been initialized.",
    );
  }

  // Normalize and validate trusted frontend origins.
  const trustedOrigins = new Set(
    allowedOrigins
      .filter((origin) => typeof origin === "string")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  );

  // Create Socket.IO server.
  io = new Server(httpServer, {
    // Vercel function endpoint.
    path: "/api/socket.io",

    cors: {
      origin: [...trustedOrigins],
      credentials: true,
      methods: ["GET", "POST"],
    },

    maxHttpBufferSize: 10_000,
  });


  // ==========================================================
  // SOCKET AUTHENTICATION MIDDLEWARE
  // ==========================================================

  io.use(async (socket, next) => {
    try {
      // Validate the browser origin.
      const origin = socket.handshake.headers.origin;

      const normalizedOrigin = origin
        ? origin.trim().replace(/\/+$/, "")
        : "";

      if (
        !normalizedOrigin ||
        !trustedOrigins.has(normalizedOrigin)
      ) {
        return next(
          new Error("Unauthorized socket origin."),
        );
      }

      // Read session cookies from the handshake.
      const cookieHeader =
        socket.handshake.headers.cookie || "";

      const cookies = parseCookieHeader(cookieHeader);

      const adminToken =
        cookies[SESSION_TYPES.admin.cookieName];

      const employeeToken =
        cookies[SESSION_TYPES.employee.cookieName];

      // Exactly one session must be present.
      if (Boolean(adminToken) === Boolean(employeeToken)) {
        return next(
          new Error("Socket authentication required."),
        );
      }

      // Authenticate the user using the shared session service.
      let user;
      let sessionToken;

      if (adminToken) {
        sessionToken = adminToken;
        user = await authenticateAdmin(adminToken);
      } else {
        sessionToken = employeeToken;
        user = await authenticateEmployee(employeeToken);
      }

      // Store the verified identity on the socket.
      socket.data.user = user;

      // Read expiration from the already verified JWT.
      const decoded = jwt.decode(sessionToken);

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !decoded.exp
      ) {
        return next(
          new Error("Invalid socket session expiration."),
        );
      }

      socket.data.expiresAt = decoded.exp * 1000;

      return next();

    } catch (error) {
      console.error(
        "[SOCKET AUTH] Authentication failed:",
        error.message,
      );

      return next(
        new Error("Socket authentication failed."),
      );
    }
  });


  // ==========================================================
  // AUTHENTICATED CONNECTION
  // ==========================================================

  io.on("connection", (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Assign a private room using the verified identity.
    const room =
      user.role === "admin"
        ? `admin:${user.id}`
        : `employee:${user.id}`;

    socket.join(room);

    console.log(
      `Authenticated ${user.role}: ${user.id}`,
    );

    console.log(
      `Socket ${socket.id} joined ${room}`,
    );


    // ========================================================
    // REJECT CLIENT-CONTROLLED ROOM JOIN REQUESTS
    // ========================================================

    socket.on("join:employee", () => {
      socket.emit("notification:error", {
        message:
          "Employee rooms are assigned automatically after authentication.",
      });
    });

    socket.on("join:admin", () => {
      socket.emit("notification:error", {
        message:
          "Admin rooms are assigned automatically after authentication.",
      });
    });


    // ========================================================
    // AUTOMATIC JWT EXPIRATION DISCONNECT
    // ========================================================

    const remainingSessionTime =
      socket.data.expiresAt - Date.now();

    if (remainingSessionTime <= 0) {
      socket.disconnect(true);
      return;
    }

    const expiryTimer = setTimeout(() => {
      console.log(
        `[SOCKET] Session expired for ${user.role}:${user.id}`,
      );

      socket.disconnect(true);
    }, remainingSessionTime);

    expiryTimer.unref?.();


    // ========================================================
    // PERIODIC DATABASE ACCOUNT VALIDATION
    // ========================================================

    const accountCheckTimer = setInterval(async () => {
      try {
        const active = await isAccountStillActive(user);

        if (!active) {
          console.log(
            `[SOCKET] Inactive account disconnected: ${user.role}:${user.id}`,
          );

          socket.disconnect(true);
        }

      } catch (error) {
        // Fail closed if account verification fails.
        console.error(
          "[SOCKET] Account verification failed:",
          error.message,
        );

        socket.disconnect(true);
      }
    }, SESSION_RECHECK_INTERVAL);

    accountCheckTimer.unref?.();


    // ========================================================
    // DISCONNECT CLEANUP
    // ========================================================

    socket.on("disconnect", (reason) => {
      clearTimeout(expiryTimer);
      clearInterval(accountCheckTimer);

      console.log(
        `Socket disconnected: ${socket.id} - ${reason}`,
      );
    });
  });


  // ==========================================================
  // INITIALIZATION COMPLETE
  // ==========================================================

  console.log(
    "Secure Socket.IO initialized successfully.",
  );

  return io;
}


// ============================================================
// GET SOCKET.IO INSTANCE
// ============================================================

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized.",
    );
  }

  return io;
}


// ============================================================
// EMIT EMPLOYEE NOTIFICATION
// ============================================================

export function emitEmployeeNotification(
  employeeId,
  notification,
) {
  const id = Number(employeeId);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !notification?.id ||
    !io
  ) {
    return;
  }

  io
    .to(`employee:${id}`)
    .emit("notification:new", notification);
}


// ============================================================
// EMIT ADMIN NOTIFICATION
// ============================================================

export function emitAdminNotification(
  adminId,
  notification,
) {
  const id = Number(adminId);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !notification?.id ||
    !io
  ) {
    return;
  }

  io
    .to(`admin:${id}`)
    .emit("notification:new", notification);
}


// ============================================================
// EMIT EVENT TO A SPECIFIC USER
// ============================================================

/**
 * Emit an event to one authenticated user.
 *
 * Safe to call when Socket.IO is not initialized.
 *
 * @param {"admin"|"employee"} recipientType
 * @param {number} recipientId
 * @param {string} event
 * @param {unknown} payload
 */

export function emitToUser(
  recipientType,
  recipientId,
  event,
  payload,
) {
  if (!io) {
    return;
  }

  if (
    !["admin", "employee"].includes(recipientType)
  ) {
    return;
  }

  const id = Number(recipientId);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof event !== "string" ||
    !event.trim()
  ) {
    return;
  }

  io
    .to(`${recipientType}:${id}`)
    .emit(event, payload);
}
