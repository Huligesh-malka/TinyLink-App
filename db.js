// backend/db.js (ES module)
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // for many hosted Postgres (Neon) set ssl config; comment out if unneeded
  ssl: { rejectUnauthorized: false }
});
