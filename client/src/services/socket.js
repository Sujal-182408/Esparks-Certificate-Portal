
import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://esparks-certificate-portal-server.vercel.app")
).replace(/\/+$/, "");

let socket = null;
let activeRole = null;

export function connectSocket(role = "employee") {
  if (!["employee", "admin"].includes(role)) {
    throw new Error("Invalid Socket.IO authentication role.");
  }

  // Recreate the connection when switching authenticated roles.
  if (socket && activeRole !== role) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    activeRole = role;

    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log(`[SOCKET] ${activeRole} connected:`, socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("[SOCKET] Connection failed:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[SOCKET] Disconnected:", reason);
    });

    socket.on("notification:error", (data) => {
      console.error("[SOCKET] Notification error:", data?.message);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function getSocket() {
  return socket;
}

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
