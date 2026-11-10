// ============================================================
// services/mailer.js — send email over SMTP (nodemailer)
// ============================================================
//
// Two functions:
//
//   sendEmail(message)        -> throws if sending fails.
//                                Use when the caller MUST know (e.g. the
//                                delete-OTP email: without it the admin
//                                cannot continue).
//
//   sendEmailSafely(message)  -> never throws, returns true/false.
//                                Use for "nice to have" notifications that
//                                must NOT undo or block the main action
//                                (a certificate is still issued even if
//                                the "issued" email fails).
//
// IMPORTANT: always send emails AFTER the database transaction commits.
// If you send first and the transaction then rolls back, the user gets an
// email about something that never happened.
// ============================================================

import nodemailer from "nodemailer";
import { smtp } from "../config/env.js";
import { isValidEmail } from "../utils/validation.js";

let transporter = null;

/** Create the SMTP transporter once and reuse it (lazy singleton). */
function getTransporter() {
  if (transporter) return transporter;

  if (!smtp.host || !smtp.user || !smtp.pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }
  if (!Number.isInteger(smtp.port) || smtp.port <= 0) {
    throw new Error("Invalid SMTP_PORT configuration.");
  }

  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465, // implicit TLS
    requireTLS: smtp.port === 587, // STARTTLS
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

  return transporter;
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
export async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || "").trim();

  if (!isValidEmail(recipient)) throw new Error("Invalid email recipient.");
  if (!subject || !String(subject).trim()) throw new Error("Email subject is required.");
  if (!text && !html) throw new Error("Email must contain text or HTML content.");

  const result = await getTransporter().sendMail({
    from: smtp.from,
    to: recipient,
    subject: String(subject).trim(),
    text: text || undefined,
    html: html || undefined,
  });

  console.log(`[MAIL] Sent "${subject}" (message id ${result.messageId})`);
  return result;
}

/** Same as sendEmail but returns false instead of throwing. */
export async function sendEmailSafely(message) {
  try {
    await sendEmail(message);
    return true;
  } catch (error) {
    console.error(`[MAIL] Failed to send "${message?.subject}":`, error.message);
    return false;
  }
}
