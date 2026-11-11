// ============================================================
// services/auditLog.js — "who did what, when"
// ============================================================
//
// Every important admin action is recorded in `certificate_audit_logs`.
// For a certificate system this is essential: if someone asks "who
// revoked my certificate?" or "was this certificate edited?", the answer
// is in this table.
//
// Always write the audit entry inside the same transaction as the change.
//
// Action names used in this project:
//   CERTIFICATE_CREATED, CERTIFICATE_UPDATED, CERTIFICATE_REVOKED,
//   CERTIFICATE_DELETED, CERTIFICATE_REQUEST_CREATED,
//   CERTIFICATE_REQUEST_REJECTED, EMPLOYEE_STATUS_CHANGED
// ============================================================

/**
 * @param {{ query: Function }} client
 * @param {{ action: string, performedBy: string, certificateId?: number|null, details?: object }} entry
 */
export async function writeAuditLog(client, { action, performedBy, certificateId = null, details = {} }) {
  await client.query(
    `INSERT INTO certificate_audit_logs (certificate_id, action, performed_by, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [certificateId, action, performedBy || "admin", JSON.stringify(details)],
  );
}
