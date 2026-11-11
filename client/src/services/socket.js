
import { io } from "socket.io-client";

// ============================================================
// SOCKET SERVER URL
// ============================================================

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://esparks-certificate-portal-server.vercel.app")
).replace(/\/+$/, "");


// ============================================================
// SOCKET INSTANCE
// ============================================================

let socket = null;
let activeRole = null;


// ============================================================
// CONNECT SOCKET
// ============================================================

export function connectSocket(role = "employee") {
  if (!["employee", "admin"].includes(role)) {
    throw new Error("Invalid Socket.IO authentication role.");
  }

  // Recreate the connection when switching authenticated roles.
  if (socket && activeRole !== role) {
    socket.disconnect();
    socket = null;
    activeRole = null;
  }

  if (!socket) {
    activeRole = role;

  socket = io(SOCKET_URL, {
  // Vercel Socket.IO endpoint.
  path: "/api/socket.io",
  addTrailingSlash: false,

      // Connect manually after initialization.
      autoConnect: false,

      // Send HTTP-only authentication cookies.
      withCredentials: true,

      // Vercel WebSocket connection.
      transports: ["websocket"],

      // Automatic reconnection.
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // --------------------------------------------------------
    // CONNECTED
    // --------------------------------------------------------

    socket.on("connect", () => {
      console.log(
        `[SOCKET] ${activeRole} connected:`,
        socket.id,
      );
    });

    // --------------------------------------------------------
    // CONNECTION ERROR
    // --------------------------------------------------------

    socket.on("connect_error", (error) => {
      console.error(
        "[SOCKET] Connection failed:",
        error.message,
      );
    });

    // --------------------------------------------------------
    // DISCONNECTED
    // --------------------------------------------------------

    socket.on("disconnect", (reason) => {
      console.log(
        "[SOCKET] Disconnected:",
        reason,
      );
    });

    // --------------------------------------------------------
    // NOTIFICATION ERROR
    // --------------------------------------------------------

    socket.on("notification:error", (data) => {
      console.error(
        "[SOCKET] Notification error:",
        data?.message,
      );
    });
  }

  // Connect if not already connected.
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}


// ============================================================
// GET SOCKET INSTANCE
// ============================================================

export function getSocket() {
  return socket;
}


// ============================================================
// DISCONNECT SOCKET
// ============================================================

export function disconnectSocket(role) {
  // Prevent one authentication flow from disconnecting another role.
  if (role && activeRole !== role) {
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    activeRole = null;
  }
}
