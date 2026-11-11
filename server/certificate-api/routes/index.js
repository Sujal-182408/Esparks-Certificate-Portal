// ============================================================
// routes/index.js — the API "table of contents"
// ============================================================
//
// Open this file to see every URL prefix the API serves and which file
// handles it. Each feature has its own router file.
//
// ORDER MATTERS for the two notification routers: they are mounted
// BEFORE the broader "/employee" router, so "/employee/notifications"
// is handled by the notifications router.
// ============================================================

import express from "express";
import pool from "../config/db.js";
import adminAuthRoutes from "./adminAuth.routes.js";
import employeeAuthRoutes from "./employeeAuth.routes.js";
import adminEmployeeRoutes from "./adminEmployees.routes.js";
import adminCertificateRoutes from "./adminCertificates.routes.js";
import adminRequestRoutes from "./adminCertificateRequests.routes.js";
import employeeRoutes from "./employee.routes.js";
import verifyRoutes from "./verify.routes.js";
import { buildNotificationRouter } from "./notifications.routes.js";

const api = express.Router();

// ---- Health check (used by uptime monitors) ----
api.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[HEALTH] Database unavailable:", error.message);
    res.status(503).json({ ok: false, database: "disconnected", timestamp: new Date().toISOString() });
  }
});

// ---- Authentication ----
api.use("/auth", adminAuthRoutes); //               admin login / logout / reset
api.use("/employee-auth", employeeAuthRoutes); //   employee register / login / reset

// ---- Public ----
api.use("/verify", verifyRoutes); //                QR code verification

// ---- Notifications (must be before "/employee") ----
api.use("/admin/notifications", buildNotificationRouter("admin"));
api.use("/employee/notifications", buildNotificationRouter("employee"));

// ---- Admin area (each router applies requireAdmin) ----
api.use("/admin/employees", adminEmployeeRoutes);
api.use("/admin/certificates", adminCertificateRoutes);
api.use("/admin/certificate-requests", adminRequestRoutes);

// ---- Employee area (applies requireEmployee) ----
api.use("/employee", employeeRoutes);

export default api;
