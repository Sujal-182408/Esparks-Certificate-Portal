import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

console.log("Using Neon serverless PostgreSQL");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool