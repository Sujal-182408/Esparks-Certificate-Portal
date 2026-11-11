// ============================================================
// services/certificateService.js — issue, edit, revoke and delete certificates
// ============================================================
//
// LAYERING (how this project is organised)
// ----------------------------------------
//   routes/*.routes.js   -> HTTP only: read req, call a service, send res.
//   services/*.js        -> business rules + SQL. No `req`/`res` here.
//   utils/*.js           -> tiny generic helpers (validation, escaping).
//
// Keeping business rules out of the routes means they can be reused
// (e.g. from a script) and read without HTTP noise.
//
// CERTIFICATE LIFECYCLE
// ---------------------
//   employee request (pending)
//        │  admin reviews on "Create Certificate" page
//        ├──► issueCertificate()  -> certificate "issued", request "issued"
//        └──► rejectRequest()     -> request "rejected"  (certificateRequestService)
//   issued certificate
//        ├──► revokeCertificate() -> "revoked" (stays verifiable as revoked)
//        └──► deleteCertificate() -> removed (requires email OTP)
// ============================================================

import crypto from "node:crypto";
import pool, { withTransaction } from "../config/db.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { badRequest, conflict, HttpError, notFound } from "../utils/httpError.js";
import { writeAuditLog } from "./auditLog.js";
import { createNotification, pushNotification } from "./notificationService.js";
import { sendEmail, sendEmailSafely } from "./mailer.js";
import * as templates from "./emailTemplates.js";
import { sendAccountStatusEmails } from "./employeeService.js";

// Columns that are safe to return to an admin.
const CERTIFICATE_COLUMNS = `
  c.id, c.certificate_no, c.certificate_type, c.employee_id, c.recipient_name,
  c.course_name, c.issuer_name, c.issue_date, c.verification_token, c.status,
  c.created_at, c.revoked_at`;

// ------------------------------------------------------------
// Read
// ------------------------------------------------------------

export async function listCertificates() {
  const { rows } = await pool.query(
    `SELECT ${CERTIFICATE_COLUMNS},
            cr.duration_months,
            e.name AS employee_name, e.email AS employee_email
       FROM certificates c
       LEFT JOIN employee_users e ON e.id = c.employee_id
       LEFT JOIN certificate_requests cr ON cr.certificate_id = c.id
      ORDER BY c.issue_date DESC, c.id DESC`,
  );
  return rows;
}

export async function getCertificateById(id) {
  const { rows } = await pool.query(
    `SELECT ${CERTIFICATE_COLUMNS},
            cr.duration_months,
            e.name AS employee_name, e.email AS employee_email
       FROM certificates c
       LEFT JOIN employee_users e ON e.id = c.employee_id
       LEFT JOIN certificate_requests cr ON cr.certificate_id = c.id
      WHERE c.id = $1`,
    [id],
  );
  if (rows.length === 0) throw notFound("Certificate not found.");
  return rows[0];
}

// ------------------------------------------------------------
// Certificate numbers:  EITS-CERT-2026-1002, EITS-INTR-2026-1003 ...
// ------------------------------------------------------------

/**
 * Reserve the next certificate number INSIDE the issuing transaction.
 *
 * `certificate_number_sequences` holds one row per (type, year). The
 * INSERT ... ON CONFLICT DO UPDATE locks that row, so two admins issuing
 * at the same moment can never get the same number.
 *
 * The number is also never lower than (highest existing number + 1), so
 * certificates created before the sequence table existed are respected.
 */
