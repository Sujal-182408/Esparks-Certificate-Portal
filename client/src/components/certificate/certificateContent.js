// ============================================================
// certificateContent.js — WHAT the certificate says
// ============================================================
//
// All wording, names and formatting rules for the certificate live here,
// separate from the layout (CertificateDocument.jsx) and the artwork
// (certificateArt.jsx). To change a sentence, the signatory, or the
// company name, edit THIS file only.
// ============================================================

/** Master design size in px (3:2, same ratio as the approved design). */
export const CERT_WIDTH = 1500;
export const CERT_HEIGHT = 1000;

/** Fixed company / signatory details printed on every certificate. */
export const COMPANY = {
  brandLine1: "ESPARKS IT SOLUTIONS",
  brandLine2: "PRIVATE LIMITED",
  // Bold line in the body text: all capitals.
  bodyName: "ESPARKS IT SOLUTIONS PRIVATE LIMITED",
  // Signature block (bottom): normal capitalisation — "Esparks", never "ESparks".
  legalName: "Esparks IT Solutions Private Limited",
  signatoryName: "Faiz Akram",
  signatoryTitle: "Founder & CEO",
};

/** ISO badges shown in the header (keep in sync with real certifications). */
export const ISO_BADGES = [
  { standard: "ISO 9001:2015", lines: ["Quality Management", "System"] },
  { standard: "ISO/IEC 27001:2022", lines: ["Information Security", "Management System"] },
];

/**
 * Wording per certificate type.
 *   INTR = internship, CERT = course / training certificate.
 * `{name}` in `summary` is replaced with the recipient's first name.
 */
const WORDING = {
  INTR: {
    subtitle: "OF INTERNSHIP COMPLETION",
    programme: "the Internship Program",
    summary:
      "During the internship, {name} demonstrated a strong commitment to learning, contributed effectively to assigned projects, and upheld our values of quality, security, and continuous improvement.",
  },
  CERT: {
    subtitle: "OF COURSE COMPLETION",
    programme: "the Training Program",
    summary:
      "During the program, {name} demonstrated a strong commitment to learning, completed every assigned module, and upheld our values of quality, security, and continuous improvement.",
  },
};

export function getWording(certificateType) {
  return WORDING[certificateType] || WORDING.CERT;
}

/** "2026-08-01" or a Date -> "01 August 2026" (the format used on the certificate). */
export function formatCertificateDate(value) {
  if (!value) return "";
  // Date-only strings are parsed as UTC; format in UTC so the day never shifts.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Capitalise each word but keep the rest of the word as typed, so names
 * like "McDonald" or "D'Souza" are not damaged.
 */
export function formatPersonName(name = "") {
  return String(name)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator, letter) => separator + letter.toUpperCase());
}

export function firstName(name = "") {
  return formatPersonName(name).split(" ")[0] || "The recipient";
}

/**
 * Turn any API certificate shape (snake_case from the server) into the
 * camelCase object the certificate component expects.
 */
export function normalizeCertificate(raw = {}) {
  return {
    id: raw.id ?? null,
    recipientName: raw.recipient_name || raw.recipientName || "",
    courseName: raw.course_name || raw.courseName || "",
    certificateNo: raw.certificate_no || raw.certificateNo || "",
    certificateType: String(raw.certificate_type || raw.certificateType || "CERT").toUpperCase(),
    durationMonths: raw.duration_months ?? raw.durationMonths ?? null,
    // Optional programme dates ("from ... to ..."). Shown when present.
    startDate: raw.start_date || raw.startDate || "",
    endDate: raw.end_date || raw.endDate || "",
    issueDate: raw.issue_date || raw.issueDate || "",
    verificationToken: raw.verification_token || raw.verificationToken || "",
    status: String(raw.status || "issued").toLowerCase(),
    employeeEmail: raw.employee_email || raw.employeeEmail || "",
  };
}

/** Public URL encoded in the QR code. */
export function buildVerificationUrl(token) {
  return token ? `${window.location.origin}/verify?token=${encodeURIComponent(token)}` : "";
}
