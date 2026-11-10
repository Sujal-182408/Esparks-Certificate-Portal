// ============================================================
// scripts/createAdmin.js — create an administrator account
// ============================================================
//
//   npm run create-admin
//
// Admins cannot sign up through the website (on purpose). This script
// asks for an email and password in the terminal and stores a bcrypt
// hash — never the plain password.
// ============================================================

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { BCRYPT_ROUNDS } from "../services/passwordResetService.js";
import { isValidEmail, normalizeEmail } from "../utils/validation.js";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const email = normalizeEmail(await rl.question("Admin email: "));
    const password = await rl.question("Admin password (min 12 characters): ");

    if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("Password must be 12+ characters and at most 72 UTF-8 bytes.");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id, email, role, created_at`,
      [email, passwordHash],
    );

    console.log(
      result.rowCount === 0
        ? "An account with this email already exists."
        : `Admin account created: ${JSON.stringify(result.rows[0])}`,
    );
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Could not create admin:", error.message);
  process.exitCode = 1;
});
