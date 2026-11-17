import { sql } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const rows = await sql.query(
      `SELECT id, name_am, name_en, slug
       FROM categories
       WHERE is_active = TRUE
       ORDER BY name_en, id`
    );

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, data: rows });
  } catch (error) {
    console.error("Categories request failed:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to load categories" });
  }
}
