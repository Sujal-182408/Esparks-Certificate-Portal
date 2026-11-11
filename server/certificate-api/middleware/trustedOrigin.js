// ============================================================
// middleware/trustedOrigin.js — CSRF protection
// ============================================================
//
// THE PROBLEM (Cross-Site Request Forgery)
// ----------------------------------------
// Our session cookies are `SameSite=None` in production (needed because
// the React app and the API are on different domains). That means if a
// logged-in admin visits an evil website, that site could submit a hidden
// <form method="POST" action="https://our-api/api/admin/certificate-requests/5/reject">
// and the browser would attach the admin's cookie!
//
// CORS does NOT stop this: CORS only stops the evil site from READING
// the response — the request itself still reaches the server.
//
// THE FIX
// -------
// Browsers always send an `Origin` header on cross-site POST/PUT/PATCH/
// DELETE requests, and a website cannot fake it. So for every
// state-changing request we check that Origin is one of OUR front-ends.
//
// Requests with no Origin header (curl, server-to-server, health checks)
// don't carry a victim's browser cookies, so they are allowed through.
//
// Previously this check existed only on the login/logout routes, and its
// allow-list didn't even include the production domains unless CLIENT_URL
// was set. Now it runs for the whole API, using the same list as CORS.
// ============================================================

import { allowedOrigins } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isAllowedOrigin(origin) {
  return allowedOrigins.includes(String(origin || "").trim().replace(/\/+$/, ""));
}

export function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (!origin || isAllowedOrigin(origin)) return next();

  console.warn(`[SECURITY] Blocked ${req.method} ${req.originalUrl} from untrusted origin: ${origin}`);
  return res.status(403).json({ success: false, message: "Untrusted request origin." });
}
