import { sql } from "./_lib/db.js";

function queryValue(value, fallback = "") {
  const first = Array.isArray(value) ? value[0] : value;
  return first == null ? fallback : String(first);
}

function positiveInteger(value, fallback, maximum) {
  const raw = queryValue(value, String(fallback));
  if (!/^\d+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const q = queryValue(req.query?.q).trim().slice(0, 120);
    const location = queryValue(req.query?.location).trim().slice(0, 100);
    const page = positiveInteger(req.query?.page, 1, 10000);
    const limit = positiveInteger(req.query?.limit, 10, 50);
    const offset = (page - 1) * limit;

    const conditions = [
      "j.status = 'published'",
      "(j.deadline_at IS NULL OR j.deadline_at >= CURRENT_DATE)"
    ];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      const index = params.length;
      conditions.push(`(
        j.title_am ILIKE $${index}
        OR j.title_en ILIKE $${index}
        OR j.organization_name ILIKE $${index}
        OR j.description_am ILIKE $${index}
        OR j.description_en ILIKE $${index}
      )`);
    }

    if (location) {
      params.push(`%${location}%`);
      const index = params.length;
      conditions.push(`(
        l.city_am ILIKE $${index}
        OR l.city_en ILIKE $${index}
        OR l.region_am ILIKE $${index}
        OR l.region_en ILIKE $${index}
      )`);
    }

    const whereSql = conditions.join(" AND ");

    // The Neon HTTP driver's default result is an array of row objects.
    const countRows = await sql.query(
      `SELECT COUNT(*)::int AS total
       FROM jobs j
       LEFT JOIN locations l ON l.id = j.location_id
       WHERE ${whereSql}`,
      params
    );

    const rows = await sql.query(
      `SELECT
         j.id,
         j.title_am,
         j.title_en,
         j.organization_name,
         j.description_am,
         j.description_en,
         j.employment_type,
         j.education_level,
         j.experience_years,
         j.published_at,
         j.deadline_at,
         c.name_am AS category_am,
         c.name_en AS category_en,
         l.city_am,
         l.city_en,
         l.region_am,
         l.region_en
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       LEFT JOIN locations l ON l.id = j.location_id
       WHERE ${whereSql}
       ORDER BY j.published_at DESC NULLS LAST, j.created_at DESC, j.id DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = Number(countRows[0]?.total || 0);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json({
      ok: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Jobs list failed:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to load jobs" });
  }
}
