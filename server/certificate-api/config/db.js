// ============================================================
// config/db.js — PostgreSQL connection pool (Neon serverless)
// ============================================================
//
// A *pool* keeps a few database connections open and lends them out.
//
//   pool.query(sql, params)   -> borrow + run + return automatically.
//                                Use for single statements.
//
//   const client = await pool.connect()
//                             -> borrow a connection you control.
//                                REQUIRED for transactions (BEGIN/COMMIT)
//                                because every statement of a transaction
//                                must run on the SAME connection.
//                                Always `client.release()` in `finally`.
//
// See `withTransaction` below, which does this safely for you.
// ============================================================

import { Pool } from "@neondatabase/serverless";
import { DATABASE_URL } from "./env.js";

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
});

pool.on("error", (error) => {
  console.error("[DB] Unexpected PostgreSQL pool error:", error.message);
});

/**
 * Run `work(client)` inside a database transaction.
 *
 * - COMMIT  if `work` finishes normally.
 * - ROLLBACK if `work` throws (nothing is half-saved).
 * - The connection is ALWAYS released.
 *
 * Before this helper existed, every route repeated ~20 lines of
 * BEGIN / transactionStarted / ROLLBACK / release code, and some routes
 * forgot to roll back on early `return`s.
 *
 * To stop early with an HTTP error, throw an `HttpError` (see
 * utils/httpError.js); the transaction is rolled back automatically and
 * the global error handler sends the response.
 *
 * @template T
 * @param {(client: import("@neondatabase/serverless").PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError) => {
      console.error("[DB] Rollback failed:", rollbackError.message);
    });
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
