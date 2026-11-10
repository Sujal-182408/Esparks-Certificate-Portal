// ============================================================
// config/env.js — THE ONLY PLACE THAT READS process.env
// ============================================================
//
// WHY THIS FILE EXISTS
// --------------------
// Before this refactor, `process.env.X || "some fallback"` was repeated
// in many files, with *different* fallbacks in different places (for
// example two different "isProduction" rules and a personal Gmail address
// hard-coded as the admin email). That makes bugs very hard to find.
//
// Rule for the whole codebase:
//   -> Never read `process.env` outside this file.
//   -> Import the value you need from here instead.
//
// ES MODULE LOAD ORDER
// --------------------
// `import` statements are evaluated before the code of the importing file
// runs. Because every module that needs configuration imports THIS file,
// dotenv is guaranteed to run before anything reads a variable. No
// "dynamic import" tricks are needed.
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/certificate-api/.env (ignored when the file does not exist,
// e.g. on Vercel where variables come from the dashboard).
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

/** Remove trailing slashes so we can safely do `${url}/path`. */
function trimUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

/** Read a variable that the app cannot work without. */
function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// One single definition of "production". Vercel always sets VERCEL=1.
export const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

export const isVercel = Boolean(process.env.VERCEL);

export const PORT = Number(process.env.PORT) || 5000;

// Public URL of the React app. Used to build links inside emails.
export const CLIENT_URL = trimUrl(process.env.CLIENT_URL || "http://localhost:5174");

// Where "new request / revoked certificate" notifications are emailed.
// There is intentionally NO personal fallback address: if it is not
// configured, admin emails are skipped and a warning is logged.
export const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim();

export const DATABASE_URL = required("DATABASE_URL");

/**
 * The JWT secret is read lazily (when a token is signed/verified) so that
 * scripts such as createAdmin.js can run without it.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 64) {
    throw new Error("JWT_SECRET must be at least 64 bytes long.");
  }
  return secret;
}

// SMTP settings for outgoing email.
export const smtp = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};

// Browser origins that are allowed to call this API with cookies.
// Extra origins can be added with a comma separated EXTRA_ALLOWED_ORIGINS
// variable instead of editing code (no more dev-tunnel URLs in source).
export const allowedOrigins = [
  ...new Set(
    [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "https://esparks-certificate-portal.vercel.app",
      "https://certificate.esparksit.com",
      CLIENT_URL,
      ...String(process.env.EXTRA_ALLOWED_ORIGINS || "")
        .split(",")
        .map(trimUrl),
    ].filter(Boolean),
  ),
];
