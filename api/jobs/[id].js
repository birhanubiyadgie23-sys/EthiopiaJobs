import { sql } from "../_lib/db.js";

const MAX_BIGINT = 9223372036854775807n;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId ?? "");

  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > MAX_BIGINT) {
    return res.status(400).json({ ok: false, error: "Invalid job id" });
  }

  try {
    // Neon HTTP queries return rows directly unless fullResults is enabled.
    const jobs = await sql.query(
      `SELECT
         j.id,
         j.title_am,
         j.title_en,
         j.organization_name,
         j.description_am,
         j.description_en,
         j.requirements_am,
         j.requirements_en,
         j.employment_type,
         j.education_level,
         j.experience_years,
         j.published_at,
         j.deadline_at,
         j.application_method_am,
         j.application_method_en,
         j.application_url,
         j.application_email,
         j.application_phone,
         c.name_am AS category_am,
         c.name_en AS category_en,
         l.city_am,
         l.city_en,
         l.region_am,
         l.region_en
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       LEFT JOIN locations l ON l.id = j.location_id
       WHERE j.id = $1
         AND j.status = 'published'
         AND (j.deadline_at IS NULL OR j.deadline_at >= CURRENT_DATE)
       LIMIT 1`,
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }

    const sources = await sql.query(
      `SELECT
         n.name_am AS newspaper_am,
         n.name_en AS newspaper_en,
         x.edition_date,
         x.page_number,
         x.source_url,
         x.source_note
       FROM job_sources x
       LEFT JOIN newspapers n ON n.id = x.newspaper_id
       WHERE x.job_id = $1
       ORDER BY x.edition_date DESC NULLS LAST, x.id DESC`,
      [id]
    );

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      ok: true,
      data: { ...jobs[0], sources }
    });
  } catch (error) {
    console.error("Job detail failed:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to load job" });
  }
}
