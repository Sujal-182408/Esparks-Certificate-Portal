// ============================================================
// routes/verify.routes.js — PUBLIC certificate verification (QR code)
// mounted at /api/verify
// ============================================================
//
//   GET /api/verify/:token
//
// Anyone (an employer, a university ...) can scan a certificate's QR code
// and check it. Three possible answers:
//
//   200 { valid: true,  status: "valid"   }   certificate is genuine & active
//   200 { valid: false, status: "revoked" }   genuine, but no longer valid
//   404 { valid: false, status: "invalid" }   no such certificate
//
// BUG FIXED: the old handler answered "valid" even for REVOKED
// certificates, and it also called `app.patch(...)` on every request,
// registering two new routes per verification (an ever-growing memory
// leak). Revoked certificates now report "revoked".
// ============================================================

import express from "express";
import { verifyLimiter } from "../middleware/rateLimiters.js";
import { findCertificateForVerification } from "../services/certificateService.js";
import { isUuid } from "../utils/validation.js";

const router = express.Router();

router.get("/:token", verifyLimiter, async (req, res) => {
  const token = String(req.params.token || "").trim();

  if (!isUuid(token)) {
    return res.status(400).json({
      success: false,
      valid: false,
      status: "invalid",
      message: "Invalid certificate verification token.",
    });
  }

  const certificate = await findCertificateForVerification(token);

  if (!certificate) {
    return res.status(404).json({
      success: false,
      valid: false,
      status: "invalid",
      message: "This certificate could not be verified against our official company records.",
    });
  }

  if (certificate.status !== "issued") {
    return res.json({
      success: true,
      valid: false,
      status: "revoked",
      message: "This certificate was issued by eSparks IT Solutions but has since been revoked and is no longer valid.",
      certificate,
    });
  }

  return res.json({
    success: true,
    valid: true,
    status: "valid",
    message: "This certificate has been successfully verified against our official company records.",
    certificate,
  });
});

export default router;
