
import { sql } from "../_lib/db.js";
import { requireAdmin } from "../_lib/admin-auth.js";

// ==========================================
// VALIDATION HELPERS
// ==========================================

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

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { value: null, valid: false };
    }

    return {
      value: value.toISOString().slice(0, 10),
      valid: true
    };
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

function getValue(body, current, field) {
  if (Object.prototype.hasOwnProperty.call(body, field)) {
    return body[field];
  }

  return current ? current[field] : undefined;
}

function parseJobId(value) {
  const id = String(value ?? "");

  if (!/^[1-9]\d{0,18}$/.test(id)) {
    return null;
  }

  try {
    if (BigInt(id) > 9223372036854775807n) {
      return null;
    }
  } catch {
    return null;
  }

  return id;
}

function validEmail(value) {
  return (
    !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

// ==========================================
// JOB INPUT VALIDATION
// ==========================================

function parseJobInput(body, current = null) {
  const titleAm = requiredText(
    getValue(body, current, "title_am"),
    250
  );

  const organizationName = requiredText(
    getValue(body, current, "organization_name"),
    250
  );

  if (!titleAm || !organizationName) {
    return {
      ok: false,
      error: "Amharic job title and organization name are required"
    };
  }

  const fields = {
    title_en: optionalText(
      getValue(body, current, "title_en"), 250
    ),

    description_am: optionalText(
      getValue(body, current, "description_am"), 20000
    ),

    description_en: optionalText(
      getValue(body, current, "description_en"), 20000
    ),

    requirements_am: optionalText(
      getValue(body, current, "requirements_am"), 15000
    ),

    requirements_en: optionalText(
      getValue(body, current, "requirements_en"), 15000
    ),

    employment_type: optionalText(
      getValue(body, current, "employment_type"), 100
    ),

    education_level: optionalText(
      getValue(body, current, "education_level"), 150
    ),

    application_method_am: optionalText(
      getValue(body, current, "application_method_am"), 5000
    ),

    application_method_en: optionalText(
      getValue(body, current, "application_method_en"), 5000
    ),

    application_phone: optionalText(
      getValue(body, current, "application_phone"), 80
    ),

    source_reference: optionalText(
      getValue(body, current, "source_reference"), 2000
    ),

    application_email: optionalText(
      getValue(body, current, "application_email"), 254
    )
  };

  for (const field of Object.values(fields)) {
    if (!field.valid) {
      return {
        ok: false,
        error: "One or more text fields are invalid or too long"
      };
    }
  }

  if (!validEmail(fields.application_email.value)) {
    return {
      ok: false,
      error: "Invalid application email"
    };
  }

  const applicationUrl = optionalUrl(
    getValue(body, current, "application_url")
  );

  if (!applicationUrl.valid) {
    return {
      ok: false,
      error: "Invalid application URL"
    };
  }

  const category = optionalId(
    getValue(body, current, "category_id")
  );

  const location = optionalId(
    getValue(body, current, "location_id")
  );

  if (!category.valid || !location.valid) {
    return {
      ok: false,
      error: "Invalid category or location"
    };
  }

  const publishedDate = optionalDate(
    getValue(body, current, "published_at")
  );

  const deadlineDate = optionalDate(
    getValue(body, current, "deadline_at")
  );

  if (!publishedDate.valid || !deadlineDate.valid) {
    return {
      ok: false,
      error: "Invalid publication or deadline date"
    };
  }

  const rawExperience = getValue(
    body,
    current,
    "experience_years"
  );

  let experienceYears = null;

  if (
    rawExperience !== undefined &&
    rawExperience !== null &&
    rawExperience !== ""
  ) {
    experienceYears = Number(rawExperience);

    if (
      !Number.isFinite(experienceYears) ||
      experienceYears < 0 ||
      experienceYears > 80
    ) {
      return {
        ok: false,
        error: "Invalid experience years"
      };
    }
  }

  return {
    ok: true,
    data: {
      title_am: titleAm,
      title_en: fields.title_en.value,
      organization_name: organizationName,
      description_am: fields.description_am.value,
      description_en: fields.description_en.value,
      requirements_am: fields.requirements_am.value,
      requirements_en: fields.requirements_en.value,
      category_id: category.value,
      location_id: location.value,
      employment_type: fields.employment_type.value,
      education_level: fields.education_level.value,
      experience_years: experienceYears,
      published_at: publishedDate.value,
      deadline_at: deadlineDate.value,
      application_method_am: fields.application_method_am.value,
      application_method_en: fields.application_method_en.value,
      application_url: applicationUrl.value,
      application_email: fields.application_email.value,
      application_phone: fields.application_phone.value,
      source_reference: fields.source_reference.value
    }
  };
}

// ==========================================
// DATABASE REFERENCE VALIDATION
// ==========================================

async function validateReferences(data, current = null) {
  if (
    data.category_id !== null &&
    (
      !current ||
      String(data.category_id) !== String(current.category_id)
    )
  ) {
    const categories = await sql`
      SELECT id
      FROM categories
      WHERE id = ${data.category_id}
        AND is_active = true
      LIMIT 1
    `;

    if (categories.length !== 1) {
      return {
        ok: false,
        error: "Selected category does not exist or is inactive"
      };
    }
  }

  if (
    data.location_id !== null &&
    (
      !current ||
      String(data.location_id) !== String(current.location_id)
    )
  ) {
    const locations = await sql`
      SELECT id
      FROM locations
      WHERE id = ${data.location_id}
      LIMIT 1
    `;

    if (locations.length !== 1) {
      return {
        ok: false,
        error: "Selected location does not exist"
      };
    }
  }

  return { ok: true };
}

// ==========================================
// GET JOBS - ADMIN LIST
// ==========================================

async function getJobs(req, res) {
  const pageValue = Number(req.query?.page ?? 1);
  const limitValue = Number(req.query?.limit ?? 20);

  const page = Number.isSafeInteger(pageValue) && pageValue > 0
    ? pageValue
    : 1;

  const limit = Number.isSafeInteger(limitValue) && limitValue > 0
    ? Math.min(limitValue, 100)
    : 20;

  const offset = (page - 1) * limit;

  const allowedStatuses = [
    "draft",
    "pending_review",
    "published",
    "expired",
    "rejected"
  ];

  const rawStatus = req.query?.status;

  if (
    rawStatus !== undefined &&
    (
      typeof rawStatus !== "string" ||
      !allowedStatuses.includes(rawStatus)
    )
  ) {
    return res.status(400).json({
      ok: false,
      error: "Invalid status filter"
    });
  }

  let jobs;
  let countRows;

  if (rawStatus) {
    jobs = await sql`
      SELECT
        id,
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
      FROM jobs
      WHERE status = ${rawStatus}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    countRows = await sql`
      SELECT COUNT(*) AS total
      FROM jobs
      WHERE status = ${rawStatus}
    `;
  } else {
    jobs = await sql`
      SELECT
        id,
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
      FROM jobs
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    countRows = await sql`
      SELECT COUNT(*) AS total
      FROM jobs
    `;
  }

  const total = Number(countRows[0]?.total || 0);

  return res.status(200).json({
    ok: true,
    data: jobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

// ==========================================
// CREATE JOB - POST
// ==========================================

async function createJob(req, res) {
  const body = req.body || {};

  if (
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body"
    });
  }

  const parsed = parseJobInput(body);

  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: parsed.error
    });
  }

  const data = parsed.data;

  const references = await validateReferences(data);

  if (!references.ok) {
    return res.status(400).json({
      ok: false,
      error: references.error
    });
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
      ${data.title_am},
      ${data.title_en},
      ${data.organization_name},
      ${data.description_am},
      ${data.description_en},
      ${data.requirements_am},
      ${data.requirements_en},
      ${data.category_id},
      ${data.location_id},
      ${data.employment_type},
      ${data.education_level},
      ${data.experience_years},
      ${data.published_at},
      ${data.deadline_at},
      ${data.application_method_am},
      ${data.application_method_en},
      ${data.application_url},
      ${data.application_email},
      ${data.application_phone},
      ${data.source_reference},
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
}

// ==========================================
// UPDATE JOB STATUS - PATCH
// ==========================================

async function updateJobStatus(id, body, res) {
  const status = body.status;

  if (!["draft", "published"].includes(status)) {
    return res.status(400).json({
      ok: false,
      error: "Status must be draft or published"
    });
  }

  const currentRows = await sql`
    SELECT
      id,
      title_am,
      organization_name,
      application_method_am,
      application_method_en,
      application_url,
      application_email,
      application_phone
    FROM jobs
    WHERE id = ${id}
    LIMIT 1
  `;

  if (currentRows.length !== 1) {
    return res.status(404).json({
      ok: false,
      error: "Job not found"
    });
  }

  const current = currentRows[0];

  if (status === "published") {
    const hasApplicationChannel = Boolean(
      current.application_method_am ||
      current.application_method_en ||
      current.application_url ||
      current.application_email ||
      current.application_phone
    );

    if (!current.title_am || !current.organization_name) {
      return res.status(400).json({
        ok: false,
        error: "Job title and organization name are required"
      });
    }

    if (!hasApplicationChannel) {
      return res.status(400).json({
        ok: false,
        error: "Add an application method, URL, email, or phone before publishing"
      });
    }
  }

  const result = await sql`
    UPDATE jobs
    SET
      status = ${status},
      published_at = CASE
        WHEN ${status} = 'published'
          THEN COALESCE(published_at, CURRENT_DATE)
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      title_am,
      organization_name,
      status,
      published_at,
      updated_at
  `;

  return res.status(200).json({
    ok: true,
    message: status === "published"
      ? "Job published successfully"
      : "Job moved to draft successfully",
    data: result[0]
  });
}

// ==========================================
// EDIT JOB - PATCH
// ==========================================

async function editJob(id, body, res) {
  const currentRows = await sql`
    SELECT *
    FROM jobs
    WHERE id = ${id}
    LIMIT 1
  `;

  if (currentRows.length !== 1) {
    return res.status(404).json({
      ok: false,
      error: "Job not found"
    });
  }

  const current = currentRows[0];

  const parsed = parseJobInput(body, current);

  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: parsed.error
    });
  }

  const data = parsed.data;

  const references = await validateReferences(data, current);

  if (!references.ok) {
    return res.status(400).json({
      ok: false,
      error: references.error
    });
  }

  const result = await sql`
    UPDATE jobs
    SET
      title_am = ${data.title_am},
      title_en = ${data.title_en},
      organization_name = ${data.organization_name},
      description_am = ${data.description_am},
      description_en = ${data.description_en},
      requirements_am = ${data.requirements_am},
      requirements_en = ${data.requirements_en},
      category_id = ${data.category_id},
      location_id = ${data.location_id},
      employment_type = ${data.employment_type},
      education_level = ${data.education_level},
      experience_years = ${data.experience_years},
      published_at = ${data.published_at},
      deadline_at = ${data.deadline_at},
      application_method_am = ${data.application_method_am},
      application_method_en = ${data.application_method_en},
      application_url = ${data.application_url},
      application_email = ${data.application_email},
      application_phone = ${data.application_phone},
      source_reference = ${data.source_reference},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      title_am,
      title_en,
      organization_name,
      status,
      published_at,
      updated_at
  `;

  return res.status(200).json({
    ok: true,
    message: "Job updated successfully",
    data: result[0]
  });
}

// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const allowedMethods = ["GET", "POST", "PATCH"];

  if (!allowedMethods.includes(req.method)) {
    res.setHeader("Allow", allowedMethods.join(", "));

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const admin = await requireAdmin(req, res);

    if (!admin) return;

    // GET: List all admin jobs
    if (req.method === "GET") {
      return await getJobs(req, res);
    }

    const body = req.body || {};

    if (
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid request body"
      });
    }

    // POST: Create a new draft job
    if (req.method === "POST") {
      return await createJob(req, res);
    }

    // PATCH: Update an existing job
    if (req.method === "PATCH") {
      const id = parseJobId(
        req.query?.id ?? body.id
      );

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "A valid job ID is required"
        });
      }

      if (body.action === "status") {
        return await updateJobStatus(id, body, res);
      }

      if (
        body.action !== undefined ||
        Object.prototype.hasOwnProperty.call(body, "status")
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid update action"
        });
      }

      return await editJob(id, body, res);
    }
  } catch (error) {
    console.error(
      "Admin jobs API error:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
