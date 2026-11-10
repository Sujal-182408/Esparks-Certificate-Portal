// ============================================================
// services/passwordResetService.js — "forgot password" for both roles
// ============================================================
//
// Admins and employees had two copy-pasted implementations of this flow.
// It is now one implementation, parameterised by `userType`.
//
// SECURITY DESIGN
// ---------------
// 1. The reset token is 32 random bytes (unguessable).
// 2. Only a SHA-256 HASH of the token is stored. If the database leaks,
//    the attacker still cannot use the tokens. (Same idea as passwords.)
// 3. Tokens expire after 30 minutes and can be used once.
// 4. "Forgot password" ALWAYS returns the same message whether or not the
//    email exists, so attackers can't discover which emails are registered.
// ============================================================

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pool, { withTransaction } from "../config/db.js";
import { badRequest } from "../utils/httpError.js";
import { isValidPassword, PASSWORD_RULE_MESSAGE } from "../utils/validation.js";
import { sendEmailSafely } from "./mailer.js";
import { links, passwordResetEmail } from "./emailTemplates.js";

export const RESET_TOKEN_MINUTES = 30;
export const BCRYPT_ROUNDS = 12;

// Table + columns per user type. These are constants (never user input),
// so it is safe to put them into the SQL string.
const USER_TABLES = {
  admin: { table: "admin_users", nameColumn: "email", activeFilter: "AND role = 'admin'" },
  employee: { table: "employee_users", nameColumn: "name", activeFilter: "" },
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Create a reset token and email it — silently does nothing if the
 * account doesn't exist or is inactive (see point 4 above).
 */
export async function requestPasswordReset(userType, email) {
  if (!email || email.length > 254) return;

  const { table, nameColumn, activeFilter } = USER_TABLES[userType];
  const { rows } = await pool.query(
    `SELECT id, email, ${nameColumn} AS display_name
       FROM ${table}
      WHERE LOWER(email) = $1 AND is_active = TRUE ${activeFilter}
      LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await withTransaction(async (client) => {
    // Only the newest link should work.
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
        WHERE user_type = $1 AND user_id = $2 AND used_at IS NULL`,
      [userType, user.id],
    );
    await client.query(
      `INSERT INTO password_reset_tokens (user_type, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
      [userType, user.id, tokenHash, RESET_TOKEN_MINUTES],
    );
  });

  const sent = await sendEmailSafely({
    to: user.email,
    ...passwordResetEmail({
      name: user.display_name,
      resetUrl: links.passwordReset(token, userType),
      minutes: RESET_TOKEN_MINUTES,
      isAdmin: userType === "admin",
    }),
  });

  // An email that never arrived must not leave a usable token behind.
  if (!sent) {
    await pool.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`, [
      tokenHash,
    ]);
  }
}

/** Validate the token and set the new password. Throws HttpError(400) on bad input. */
export async function resetPassword(userType, token, password) {
  if (!token || typeof password !== "string") {
    throw badRequest("Reset token and new password are required.");
  }
  if (!isValidPassword(password)) throw badRequest(PASSWORD_RULE_MESSAGE);

  // Hash BEFORE opening the transaction: bcrypt is slow (on purpose) and
  // we don't want to hold a database lock while it runs.
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { table } = USER_TABLES[userType];

  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, user_id
         FROM password_reset_tokens
        WHERE token_hash = $1 AND user_type = $2
          AND used_at IS NULL AND expires_at > NOW()
        FOR UPDATE`,
      [hashToken(String(token).trim()), userType],
    );
    if (rows.length === 0) throw badRequest("Invalid or expired password reset link.");

    const userId = rows[0].user_id;
    await client.query(`UPDATE ${table} SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
    // Invalidate every outstanding link for this user.
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
        WHERE user_type = $1 AND user_id = $2 AND used_at IS NULL`,
      [userType, userId],
    );
  });
}
