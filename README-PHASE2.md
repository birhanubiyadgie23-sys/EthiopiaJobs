# Ethiopia Jobs — Phase 2 (corrected)

This package adds public, read-only job browsing to the existing Phase 1 project. It does not replace or remove any Phase 1 database tables or configuration files.

## Files in this package

### Replace these 3 existing files

- `public/index.html`
- `public/assets/css/styles.css`
- `public/assets/js/app.js`

### Add these 7 new files

- `api/jobs.js`
- `api/jobs/[id].js`
- `api/categories.js`
- `api/locations.js`
- `public/job.html`
- `public/assets/js/job-detail.js`
- `README-PHASE2.md` (project instructions; it is not a runtime file)

## API endpoints

- `GET /api/jobs` — published, non-expired jobs; supports `q`, `location`, `page`, and `limit`.
- `GET /api/jobs/:id` — one published, non-expired job and its source metadata.
- `GET /api/categories` — active categories.
- `GET /api/locations` — available locations.

The homepage displays database-backed listings, keyword/location search, and pagination. `/job.html?id=123` displays a job's details and the original application instructions.

## Important implementation notes

- The Neon HTTP driver's default `sql.query()` result is an array of row objects. These API routes use that return shape; they do not expect a node-postgres `{ rows: [...] }` wrapper.
- SQL values from request parameters are passed as bound parameters, not concatenated into SQL.
- No database migration is needed. The APIs use the existing Phase 1 tables and columns.
- This phase does not include admin login, public write endpoints, or automated job collection.
- Applications are not submitted through this website. Applicants must follow the original announcement's application method.
- Newspaper images must not be displayed without permission.

## Installation

1. Keep a backup or commit the current GitHub version before changing files.
2. In the existing repository, replace only the 3 files listed under **Replace**.
3. Add the 7 files listed under **Add**, keeping the exact folder paths shown above.
4. Do not replace `package.json`, `.env` settings, `api/_lib/db.js`, `database/schema.sql`, or other Phase 1 files.
5. Commit and push the changes to GitHub. Vercel should then deploy the update.

## Checks after deployment

Open these endpoints in the browser:

- `/api/health` — database connection check.
- `/api/jobs` — should return `{ "ok": true, "data": [], "pagination": ... }` if there are no published jobs yet.
- `/api/categories` — should return `{ "ok": true, "data": [...] }`.
- `/api/locations` — should return `{ "ok": true, "data": [...] }`.

Then open the homepage and test the language toggle and search form. A job detail page can be tested after a real published job is added, using its database ID. Do not invent sample vacancies just to test the public website.

These are local code checks and deployment instructions; the package has not been deployed to or tested against your live Vercel project.