async function reserveCertificateNumber(client, certificateType) {
  const year = new Date().getFullYear();
  const prefix = `EITS-${certificateType}-${year}`;

  // Note: $1 and $4 carry the same value. PostgreSQL needs separate
  // parameters because one is used as the column's own type and the other
  // is compared as text.
  //
  // How it works:
  //   seed   = max(1002, highest existing number + 1)
  //   insert : store seed + 1, hand out seed
  //   update : hand out max(stored, seed), store that + 1
  //   (EXCLUDED.next_number is the value we tried to insert = seed + 1)
  const { rows } = await client.query(
    `INSERT INTO certificate_number_sequences (certificate_type, certificate_year, next_number)
     VALUES (
       $1,
       $2,
       (SELECT GREATEST(1002, COALESCE(MAX(substring(certificate_no FROM '[0-9]+$')::integer) + 1, 1002))
          FROM certificates
         WHERE certificate_type::text = $4::text AND certificate_no LIKE $3) + 1
     )
     ON CONFLICT (certificate_type, certificate_year) DO UPDATE
       SET next_number = GREATEST(
             certificate_number_sequences.next_number,
             EXCLUDED.next_number - 1
           ) + 1
     RETURNING next_number - 1 AS number`,
    [certificateType, year, `${prefix}-%`, certificateType],
  );

  return `${prefix}-${rows[0].number}`;
}

// ------------------------------------------------------------
// Issue (create) a certificate from a pending request
// ------------------------------------------------------------

/**
 * @param {{ requestId: number, certificateType: string, courseName: string,
 *           issuerName: string, issueDate: string|null,
 *           durationMonths: number|null }} input  already validated
 * @param {{ email: string }} admin
 */

export async function issueCertificate(input, admin) {
  const { certificate, request, notification, employee } = await withTransaction(async (client) => {
    // FOR UPDATE locks the request row: if two admins click "Issue" at the
    // same time, the second one waits and then sees status = 'issued'.
    const { rows } = await client.query(
      `SELECT cr.id, cr.employee_id, cr.status, cr.certificate_id,
              e.name AS employee_name, e.email AS employee_email, e.is_active
         FROM certificate_requests cr
         JOIN employee_users e ON e.id = cr.employee_id
        WHERE cr.id = $1
        FOR UPDATE OF cr`,
      [input.requestId],
    );
    const pending = rows[0];

    if (!pending) throw notFound("Certificate request not found.");
    if (pending.status === "issued" || pending.certificate_id) {
      throw conflict("This certificate request has already been issued.", {
        certificateId: pending.certificate_id || null,
      });
    }
    if (pending.status !== "pending") {
      throw conflict(
        `This certificate request cannot be issued because its current status is "${pending.status}".`,
      );
    }
    if (!pending.is_active) throw badRequest("The employee account is inactive.");

    const certificateNo = await reserveCertificateNumber(client, input.certificateType);

    // The recipient name always comes from the database, never from the
    // browser, so an admin cannot accidentally issue to the wrong person.
    const inserted = await client.query(
      `INSERT INTO certificates
         (certificate_no, certificate_type, employee_id, recipient_name,
          course_name, issuer_name, issue_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), 'issued')
       RETURNING id, certificate_no, certificate_type, employee_id, recipient_name,
                 course_name, issuer_name, issue_date, verification_token, status,
                 created_at, revoked_at`,
      [
        certificateNo,
        input.certificateType,
        pending.employee_id,
        pending.employee_name,
        input.courseName,
        input.issuerName,
        input.issueDate,
      ],
    );
    const newCertificate = inserted.rows[0];

 // Save the experience duration on the certificate request.
// CERT and INTR retain their existing duration values.
// EXPR receives the duration entered by the admin in total months.
const updated = await client.query(
  `UPDATE certificate_requests
      SET status = 'issued',
          certificate_id = $1,
          reviewed_at = NOW(),
          issued_at = NOW(),
          duration_months = CASE
            WHEN $3::integer IS NOT NULL THEN $3::integer
            ELSE duration_months
          END
    WHERE id = $2 AND status = 'pending'
    RETURNING *`,
  [
    newCertificate.id,
    input.requestId,
    input.certificateType === "EXPR"
      ? input.durationMonths
      : null,
  ],
);

    await writeAuditLog(client, {
      action: "CERTIFICATE_CREATED",
      performedBy: admin.email,
      certificateId: newCertificate.id,
      details: {
        certificate_no: newCertificate.certificate_no,
        employee_id: pending.employee_id,
        request_id: input.requestId,
      },
    });

    const savedNotification = await createNotification(client, {
      recipientType: "employee",
      recipientId: pending.employee_id,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate Issued",
      message: `Your ${input.certificateType} certificate for "${input.courseName}" has been issued. Certificate number: ${newCertificate.certificate_no}.`,
      certificateRequestId: input.requestId,
      certificateId: newCertificate.id,
    });

    return {
      certificate: newCertificate,
      request: updated.rows[0],
      notification: savedNotification,
      employee: { name: pending.employee_name, email: pending.employee_email },
    };
  });

  // ---- After COMMIT: side effects that must not undo the issuance ----
  pushNotification(notification);
  await sendEmailSafely({
    to: employee.email,
    ...templates.certificateIssuedEmail({
      employeeName: employee.name,
      courseName: certificate.course_name,
      certificateNo: certificate.certificate_no,
      verificationToken: certificate.verification_token,
    }),
  });

  return { certificate, request };
}

