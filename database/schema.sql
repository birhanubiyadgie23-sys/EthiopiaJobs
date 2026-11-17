-- Ethiopia Jobs: Phase 1 foundational schema
-- Run this file against a new Neon PostgreSQL database.

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'am'
    CHECK (preferred_language IN ('am', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newspapers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_am TEXT NOT NULL,
  name_en TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_am TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  region_am TEXT,
  region_en TEXT,
  city_am TEXT,
  city_en TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title_am TEXT NOT NULL,
  title_en TEXT,
  organization_name TEXT NOT NULL,
  description_am TEXT,
  description_en TEXT,
  requirements_am TEXT,
  requirements_en TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  employment_type TEXT,
  education_level TEXT,
  experience_years NUMERIC(4,1),
  published_at DATE,
  deadline_at DATE,
  application_method_am TEXT,
  application_method_en TEXT,
  application_url TEXT,
  application_email TEXT,
  application_phone TEXT,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'expired', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  newspaper_id BIGINT REFERENCES newspapers(id) ON DELETE SET NULL,
  edition_date DATE,
  page_number TEXT,
  source_url TEXT,
  source_note TEXT,
  image_permission_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (image_permission_status IN ('not_requested', 'pending', 'granted', 'denied', 'not_applicable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_deadline
  ON jobs(status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at
  ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category
  ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_job_sources_job
  ON job_sources(job_id);
