// ============================================================
// utils/validation.js — small, reusable input validators
// ============================================================
//
// GOLDEN RULE: never trust anything that comes from the client
// (req.params, req.query, req.body, cookies). Validate it, convert it to
// the type you expect, and reject it early with a clear 400 message.
//
// Each helper either RETURNS a clean value or THROWS an HttpError, so a
// route can stay short:
//
//     const id = parseId(req.params.id, "certificate");
// ============================================================

import { badRequest } from "./httpError.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CERTIFICATE_TYPES = ["CERT", "INTR"];

/** Positive integer database ID, e.g. "/certificates/42". */
export function parseId(value, label = "record") {
  const text = String(value ?? "").trim();
  const id = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id)) {
    throw badRequest(`Invalid ${label} ID.`);
  }
  return id;
}

export function isUuid(value) {
  return UUID_REGEX.test(String(value ?? "").trim());
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value ?? "").trim());
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Trimmed string with length rules.
 * @param {unknown} value
 * @param {{ label: string, max: number, required?: boolean }} rules
 * @returns {string} "" when optional and empty
 */
export function cleanText(value, { label, max, required = false }) {
  const text = value == null ? "" : String(value).trim();
  if (required && !text) throw badRequest(`${label} is required.`);
  if (text.length > max) {
    throw badRequest(`${label} must not exceed ${max} characters.`);
  }
  return text;
}

/**
 * Like cleanText, but for PARTIAL updates (HTTP PUT/PATCH):
 *   - field missing (undefined/null) -> returns null  ("do not change")
 *   - field present but empty        -> 400 error
 */
export function optionalText(value, { label, max }) {
  if (value == null) return null;
  return cleanText(value, { label, max, required: true });
}

/** "CERT" or "INTR" (case-insensitive). */
export function parseCertificateType(value, fallback = "") {
  const type = String(value || fallback).trim().toUpperCase();
  if (!CERTIFICATE_TYPES.includes(type)) {
    throw badRequest("Certificate type must be CERT or INTR.");
  }
  return type;
}

/** Internship duration only applies to INTR; CERT always stores NULL. */
export function parseDurationMonths(certificateType, value) {
  if (certificateType !== "INTR") return null;
  const months = Number(value);
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw badRequest("Internship duration must be between 1 and 24 months.");
  }
  return months;
}

/**
 * Optional calendar date in YYYY-MM-DD form. Rejects impossible dates
 * like 2026-02-31 (JavaScript would silently roll them to March).
 * @returns {string|null}
 */
export function parseOptionalDate(value, label = "Issue date") {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw badRequest(`${label} must be in YYYY-MM-DD format.`);

  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw badRequest(`Invalid ${label.toLowerCase()}.`);
  }
  return text;
}

/**
 * bcrypt only uses the first 72 BYTES of a password, so longer passwords
 * would be silently truncated. We reject them instead.
 */
export const PASSWORD_RULE_MESSAGE =
  "Password must be at least 10 characters and no more than 72 UTF-8 bytes.";

export function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}
