import { sql } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const rows = await sql.query(
      `SELECT DISTINCT region_am, region_en, city_am, city_en
       FROM locations
       WHERE region_am IS NOT NULL
          OR region_en IS NOT NULL
          OR city_am IS NOT NULL
          OR city_en IS NOT NULL
       ORDER BY region_en NULLS LAST, city_en NULLS LAST`
    );

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, data: rows });
  } catch (error) {
    console.error("Locations request failed:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to load locations" });
  }
}
