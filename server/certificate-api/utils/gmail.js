
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend environment variables before reading SMTP settings.
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

console.log("[SMTP] Configuration:", {
  host: Boolean(SMTP_HOST),
  user: Boolean(SMTP_USER),
  pass: Boolean(SMTP_PASS),
  port: SMTP_PORT,
});

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Check SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }

  if (!Number.isInteger(SMTP_PORT) || SMTP_PORT <= 0) {
    throw new Error("Invalid SMTP_PORT configuration.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || "").trim();

  if (!recipient) {
    throw new Error("Email recipient is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error(`Invalid email recipient: ${recipient}`);
  }

  if (!subject || !String(subject).trim()) {
    throw new Error("Email subject is required.");
  }

  if (!text && !html) {
    throw new Error("Email must contain text or HTML content.");
  }

  try {
    console.log(`[SMTP] Sending email to: ${recipient}`);

    const mailer = getTransporter();

    const result = await mailer.sendMail({
      from: SMTP_FROM,
      to: recipient,
      subject: String(subject).trim(),
      text: text || undefined,
      html: html || undefined,
    });

    console.log(
      `[SMTP] Email accepted. Recipient: ${recipient}, Message ID: ${result.messageId}`
    );

    return result;
  } catch (error) {
    console.error(
      `[SMTP] Failed to send email to ${recipient}:`,
      error.message
    );

    throw error;
  }
}

// Keep existing email calls working.
export const sendGmailEmail = sendEmail;
