// ============================================================
// utils/passwords.js — password hashing helpers
// ============================================================
//
// We use `bcryptjs` everywhere (the project previously used BOTH `bcrypt`
// and `bcryptjs`). bcryptjs is pure JavaScript, so it installs cleanly on
// Vercel / any OS, and its hashes are compatible with `bcrypt`, so
// existing passwords keep working.
// ============================================================

import bcrypt from "bcryptjs";

// A real bcrypt hash of a random string. Used only to burn the same CPU
// time when the user does not exist (see verifyPasswordOrDummy).
const DUMMY_HASH = "$2b$12$Lyr.Zhjg/ew1BBu8RDtLJ.nkWcMlsAe4Bhq31mQw5l4iFtmL1/KKS";

/**
 * Compare a password with a stored hash.
 *
 * TIMING ATTACK PREVENTION: if we returned immediately when the email is
 * unknown, "unknown email" responses would be ~250 ms faster than "wrong
 * password" responses, and an attacker could list valid emails. So when
 * there is no hash we still run bcrypt against a dummy hash.
 *
 * @param {string} password
 * @param {string | null | undefined} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPasswordOrDummy(password, hash) {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}
