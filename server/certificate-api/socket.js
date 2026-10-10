// ============================================================
// SOCKET.IO CONFIGURATION
// ============================================================

/**
 * This file contains all real-time communication logic.
 *
 * Socket.IO is responsible for:
 *
 * Employee  → Admin
 * Admin     → Employee
 *
 * instant notifications.
 */

// ------------------------------------------------------------
// Socket.IO Server
// ------------------------------------------------------------

let io = null;


// ============================================================
// INITIALIZE SOCKET.IO
// ============================================================

/**
 * Initializes Socket.IO with the HTTP server.
 *
 * server = Node HTTP server created in server.js
 */
function initializeSocket(server, allowedOrigins = []) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,

      credentials: true,

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ],
    },
  });


  // ----------------------------------------------------------
  // New socket connection
  // ----------------------------------------------------------

  io.on("connection", (socket) => {
    console.log(
      `🔌 Socket connected: ${socket.id}`
    );


    // ========================================================
    // EMPLOYEE ROOM
    // ========================================================

    /**
     * Employee joins:
     *
     * employee:5
     *
     * If employee ID is 5.
     */
    socket.on(
      "join:employee",
      (employeeId) => {
        const id =
          Number(employeeId);

        // Validate employee ID
        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          console.warn(
            "Invalid employee socket ID."
          );

          return;
        }


        // Create private employee room
        const room =
          `employee:${id}`;


        // Join room
        socket.join(room);


        console.log(
          `👤 Employee ${id} joined ${room}`
        );
      }
    );


    // ========================================================
    // ADMIN ROOM
    // ========================================================

    /**
     * Admin joins:
     *
     * admin:1
     *
     * If admin ID is 1.
     */
    socket.on(
      "join:admin",
      (adminId) => {
        const id =
          Number(adminId);

        // Validate admin ID
        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          console.warn(
            "Invalid admin socket ID."
          );

          return;
        }


        // Create admin room
        const room =
          `admin:${id}`;


        // Join room
        socket.join(room);


        console.log(
          `👨‍💼 Admin ${id} joined ${room}`
        );
      }
    );


    // ========================================================
    // DISCONNECT
    // ========================================================

    /**
     * Runs when browser closes,
     * internet disconnects,
     * page reloads, etc.
     */
    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `🔌 Socket disconnected: ${socket.id}`
        );

        console.log(
          `Reason: ${reason}`
        );
      }
    );
  });


  console.log(
    "🔌 Socket.IO initialized successfully."
  );


  return io;
}


// ============================================================
// GET SOCKET.IO INSTANCE
// ============================================================

/**
 * Returns the initialized Socket.IO instance.
 *
 * Other backend files can use this to emit events.
 */
function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized."
    );
  }

  return io;
}


// ============================================================
// SEND EMPLOYEE NOTIFICATION
// ============================================================

/**
 * Sends a real-time notification to one employee.
 *
 * Example:
 *
 * employeeId = 5
 *
 * Notification goes to:
 *
 * employee:5
 */
function emitEmployeeNotification(
  employeeId,
  notification
) {
  const id =
    Number(employeeId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return;
  }


  getIO()
    .to(`employee:${id}`)
    .emit(
      "notification:new",
      notification
    );
}


// ============================================================
// SEND ADMIN NOTIFICATION
// ============================================================

/**
 * Sends a real-time notification to one admin.
 *
 * Example:
 *
 * adminId = 1
 *
 * Notification goes to:
 *
 * admin:1
 */
function emitAdminNotification(
  adminId,
  notification
) {
  const id =
    Number(adminId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return;
  }


  getIO()
    .to(`admin:${id}`)
    .emit(
      "notification:new",
      notification
    );
}


// ============================================================
// EXPORT FUNCTIONS
// ============================================================

module.exports = {
  initializeSocket,
  getIO,
  emitEmployeeNotification,
  emitAdminNotification,
};