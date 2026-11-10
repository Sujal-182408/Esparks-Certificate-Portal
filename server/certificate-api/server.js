// ============================================================
// server.js — start the API as a normal Node.js process
// ============================================================
//
//   npm run dev   -> restarts automatically when files change
//   npm start     -> production style
//
// On Vercel this file is NOT used; Vercel imports api/index.js instead.
//
// PROJECT LAYOUT (server/certificate-api)
// ---------------------------------------
//   config/       env variables + database pool
//   middleware/   auth guards, CSRF check, rate limits, error handler
//   services/     business logic + SQL (certificates, requests, email ...)
//   routes/       HTTP endpoints, one file per feature (see routes/index.js)
//   utils/        small generic helpers (validation, HTML escaping ...)
//   scripts/      one-off CLI tools (create an admin, test SMTP)
//   docs/         database schema reference
//   app.js        builds the Express app
//   socket.js     real-time notifications
// ============================================================

import http from "node:http";
import app from "./app.js";
import pool from "./config/db.js";
import { allowedOrigins, CLIENT_URL, PORT } from "./config/env.js";
import { initializeSocket } from "./socket.js";

async function start() {
  // Fail fast: if the database is unreachable, don't pretend to be up.
  await pool.query("SELECT 1");
  console.log("[DB] PostgreSQL connected.");

  const httpServer = http.createServer(app);
  initializeSocket(httpServer, allowedOrigins);

  httpServer.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE" ? `[HTTP] Port ${PORT} is already in use.` : "[HTTP] Server error:",
      error,
    );
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    console.log(`[HTTP] Certificate API listening on http://localhost:${PORT}`);
    console.log(`[HTTP] Client URL: ${CLIENT_URL}`);
  });

  // Graceful shutdown: finish in-flight requests, then close DB connections.
  const shutdown = (signal) => {
    console.log(`[HTTP] ${signal} received, shutting down...`);
    httpServer.close(() => pool.end().finally(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("[STARTUP] Server failed to start:", error);
  process.exit(1);
});
