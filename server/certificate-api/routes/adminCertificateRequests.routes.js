// ============================================================
// routes/adminCertificateRequests.routes.js
// mounted at /api/admin/certificate-requests
// ============================================================
//
//   GET  /              all requests (with employee name/email)
//   GET  /:id           one request (used by the "Create Certificate" page)
//   POST /              admin creates a request on an employee's behalf
//   POST /:id/reject    { reason }
//   POST /:id/issue     410 Gone — issuing now happens via POST /api/admin/certificates
// ============================================================

import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as requestService from "../services/certificateRequestService.js";
import { readRequestInput } from "./requestInput.js";
import { cleanText, parseId } from "../utils/validation.js";

const router = express.Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  res.json({ success: true, requests: await requestService.listAllRequests() });
});

router.get("/:id", async (req, res) => {
  const request = await requestService.getRequestById(parseId(req.params.id, "certificate request"));
  res.json({ success: true, request });
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const employeeId = parseId(body.employeeId, "employee");
  const input = readRequestInput({
    certificateType: body.certificateType,
    courseName: body.courseName,
    additionalDetails: body.additionalDetails,
    durationMonths: body.durationMonths,
  });

  const request = await requestService.createRequest(employeeId, input, { createdByAdmin: req.admin });
  res.status(201).json({ success: true, message: "Certificate request created successfully.", request });
});

router.post("/:id/reject", async (req, res) => {
  const requestId = parseId(req.params.id, "certificate request");
  const reason =
    cleanText(req.body?.reason ?? req.body?.rejectionReason, { label: "Rejection reason", max: 2000 }) ||
    "Request rejected by administrator.";

  const request = await requestService.rejectRequest(requestId, reason, req.admin);
  res.json({ success: true, message: "Certificate request rejected successfully.", request });
});

router.post("/:id/issue", (req, res) => {
  res.status(410).json({
    success: false,
    message:
      "This endpoint is deprecated. Open the certificate creation page and confirm the certificate details before creating the certificate.",
  });
});

export default router;
