// ============================================================
// routes/employee.routes.js — mounted at /api/employee
// ============================================================
//
// Everything here is for the LOGGED-IN employee only. The employee ID
// always comes from the session (`req.employee.id`), never from the URL
// or body — so an employee can never read another employee's data.
//
//   GET  /certificates                 my issued certificates
//   GET  /certificates/:token          one of my certificates
//   GET  /qr   (and POST /qr)          my latest certificate + its verify URL
//   GET  /certificate-requests         my requests
//   POST /certificate-requests         submit a new request
// ============================================================

import express from "express";
import pool from "../config/db.js";
import { CLIENT_URL } from "../config/env.js";
import { requireEmployee } from "../middleware/auth.js";
import * as requestService from "../services/certificateRequestService.js";
import { readRequestInput } from "./requestInput.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { isUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireEmployee);

const EMPLOYEE_CERTIFICATE_COLUMNS = `
  id, certificate_no, certificate_type, recipient_name, course_name, issuer_name,
  issue_date, verification_token, status, created_at, revoked_at`;

router.get("/certificates", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_CERTIFICATE_COLUMNS}
       FROM certificates
      WHERE employee_id = $1 AND status = 'issued'
      ORDER BY issue_date DESC, id DESC`,
    [req.employee.id],
  );
  res.json({ success: true, certificates: rows });
});

router.get("/certificates/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!isUuid(token)) throw badRequest("Invalid certificate verification token.");

  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_CERTIFICATE_COLUMNS}, employee_id
       FROM certificates
      WHERE verification_token = $1 AND employee_id = $2
      LIMIT 1`,
    [token, req.employee.id],
  );
  const certificate = rows[0];

  if (!certificate) throw notFound("Certificate not found or you do not have permission to view it.");
  if (certificate.status !== "issued") {
    throw forbidden("This certificate has been revoked and is no longer available.");
  }
  res.json({ success: true, certificate });
});

// GET and POST used to be two identical 60-line handlers. One is enough.
async function latestCertificateQr(req, res) {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYEE_CERTIFICATE_COLUMNS}
       FROM certificates
      WHERE employee_id = $1 AND status = 'issued'
      ORDER BY issue_date DESC, id DESC
      LIMIT 1`,
    [req.employee.id],
  );
  const certificate = rows[0];
  if (!certificate) throw notFound("No issued certificate found.");

  res.json({
    success: true,
    certificate,
    verificationUrl: `${CLIENT_URL}/verify?token=${encodeURIComponent(certificate.verification_token)}`,
  });
}
router.get("/qr", latestCertificateQr);
router.post("/qr", latestCertificateQr);

router.get("/certificate-requests", async (req, res) => {
  res.json({ success: true, requests: await requestService.listRequestsForEmployee(req.employee.id) });
});

router.post("/certificate-requests", async (req, res) => {
  const body = req.body || {};
  // The employee form uses snake_case field names.
  const input = readRequestInput({
    certificateType: body.certificate_type,
    courseName: body.course_name,
    additionalDetails: body.additional_details,
    durationMonths: body.duration_months,
  });

  const request = await requestService.createRequest(req.employee.id, input);
  res.status(201).json({ success: true, message: "Certificate request submitted successfully.", request });
});

export default router;
