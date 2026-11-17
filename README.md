# Ethiopia Jobs — Phase 1

Bilingual (Amharic/English) foundation for a newspaper-sourced job announcement directory in Ethiopia.

## Phase 1 scope

- Responsive public homepage starter
- Amharic/English language toggle
- Vercel deployment configuration
- Neon PostgreSQL connection helper and health endpoint
- Initial PostgreSQL schema
- External object-storage configuration placeholders

Job applications are **not** submitted through this website. Each published listing must preserve the application method stated in its original source. Newspaper images must not be displayed without permission.

## Requirements

- Node.js 20+
- npm
- Vercel account and CLI
- Neon PostgreSQL database

## Run locally

```bash
npm install
cp .env.example .env
# Add your Neon connection string to .env
npm run dev
```

Open the local URL printed by Vercel CLI.

## Database setup

1. Create a Neon PostgreSQL project.
2. Copy its pooled or standard connection string into `DATABASE_URL` in `.env`.
3. Run `database/schema.sql` in the Neon SQL Editor.
4. Open `/api/health` locally to verify the database connection.

Never put `DATABASE_URL` or storage secrets in frontend JavaScript or files under `public/`.

## Deploy to Vercel

1. Push this project to a new GitHub repository.
2. Import that repository into Vercel.
3. Add `DATABASE_URL` as a server-side environment variable.
4. Deploy and test `/api/health`.

**Plan note:** Vercel Hobby is intended for non-commercial personal use. Since the long-term plan includes advertising revenue, use Hobby only for non-commercial development/testing. Before enabling ads or launching commercially, move to a plan/provider whose terms permit commercial use.

## Phase 1 limitations

- Search UI is a placeholder; job search and listing APIs come in a later phase.
- No admin login is enabled yet. Do not create or expose admin credentials until the authentication phase.
- Automated collection, OCR, deduplication, alerts, user accounts, and external storage integration are not active yet.
- No sample job postings are included, to avoid publishing invented vacancies.

## Suggested next phase

Phase 2: implement database-backed job listing/search APIs, category and location filters, pagination, and job detail pages.
