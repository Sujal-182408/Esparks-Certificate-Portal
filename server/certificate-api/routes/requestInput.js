// ============================================================
// routes/requestInput.js — shared validation for certificate requests
// ============================================================
//
// Employees and admins submit the same request fields (the old code had
// two identical 60-line validation blocks). Validate them once, here.
// ============================================================

import {
  cleanText,
  parseCertificateType,
  parseDurationMonths,
} from "../utils/validation.js";

/**
 * @returns {{ certificateType: string, courseName: string, additionalDetails: string, durationMonths: number|null }}
 * @throws HttpError(400) when a field is invalid
 */
export function readRequestInput({ certificateType, courseName, additionalDetails, durationMonths }) {
  const type = parseCertificateType(certificateType);
  return {
    certificateType: type,
    durationMonths: parseDurationMonths(type, durationMonths),
    courseName: cleanText(courseName, { label: "Course name", max: 200, required: true }),
    additionalDetails: cleanText(additionalDetails, { label: "Additional details", max: 2000 }),
  };
}