// ------------------------------------------------------------
// Edit
// ------------------------------------------------------------

/**
 * Partial update: a field that is `null` keeps its current value.
 * The change is recorded in the audit log (old vs new values).
 */
export async function updateCertificate(id, changes, admin) {
  return withTransaction(async (client) => {
    const before = await client.query(
      `SELECT course_name, issuer_name, recipient_name, issue_date
         FROM certificates WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (before.rows.length === 0) throw notFound("Certificate not found.");

    const { rows } = await client.query(
      `UPDATE certificates
          SET course_name    = COALESCE($1, course_name),
              issuer_name    = COALESCE($2, issuer_name),
              recipient_name = COALESCE($3, recipient_name),
              issue_date     = COALESCE($4::date, issue_date)
        WHERE id = $5
        RETURNING id, certificate_no, certificate_type, employee_id, recipient_name,
                  course_name, issuer_name, issue_date, verification_token, status,
                  created_at, revoked_at`,
      [changes.courseName, changes.issuerName, changes.recipientName, changes.issueDate, id],
    );

    await writeAuditLog(client, {
      action: "CERTIFICATE_UPDATED",
      performedBy: admin.email,
      certificateId: id,
      details: { before: before.rows[0], changes },
    });

    return rows[0];
  });
}

// ------------------------------------------------------------
// Revoke
// ------------------------------------------------------------

/**
 * Mark a certificate as revoked. Optionally deactivate the employee too.
 * A revoked certificate still exists, so public verification can say
 * "REVOKED" instead of "not found".
 */
export async function revokeCertificate(id, { reason, deactivateEmployee }, admin) {
  const result = await withTransaction(async (client) => {
    const found = await client.query(
      `SELECT c.id, c.certificate_no, c.employee_id, c.status,
              e.name AS employee_name, e.email AS employee_email, e.is_active AS employee_active
         FROM certificates c
         LEFT JOIN employee_users e ON e.id = c.employee_id
        WHERE c.id = $1
        FOR UPDATE OF c`,
      [id],
    );
    const existing = found.rows[0];

    if (!existing) throw notFound("Certificate not found.");
    if (existing.status === "revoked") throw conflict("Certificate is already revoked.");

    const updated = await client.query(
      `UPDATE certificates SET status = 'revoked', revoked_at = NOW()
        WHERE id = $1
        RETURNING id, certificate_no, status, revoked_at`,
      [id],
    );

    const willDeactivate = Boolean(
      deactivateEmployee && existing.employee_id && existing.employee_active,
    );
    if (willDeactivate) {
      await client.query(`UPDATE employee_users SET is_active = FALSE WHERE id = $1`, [
        existing.employee_id,
      ]);
    }

    await writeAuditLog(client, {
      action: "CERTIFICATE_REVOKED",
      performedBy: admin.email,
      certificateId: id,
      details: {
        reason,
        certificate_no: existing.certificate_no,
        employee_id: existing.employee_id,
        employee_deactivated: willDeactivate,
      },
    });

    const notification = existing.employee_id
      ? await createNotification(client, {
          recipientType: "employee",
          recipientId: existing.employee_id,
          type: "CERTIFICATE_REVOKED",
          title: "Certificate Revoked",
          message: `Your certificate ${existing.certificate_no} has been revoked by the administrator. Reason: ${reason}`,
          certificateId: id,
        })
      : null;

    return { existing, certificate: updated.rows[0], willDeactivate, notification };
  });

  // ---- After COMMIT ----
  const { existing, certificate, willDeactivate, notification } = result;
  pushNotification(notification);

  const emails = { employeeEmailSent: false, adminEmailSent: false };
  const [employeeSent, adminSent] = await Promise.all([
    existing.employee_email
      ? sendEmailSafely({
          to: existing.employee_email,
          ...templates.certificateRevokedEmployeeEmail({
            employeeName: existing.employee_name,
            certificateNo: existing.certificate_no,
            reason,
          }),
        })
      : false,
    ADMIN_EMAIL
      ? sendEmailSafely({
          to: ADMIN_EMAIL,
          ...templates.certificateRevokedAdminEmail({
            employeeName: existing.employee_name,
            employeeEmail: existing.employee_email,
            certificateNo: existing.certificate_no,
            reason,
            revokedBy: admin.email,
            employeeDeactivated: willDeactivate,
          }),
        })
      : false,
  ]);
  emails.employeeEmailSent = employeeSent;
  emails.adminEmailSent = adminSent;

  if (willDeactivate) {
    // Only the employee gets this one — the admin email above already
    // says whether the account was deactivated.
    await sendAccountStatusEmails(
      { name: existing.employee_name, email: existing.employee_email },
      false,
      admin.email,
      { notifyAdmin: false },
    );
  }

  return { certificate, employeeDeactivated: willDeactivate, emailNotifications: emails };
}

// ------------------------------------------------------------
// Permanent delete (two steps: request OTP, then confirm with OTP)
// ------------------------------------------------------------
//
// Deleting is destructive, so the admin must prove control of their
// mailbox. Only a hash of the OTP is stored, it expires after 5 minutes,
// allows 5 attempts and can be used once.

const OTP_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (challengeId, otp) =>
  crypto.createHash("sha256").update(`${challengeId}:${otp}`).digest("hex");

export async function requestDeleteOtp(certificateId, admin) {
  const found = await pool.query(
    `SELECT id, certificate_no, recipient_name, course_name FROM certificates WHERE id = $1`,
    [certificateId],
  );
  const certificate = found.rows[0];
  if (!certificate) throw notFound("Certificate not found.");

  // Throttle: one OTP per minute per admin per certificate.
  const previous = await pool.query(
    `SELECT last_sent_at FROM certificate_delete_otps
      WHERE admin_id = $1 AND certificate_id = $2
        AND consumed_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1`,
    [admin.id, certificateId],
  );
  if (previous.rows.length) {
    const elapsed = Date.now() - new Date(previous.rows[0].last_sent_at).getTime();
    const wait = Math.ceil((OTP_RESEND_SECONDS * 1000 - elapsed) / 1000);
    if (wait > 0) {
      throw new HttpError(429, `Please wait ${wait} seconds before requesting another OTP.`);
    }
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const challengeId = crypto.randomUUID();

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE certificate_delete_otps SET consumed_at = NOW()
        WHERE admin_id = $1 AND certificate_id = $2 AND consumed_at IS NULL`,
      [admin.id, certificateId],
    );
    await client.query(
      `INSERT INTO certificate_delete_otps
         (id, admin_id, admin_email, certificate_id, otp_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(mins => $6))`,
      [challengeId, admin.id, admin.email, certificateId, hashOtp(challengeId, otp), OTP_MINUTES],
    );
  });

  try {
    // Must succeed: without the email the admin cannot continue.
    await sendEmail({ to: admin.email, ...templates.deleteOtpEmail({ certificate, otp, minutes: OTP_MINUTES }) });
  } catch (error) {
    await pool.query(`UPDATE certificate_delete_otps SET consumed_at = NOW() WHERE id = $1`, [challengeId]);
    console.error("[DELETE OTP] Email failed:", error.message);
    throw new HttpError(502, "Could not send the verification email. Please try again.");
  }

  return {
    message: `Verification OTP sent to ${admin.email}.`,
    challengeId,
    expiresIn: OTP_MINUTES * 60,
    resendAfter: OTP_RESEND_SECONDS,
  };
}

