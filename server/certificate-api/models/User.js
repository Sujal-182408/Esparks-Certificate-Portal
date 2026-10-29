
import pool from "../db.js";

const User = {
  async create({ name, email, employeeId, password, role = "employee" }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, employee_id, password, role)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING id, name, email, employee_id, role, created_at, updated_at`,
      [name.trim(), email.trim(), employeeId.trim(), password, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, name, email, employee_id, password, role, created_at, updated_at
       FROM users
       WHERE email = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT id, name, email, employee_id, role, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }
};

export default User;
