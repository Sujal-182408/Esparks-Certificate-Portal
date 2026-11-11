// ============================================================
// api/index.js — Vercel serverless entry point
// ============================================================
//
// Vercel calls the exported Express app for every request that matches
// the rewrite in vercel.json ("/api/:path*" -> "/api").
//
// Unlike server.js, nothing here calls `listen()` — Vercel handles that.
// Socket.IO is therefore not available on Vercel (see socket.js).
// ============================================================

import app from "../app.js";

export default app;
