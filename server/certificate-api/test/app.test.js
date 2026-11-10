// ============================================================
// test/app.test.js — smoke tests (no database required)
// ============================================================
//
//   npm test
//
// Uses Node's built-in test runner (`node --test`), so no extra packages.
// These tests start the real Express app on a random port and check
// behaviour that is decided BEFORE any database query: routing,
// authentication guards, CSRF protection, input validation, error
// handling and email escaping.
//
// The database URL is a fake one: the pool only connects on the first
// query, and none of these requests reach a query.
// ============================================================

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET ||= "x".repeat(64);

const { default: app } = await import("../app.js");
const { escapeHtml } = await import("../utils/html.js");
const { parseOptionalDate, parseId } = await import("../utils/validation.js");
const templates = await import("../services/emailTemplates.js");
const { parseCookieHeader, readSessionUserId } = await import("../services/sessionService.js");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const call = (path, options = {}) =>
  fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });

describe("routing & errors", () => {
  test("unknown route -> 404 JSON", async () => {
    const res = await call("/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal((await res.json()).success, false);
  });

  test("malformed JSON -> 400 instead of 500", async () => {
    const res = await call("/employee-auth/login", { method: "POST", body: "{bad json" });
    assert.equal(res.status, 400);
  });
});

describe("authentication guards", () => {
  for (const path of [
    "/admin/employees",
    "/admin/certificates",
    "/admin/certificate-requests",
    "/admin/notifications",
    "/employee/certificates",
    "/employee/notifications",
    "/auth/me",
    "/employee-auth/me",
  ]) {
    test(`${path} requires a session`, async () => {
      assert.equal((await call(path)).status, 401);
    });
  }

  test("forged admin cookie is rejected", async () => {
    const res = await call("/admin/employees", {
      headers: { Cookie: "certificate_admin_session=not-a-real-jwt" },
    });
    assert.equal(res.status, 401);
  });

  test("employee read-all notifications route exists (was 404)", async () => {
    const res = await call("/employee/notifications/read-all", { method: "PATCH" });
    assert.equal(res.status, 401); // exists, but needs login
  });
});

describe("CSRF origin check", () => {
  test("POST from an untrusted website is blocked", async () => {
    const res = await call("/admin/certificate-requests/1/reject", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: "{}",
    });
    assert.equal(res.status, 403);
  });

  test("POST from the real front-end is allowed through", async () => {
    const res = await call("/employee-auth/login", {
      method: "POST",
      headers: { Origin: "http://localhost:5173" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400); // reached validation
  });
});

describe("public verification", () => {
  test("non-UUID token -> 400 invalid", async () => {
    const res = await call("/verify/not-a-token");
    assert.equal(res.status, 400);
    assert.equal((await res.json()).status, "invalid");
  });
});

describe("helpers", () => {
  test("escapeHtml neutralises markup", () => {
    assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#039;&amp;");
  });

  test("email templates escape user input", () => {
    const { html } = templates.deleteOtpEmail({
      certificate: { id: 1, certificate_no: "C-1", recipient_name: "<script>x</script>", course_name: "c" },
      otp: "123456",
      minutes: 5,
    });
    assert.ok(!html.includes("<script>"));
  });

  test("impossible dates are rejected", () => {
    assert.equal(parseOptionalDate("2026-02-28"), "2026-02-28");
    assert.throws(() => parseOptionalDate("2026-02-31"));
    assert.equal(parseOptionalDate(""), null);
  });

  test("parseId only accepts positive integers", () => {
    assert.equal(parseId("42"), 42);
    for (const bad of ["0", "-1", "1.5", "abc", "", "99999999999999999999"]) {
      assert.throws(() => parseId(bad));
    }
  });

  test("session tokens: wrong role is rejected", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const token = jwt.sign({ sub: "7", role: "employee" }, process.env.JWT_SECRET, {
      issuer: "certificate-api",
      audience: "certificate-employee",
    });
    assert.equal(readSessionUserId(token, "employee"), 7);
    assert.equal(readSessionUserId(token, "admin"), null);
  });

  test("cookie header parsing", () => {
    assert.deepEqual(parseCookieHeader("a=1; b=hello%20world"), { a: "1", b: "hello world" });
  });
});
