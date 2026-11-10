// ============================================================
// app.js — builds the Express application
// ============================================================
//
// WHY app.js AND server.js ARE SEPARATE
// -------------------------------------
//   app.js     -> "what the API does" (middleware + routes). No network.
//   server.js  -> "how it runs locally" (listen on a port + Socket.IO).
//   api/index.js -> "how it runs on Vercel" (exports the same app).
//
// This also makes the app easy to test: tests can import `app` without
// opening a port.
//
// MIDDLEWARE ORDER (top to bottom, every request):
//   1. security headers (helmet)
//   2. CORS               -> which websites may call us
//   3. CSRF origin check  -> block forged cross-site writes
//   4. cookie + JSON parsing
//   5. routes
//   6. 404 handler
//   7. error handler      -> must be LAST
// ============================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { isAllowedOrigin, requireTrustedOrigin } from "./middleware/trustedOrigin.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers.js";
import apiRoutes from "./routes/index.js";

const app = express();

// We run behind a proxy (Vercel / load balancer). This makes `req.ip`
// the real client IP, which the rate limiters rely on.
app.set("trust proxy", 1);
app.disable("x-powered-by"); // don't advertise "Express"

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin(origin, callback) {
      // No Origin = not a browser cross-origin request (curl, server).
      callback(null, !origin || isAllowedOrigin(origin));
    },
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(requireTrustedOrigin);
app.use(cookieParser());
app.use(express.json({ limit: "10kb" })); // small limit = cheap protection against huge bodies

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
