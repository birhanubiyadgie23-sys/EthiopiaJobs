import { sql } from "./_lib/db.js";
import { requireAdmin } from "./_lib/admin-auth.js";

const DEFAULTS = {
  site_name_am: "ኢትዮጵያ ሥራዎች",
  site_name_en: "Ethiopia Jobs",
  tagline_am: "የሥራ ዕድሎችን በአንድ ቦታ",
  tagline_en: "Find opportunities in one place",
  contact_email: "",
  contact_phone: "",
  logo_url: "",
  default_language: "am",
  primary_color: "#123b66",
  accent_color: "#d9ac48"
};

async function ensureTables() {
  // Neon HTTP queries execute one SQL statement at a time.
  // Keep each CREATE TABLE in its own tagged query.
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by BIGINT REFERENCES admins(id) ON DELETE SET NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS site_settings_revisions (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      settings JSONB NOT NULL,
      changed_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function readSettings() {
  const rows = await sql`SELECT setting_key, setting_value FROM site_settings`;
  const settings = { ...DEFAULTS };
  for (const row of rows) settings[row.setting_key] = row.setting_value;
  return settings;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureTables();

    if (req.method === "GET") {
      const settings = await readSettings();
      return res.status(200).json({ ok: true, data: settings });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;


    const body = req.body || {};
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: "Invalid settings" });
    }

    const allowed = Object.keys(DEFAULTS);
    const clean = {};
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "string" || body[key].length > 2000) {
        return res.status(400).json({ ok: false, error: `Invalid value for ${key}` });
      }
      clean[key] = body[key].trim();
    }
    if (clean.default_language && !["am", "en"].includes(clean.default_language)) {
      return res.status(400).json({ ok: false, error: "Invalid default language" });
    }
    for (const key of ["logo_url"]) {
      if (clean[key] && !/^https:\/\//i.test(clean[key])) {
        return res.status(400).json({ ok: false, error: "Logo URL must use HTTPS" });
      }
    }
    for (const key of ["primary_color", "accent_color"]) {
      if (clean[key] && !/^#[0-9a-fA-F]{6}$/.test(clean[key])) {
        return res.status(400).json({ ok: false, error: "Colors must be six-digit hex values" });
      }
    }

    const previous = await readSettings();
    const next = { ...previous, ...clean };
    await sql`
      INSERT INTO site_settings_revisions (settings, changed_by)
      VALUES (${JSON.stringify(previous)}::jsonb, ${admin.id})
    `;
    for (const [key, value] of Object.entries(clean)) {
      await sql`
        INSERT INTO site_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${admin.id}, NOW())
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
      `;
    }
    return res.status(200).json({ ok: true, data: next });
  } catch (error) {
    console.error("Site settings API error:", error?.message || error);
    return res.status(500).json({ ok: false, error: "Unable to process site settings" });
  }
}
