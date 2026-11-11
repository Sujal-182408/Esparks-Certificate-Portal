// ============================================================
// routes/adminEmployees.routes.js — mounted at /api/admin/employees
// ============================================================
//
//   GET   /api/admin/employees              list employees
//   GET   /api/admin/employees/:id          employee + certificates + rejected requests
//   PATCH /api/admin/employees/:id/status   { is_active: boolean }
//
// `requireAdmin` is applied once with router.use(), so every route below
// is protected — no route can accidentally be left public.
// ============================================================

import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as employeeService from "../services/employeeService.js";
import { parseId } from "../utils/validation.js";

const router = express.Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  const employees = await employeeService.listEmployees();
  res.json({ success: true, employees });
});

router.get("/:id", async (req, res) => {
  const details = await employeeService.getEmployeeDetails(parseId(req.params.id, "employee"));
  res.json({ success: true, ...details });
});

router.patch("/:id/status", async (req, res) => {
  const employeeId = parseId(req.params.id, "employee");
  const isActive = req.body?.is_active;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ success: false, message: "is_active must be a boolean." });
  }

  const result = await employeeService.setEmployeeActive(employeeId, isActive, req.admin);
  return res.json({ success: true, ...result });
});

export default router;
