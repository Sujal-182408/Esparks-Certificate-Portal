// ============================================================
// scripts/testSmtp.js — check that SMTP settings work
// ============================================================
//
//   npm run test-smtp -- you@example.com
//
// The recipient is passed on the command line. (The old script had a
// personal email address hard-coded in it — never commit personal data.)
// ============================================================

import { sendEmail } from "../services/mailer.js";

const to = process.argv[2];

if (!to) {
  console.error("Usage: npm run test-smtp -- <recipient@example.com>");
  process.exit(1);
}

try {
  await sendEmail({
    to,
    subject: "eSparks Certificate Portal — SMTP Test",
    text: "SMTP email integration is working.",
  });
  console.log("SMTP OK — test email sent.");
} catch (error) {
  console.error("SMTP FAILED:", error.message);
  process.exitCode = 1;
}
