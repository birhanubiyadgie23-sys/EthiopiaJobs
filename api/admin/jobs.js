
import { sql } from "../_lib/db.js";
import { requireAdmin } from "../_lib/admin-auth.js";

function requiredText(value, maxLength) {
  if (typeof value !== "string") return null;

  const text = value.trim();

  if (!text || text.length > maxLength) return null;

  return text;
}

function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === "") {
    return { value: null, valid: true };
  }

  if (typeof value !== "string") {
    return { value: null, valid: false };
  }

  const text = value.trim();

  if (text.length > maxLength) {
    return { value: null, valid: false };
  }

  return {
    value: text || null,
    valid: true
  };
}

function optionalId(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null, valid: true };
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return { value: null, valid: false };
  }

  return { value: id, valid: true };
}

function optionalDate(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null, valid: true };
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return { value: null, valid: false };
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return { value: null, valid: false };
  }

  return { value, valid: true };
}

function optionalUrl(value) {
  const result = optionalText(value, 2000);

  if (!result.valid || !result.value) {
    return result;
  }

  try {
    const url = new URL(result.value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return { value: null, valid: false };
    }

    return result;
  } catch {
    return { value: null, valid: false };
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const admin = await requireAdmin(req, res);

    if (!admin) return;

    const body = req.body || {};

    const titleAm = requiredText(body.title_am, 250);
    const organizationName = requiredText(
      body.organization_name,
      250
    );

    if (!titleAm || !organizationName) {
      return res.status(400).json({
        ok: false,
        error: "Amharic job title and organization name are required"
      });
    }

    const fields = {
      title_en: optionalText(body.title_en, 250),
      description_am: optionalText(body.description_am, 20000),
      description_en: optionalText(body.description_en, 20000),
      requirements_am: optionalText(body.requirements_am, 15000),
      requirements_en: optionalText(body.requirements_en, 15000),
      employment_type: optionalText(body.employment_type, 100),
      education_level: optionalText(body.education_level, 150),
      application_method_am: optionalText(
        body.application_method_am, 5000
      ),
      application_method_en: optionalText(
        body.application_method_en, 5000
      ),
      application_phone: optionalText(body.application_phone, 80),
      source_reference: optionalText(body.source_reference, 2000)
    };

    for (const field of Object.values(fields)) {
      if (!field.valid) {
        return res.status(400).json({
          ok: false,
          error: "One or more text fields are invalid or too long"
        });
      }
    }

    const applicationUrl = optionalUrl(body.application_url);

    if (!applicationUrl.valid) {
      return res.status(400).json({
        ok: false,
        error: "Invalid application URL"
      });
    }

    const applicationEmail = optionalText(
      body.application_email,
      254
    );

    if (
      !applicationEmail.valid ||
      (
        applicationEmail.value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          applicationEmail.value
        )
      )
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid application email"
      });
    }

    const category = optionalId(body.category_id);
    const location = optionalId(body.location_id);

    if (!category.valid || !location.valid) {
      return res.status(400).json({
        ok: false,
        error: "Invalid category or location"
      });
    }

    const publishedDate = optionalDate(body.published_at);
    const deadlineDate = optionalDate(body.deadline_at);

    if (!publishedDate.valid || !deadlineDate.valid) {
      return res.status(400).json({
        ok: false,
        error: "Invalid publication or deadline date"
      });
    }

    let experienceYears = null;

    if (
      body.experience_years !== undefined &&
      body.experience_years !== null &&
      body.experience_years !== ""
    ) {
      experienceYears = Number(body.experience_years);

      if (
        !Number.isFinite(experienceYears) ||
        experienceYears < 0 ||
        experienceYears > 80
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid experience years"
        });
      }
    }

    if (category.value !== null) {
      const categories = await sql`
        SELECT id
        FROM categories
        WHERE id = ${category.value}
          AND is_active = true
        LIMIT 1
      `;

      if (categories.length !== 1) {
        return res.status(400).json({
          ok: false,
          error: "Selected category does not exist or is inactive"
        });
      }
    }

    if (location.value !== null) {
      const locations = await sql`
        SELECT id
        FROM locations
        WHERE id = ${location.value}
        LIMIT 1
      `;

      if (locations.length !== 1) {
        return res.status(400).json({
          ok: false,
          error: "Selected location does not exist"
        });
      }
    }

    const result = await sql`
      INSERT INTO jobs (
        title_am,
        title_en,
        organization_name,
        description_am,
        description_en,
        requirements_am,
        requirements_en,
        category_id,
        location_id,
        employment_type,
        education_level,
        experience_years,
        published_at,
        deadline_at,
        application_method_am,
        application_method_en,
        application_url,
        application_email,
        application_phone,
        source_reference,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${titleAm},
        ${fields.title_en.value},
        ${organizationName},
        ${fields.description_am.value},
        ${fields.description_en.value},
        ${fields.requirements_am.value},
        ${fields.requirements_en.value},
        ${category.value},
        ${location.value},
        ${fields.employment_type.value},
        ${fields.education_level.value},
        ${experienceYears},
        ${publishedDate.value},
        ${deadlineDate.value},
        ${fields.application_method_am.value},
        ${fields.application_method_en.value},
        ${applicationUrl.value},
        ${applicationEmail.value},
        ${fields.application_phone.value},
        ${fields.source_reference.value},
        'draft',
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title_am,
        organization_name,
        status,
        created_at
    `;

    return res.status(201).json({
      ok: true,
      message: "Job created successfully as a draft",
      data: result[0]
    });

  } catch (error) {
    console.error("Admin jobs API error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
