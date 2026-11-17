import { sql } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await sql`SELECT 1`;
    return res.status(200).json({
      ok: true,
      service: "ethiopia-jobs-api",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error?.message || error);
    return res.status(503).json({
      ok: false,
      service: "ethiopia-jobs-api",
      database: "unavailable"
    });
  }
}
