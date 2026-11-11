// ============================================================
// middleware/rateLimiters.js — limit how often an IP can hit a route
// ============================================================
//
// Rate limiting slows down password guessing, email spamming (forgot
// password) and scraping. All limiters live here so the limits are easy
// to review in one place.
//
// NOTE: `app.set("trust proxy", 1)` in app.js is required so that the
// real client IP (from Vercel's proxy) is used instead of the proxy's IP.
//
// LIMITATION: on serverless hosting each instance keeps its own counters
// in memory. For strict limits across instances, use a shared store
// (e.g. Redis) — see express-rate-limit "stores".
// ============================================================

import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message },
  });
}

export const loginLimiter = limiter(
  FIFTEEN_MINUTES,
  10,
  "Too many login attempts. Please try again in 15 minutes.",
);

export const registerLimiter = limiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later.",
);

export const forgotPasswordLimiter = limiter(
  FIFTEEN_MINUTES,
  5,
  "Too many password reset requests. Please try again later.",
);

export const resetPasswordLimiter = limiter(
  FIFTEEN_MINUTES,
  10,
  "Too many password reset attempts. Please try again later.",
);

export const verifyLimiter = limiter(
  FIFTEEN_MINUTES,
  60,
  "Too many verification requests. Please try again later.",
);
