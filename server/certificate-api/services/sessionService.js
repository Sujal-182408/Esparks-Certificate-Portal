// ============================================================
// services/sessionService.js — login sessions (JWT in an httpOnly cookie)
// ============================================================
//
// HOW LOGIN WORKS IN THIS APP
// ---------------------------
// 1. User logs in with email + password.
// 2. We create a signed JWT:  { sub: "<user id>", role: "admin" | "employee" }
// 3. We put it in an **httpOnly** cookie. JavaScript in the browser can NOT
//    read httpOnly cookies, so an XSS bug cannot steal the session.
//    (Never store tokens in localStorage for this reason.)
// 4. The browser sends the cookie automatically on every API call
//    (the client uses `fetch(..., { credentials: "include" })`).
// 5. Middleware verifies the JWT and re-checks the database that the
//    account still exists and is active.
//
// Admin and employee sessions use DIFFERENT cookie names and DIFFERENT JWT
// "audience" values, so an employee token can never be accepted as an
// admin token, even though both are signed with the same secret.
// ============================================================

import jwt from "jsonwebtoken";
import { getJwtSecret, isProduction } from "../config/env.js";

const ISSUER = "certificate-api";
export const SESSION_MINUTES = 15;

/** Per-role settings. */
export const SESSION_TYPES = {
  admin: { cookieName: "certificate_admin_session", audience: "certificate-admin" },
  employee: { cookieName: "certificate_employee_session", audience: "certificate-employee" },
};

/**
 * Cookie options.
 *  - In production the React app and the API live on different domains,
 *    so the cookie must be `SameSite=None; Secure` to be sent at all.
 *    Cross-site request forgery is then blocked by middleware/trustedOrigin.js.
 *  - Locally both run on localhost, so `SameSite=Lax` over http is fine.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

/** Create the JWT and attach it to the response as a cookie. */
export function startSession(res, role, userId) {
  const { cookieName, audience } = SESSION_TYPES[role];
  const token = jwt.sign({ sub: String(userId), role }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: `${SESSION_MINUTES}m`,
    issuer: ISSUER,
    audience,
  });
  res.cookie(cookieName, token, {
    ...cookieOptions(),
    maxAge: SESSION_MINUTES * 60 * 1000,
  });
}

export function endSession(res, role) {
  res.clearCookie(SESSION_TYPES[role].cookieName, cookieOptions());
}

/**
 * Verify a session token.
 * @returns {number|null} the user ID, or null if the token is missing/invalid/expired.
 */
export function readSessionUserId(token, role) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      // Pinning the algorithm prevents "alg: none" style attacks.
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: SESSION_TYPES[role].audience,
    });
    const id = Number(payload.sub);
    if (payload.role !== role || !Number.isSafeInteger(id) || id <= 0) return null;
    return id;
  } catch {
    return null;
  }
}

/**
 * Parse a raw `Cookie:` header (used by Socket.IO, where Express's
 * cookie-parser middleware does not run).
 */
export function parseCookieHeader(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        const key = index === -1 ? part : part.slice(0, index);
        const value = index === -1 ? "" : part.slice(index + 1);
        try {
          return [key, decodeURIComponent(value)];
        } catch {
          return [key, value];
        }
      }),
  );
}
