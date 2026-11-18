
import { sql } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const data = await sql`
      SELECT
        id,
        name_am,
        name_en,
        website_url,
        is_active,
        created_at
      FROM newspapers
      ORDER BY id ASC
    `;

    return res.status(200).json({
      ok: true,
      data
    });
  } catch (error) {
    console.error("Newspapers API error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Failed to fetch newspapers"
    });
  }
}
