// ============================================================
// SOCKET.IO CONFIGURATION
// ============================================================
// One Socket.IO instance is attached to the HTTP server from server.js.
// Notification events are emitted after their PostgreSQL transaction commits.

import { Server } from "socket.io";

let io = null;

function initializeSocket(server, allowedOrigins = []) {
  if (io) {
    throw new Error("Socket.IO has already been initialized.");
  }

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 10000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // IMPORTANT: these room-join events only validate the ID format. They do
    // not authenticate the caller. Add socket JWT/session verification and
    // compare the requested ID with the verified identity before production use.
    socket.on("join:employee", (employeeId) => {
      const id = Number(employeeId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        socket.emit("notification:error", { message: "Invalid employee ID." });
        return;
      }
      const room = `employee:${id}`;
      socket.join(room);
      console.log(`👤 Employee room requested: ${room}`);
    });

    socket.on("join:admin", (adminId) => {
      const id = Number(adminId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        socket.emit("notification:error", { message: "Invalid admin ID." });
        return;
      }
      const room = `admin:${id}`;
      socket.join(room);
      console.log(`👨‍💼 Admin room requested: ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} - ${reason}`);
    });
  });

  console.log("🔌 Socket.IO initialized successfully.");
  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return io;
}

function emitEmployeeNotification(employeeId, notification) {
  const id = Number(employeeId);
  if (!Number.isSafeInteger(id) || id <= 0 || !notification) return;
  getIO().to(`employee:${id}`).emit("notification:new", notification);
}

function emitAdminNotification(adminId, notification) {
  const id = Number(adminId);
  if (!Number.isSafeInteger(id) || id <= 0 || !notification) return;
  getIO().to(`admin:${id}`).emit("notification:new", notification);
}

export {
  initializeSocket,
  getIO,
  emitEmployeeNotification,
  emitAdminNotification,
};
