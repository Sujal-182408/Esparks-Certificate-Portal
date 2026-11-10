// ============================================================
// routes/adminCertificates.routes.js — mounted at /api/admin/certificates
// ============================================================
//
//   GET   /                       list all certificates
//   GET   /:id                    one certificate
//   POST  /                       issue a certificate from a pending request
//   PUT   /:id                    edit course / issuer / recipient / date
//   PATCH /:id/revoke             { reason?, deactivateEmployee? }
//   POST  /:id/delete-otp         step 1 of delete: email an OTP to the admin
//   POST  /:id/confirm-delete     step 2 of delete: { challengeId, otp }
// ============================================================

import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as certificateService from "../services/certificateService.js";
import { badRequest } from "../utils/httpError.js";
import {
  cleanText,
  isUuid,
  optionalText,
  parseCertificateType,
  parseId,
  parseOptionalDate,
} from "../utils/validation.js";

const router = express.Router();
router.use(requireAdmin);

const DEFAULT_ISSUER = "eSparks IT Solutions";
const DEFAULT_REVOKE_REASON = "Certificate revoked by administrator.";

router.get("/", async (req, res) => {
  res.json({ success: true, certificates: await certificateService.listCertificates() });
});

router.get("/:id", async (req, res) => {
  const certificate = await certificateService.getCertificateById(parseId(req.params.id, "certificate"));
  res.json({ success: true, certificate });
});

router.post("/", async (req, res) => {
  const body = req.body || {};

  // 1. Validate and normalise everything BEFORE touching the database.
  const input = {
    requestId: parseId(body.requestId, "certificate request"),
    certificateType: parseCertificateType(body.certificateType, "CERT"),
    courseName: cleanText(body.courseName, { label: "Course name", max: 200, required: true }),
    issuerName: cleanText(body.issuerName || DEFAULT_ISSUER, { label: "Issuer name", max: 200, required: true }),
    issueDate: parseOptionalDate(body.issueDate),
  };

  // 2. Business logic lives in the service.
  const { certificate, request } = await certificateService.issueCertificate(input, req.admin);

  // 3. 201 Created = a new resource was created.
  res.status(201).json({ success: true, message: "Certificate created successfully.", certificate, request });
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id, "certificate");
  const body = req.body || {};

  const changes = {
    courseName: optionalText(body.courseName, { label: "Course name", max: 200 }),
    issuerName: optionalText(body.issuerName, { label: "Issuer name", max: 200 }),
    recipientName: optionalText(body.recipientName, { label: "Recipient name", max: 150 }),
    issueDate: parseOptionalDate(body.issueDate),
  };

  const certificate = await certificateService.updateCertificate(id, changes, req.admin);
  res.json({ success: true, message: "Certificate updated successfully.", certificate });
});

router.patch("/:id/revoke", async (req, res) => {
  const id = parseId(req.params.id, "certificate");
  const { reason, deactivateEmployee = false } = req.body || {};

  if (typeof deactivateEmployee !== "boolean") {
    throw badRequest("deactivateEmployee must be a boolean.");
  }

  const cleanReason =
    cleanText(reason, { label: "Revocation reason", max: 2000 }) || DEFAULT_REVOKE_REASON;

  const result = await certificateService.revokeCertificate(
    id,
    { reason: cleanReason, deactivateEmployee },
    req.admin,
  );

  res.json({
    success: true,
    message: result.employeeDeactivated
      ? "Certificate revoked and employee account deactivated successfully."
      : "Certificate revoked successfully.",
    ...result,
  });
});

router.post("/:id/delete-otp", async (req, res) => {
  const result = await certificateService.requestDeleteOtp(parseId(req.params.id, "certificate"), req.admin);
  res.json({ success: true, ...result });
});

router.post("/:id/confirm-delete", async (req, res) => {
  const id = parseId(req.params.id, "certificate");
  const { challengeId, otp } = req.body || {};

  if (!isUuid(challengeId) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw badRequest("A valid verification OTP is required.");
  }

  const certificate = await certificateService.confirmDelete(id, { challengeId, otp }, req.admin);
  res.json({ success: true, message: "Certificate verified and deleted successfully.", certificate });
});

export default router;
