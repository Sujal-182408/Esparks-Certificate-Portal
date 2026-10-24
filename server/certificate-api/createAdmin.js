
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcrypt";
import pool from "./db.js";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question("Enter admin email: "))
      .trim()
      .toLowerCase();
    const password = await rl.question(
      "Enter admin password (minimum 12 characters): "
    );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error(
        "Password must contain at least 12 characters and no more than 72 UTF-8 bytes for this setup."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );

    if (result.rowCount === 0) {
      console.log("An account with this email may already exist.");
    } else {
      console.log("Admin account created successfully:");
      console.log(result.rows[0]);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Could not create admin:", error.message);
  process.exitCode = 1;
});