export async function confirmDelete(certificateId, { challengeId, otp }, admin) {
  // IMPORTANT PATTERN: some failures (wrong OTP, expired) must still SAVE
  // something (the attempt counter / consumed flag). If we threw inside
  // the transaction, `withTransaction` would roll that back. So inside we
  // RETURN the error, let the transaction commit, and throw afterwards.
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM certificate_delete_otps
        WHERE id = $1 AND admin_id = $2 AND certificate_id = $3
        FOR UPDATE`,
      [challengeId, admin.id, certificateId],
    );
    const record = rows[0];
    const consume = () =>
      client.query(`UPDATE certificate_delete_otps SET consumed_at = NOW() WHERE id = $1`, [challengeId]);

    if (!record) return { error: badRequest("Invalid verification request. Please request a new OTP.") };
    if (record.consumed_at) return { error: badRequest("This OTP has already been used. Request a new OTP.") };
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await consume();
      return { error: badRequest("OTP has expired. Please request a new OTP.") };
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await consume();
      return { error: new HttpError(429, "Maximum OTP attempts reached. Request a new OTP.") };
    }

    // timingSafeEqual: comparison time does not reveal how many characters matched.
    const expected = Buffer.from(record.otp_hash, "hex");
    const actual = Buffer.from(hashOtp(challengeId, otp), "hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      const attempts = record.attempts + 1;
      await client.query(
        `UPDATE certificate_delete_otps
            SET attempts = $1,
                consumed_at = CASE WHEN $1 >= $3 THEN NOW() ELSE consumed_at END
          WHERE id = $2`,
        [attempts, challengeId, OTP_MAX_ATTEMPTS],
      );
      return {
        error:
          attempts >= OTP_MAX_ATTEMPTS
            ? new HttpError(429, "Maximum OTP attempts reached. Request a new OTP.")
            : badRequest(`Incorrect OTP. ${OTP_MAX_ATTEMPTS - attempts} attempts remaining.`),
      };
    }

    const found = await client.query(
      `SELECT id, certificate_no, certificate_type, employee_id, recipient_name,
              course_name, issuer_name, issue_date, status
         FROM certificates WHERE id = $1 FOR UPDATE`,
      [certificateId],
    );
    const certificate = found.rows[0];
    await consume();
    if (!certificate) return { error: notFound("Certificate not found.") };

    // Keep old audit rows but detach them (FK) before deleting.
    await client.query(`UPDATE certificate_audit_logs SET certificate_id = NULL WHERE certificate_id = $1`, [certificateId]);
    // certificate_requests / notifications reference it with ON DELETE SET NULL.
    await client.query(`DELETE FROM certificates WHERE id = $1`, [certificateId]);

    await writeAuditLog(client, {
      action: "CERTIFICATE_DELETED",
      performedBy: admin.email,
      certificateId: null,
      details: { ...certificate, previous_status: certificate.status, deleted_at: new Date().toISOString() },
    });

    return { certificate: { id: certificate.id, certificate_no: certificate.certificate_no } };
  });

  if (outcome.error) throw outcome.error;
  return outcome.certificate;
}

// ------------------------------------------------------------
// Public verification (QR code)
// ------------------------------------------------------------

/**
 * Look up a certificate by its public verification token.
 * Returns ONLY fields that are meant to be public — no internal IDs,
 * no employee ID, no email.
 */
export async function findCertificateForVerification(token) {
  const { rows } = await pool.query(
    `SELECT c.certificate_no, c.certificate_type, c.recipient_name, c.course_name,
            c.issuer_name, c.issue_date, c.verification_token, c.status,
            c.created_at, c.revoked_at, cr.duration_months
       FROM certificates c
       LEFT JOIN certificate_requests cr ON cr.certificate_id = c.id
      WHERE c.verification_token = $1
      LIMIT 1`,
    [token],
  );
  return rows[0] || null;
}
