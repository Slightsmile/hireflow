# HireFlow — AI-Powered Recruitment Management System

## 1. Problem

Recruiters frequently manage job openings, candidate information, and application
pipelines across spreadsheets, inboxes, and disconnected tools. This makes it hard to
track where a candidate stands in the hiring process, how well a candidate's
experience matches a role, and how recruitment activity is trending overall.

HireFlow is a centralized web application for managing recruitment activity: jobs,
candidates, applications, and an AI-assisted CV-to-job matching feature that gives
recruiters a transparent, explainable signal (never an automatic decision) about how
well a candidate's CV matches a job's requirements.

## 2. Main Features

- Email/password authentication with JWT access tokens and two roles: `admin` and
  `recruiter`.
- Role-based authorization enforced on the backend (admin-only user management).
- Dashboard with live statistics computed from the database (total jobs, open jobs,
  total candidates, total applications, applications awaiting review, status
  breakdown, recent applications).
- Full CRUD for job openings, with search, status/department filters, and pagination.
- Job workflow actions: publish, close, archive.
- Application management linking a candidate to a job, with status transitions
  (`applied → shortlisted → interview → hired/rejected`), recruiter notes, and
  duplicate/closed-job protection.
- Full CRUD for candidate profiles, with search and pagination, including pasted CV
  text and PDF CV upload (the PDF text is extracted for matching and the original file
  is stored for download).
- Batch import: upload many CV PDFs at once to create candidates, and import many jobs
  from a CSV file, with per-file/per-row error reporting.
- Admin Settings page where an administrator stores the AI provider API key used for
  matching (the key is never returned to the browser).
- AI-powered CV-to-job match scoring: uses the configured AI provider
  (OpenAI-compatible, Anthropic, or Gemini) with an explainable breakdown of
  matched/missing skills, and falls back to the built-in TF-IDF + cosine similarity +
  skill-coverage scorer when no API key is set.
- "Top 10 matches" for a job: score a selected set of candidates (or all of them) and
  rank the best 10 by score.
- Consistent loading, empty, error, and confirmation states across the UI.

## 3. Technology Stack

**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.

**Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.0.

**Database:** PostgreSQL, managed with Alembic migrations (SQLite is used
automatically in the backend test suite so tests don't require a live Postgres
instance).

**Auth:** JWT bearer tokens (`python-jose`), password hashing with `bcrypt`.

**AI/ML:** Admin-configurable AI provider (OpenAI-compatible, Anthropic, or Gemini)
called over HTTP (`httpx`), with a fallback TF-IDF vectorization + cosine similarity
(`scikit-learn`) blended with explicit required-skill coverage. PDF CVs are parsed with
`pypdf`.

**Testing:** Pytest + FastAPI `TestClient`, running against an in-memory SQLite
database.

## 4. System Architecture

```
frontend/ (Next.js, port 3000)
   │  REST calls, JSON, Bearer token in Authorization header
   ▼
backend/ (FastAPI, port 8000)
   │  /api/v1/{auth,dashboard,jobs,candidates,applications,users,settings}
   │  SQLAlchemy ORM
   ▼
PostgreSQL (via Alembic-managed schema)
```

- Uploaded CV PDFs are stored under `backend/uploads/cv/` (configurable via
  `UPLOAD_DIR`) and served back through an authenticated download endpoint.
- The frontend never talks to the database directly; all data access goes through
  the versioned REST API.
- Authorization is enforced in FastAPI dependencies (`get_current_user`,
  `require_admin`), not just hidden in the UI — directly calling a protected endpoint
  without a valid token, or calling an admin endpoint as a recruiter, is rejected by
  the backend.
- The matching logic lives in `backend/app/services/matching.py` (`score_candidate`)
  and is invoked from the `applications` router and the job "Top Matches" endpoint. It
  calls the configured AI provider (`backend/app/services/ai.py`) when an API key is
  saved, and otherwise falls back to the local TF-IDF scorer.

## 5. Database Relationships

- `users (1) ──< (many) jobs` — a user (recruiter) creates many jobs (`jobs.created_by`).
- `jobs (1) ──< (many) applications` — a job can receive many applications.
- `candidates (1) ──< (many) applications` — a candidate can have many applications.
- `applications` has a **unique constraint on `(candidate_id, job_id)`** — a candidate
  cannot apply twice to the same job.
- `applications.match_score` has a check constraint restricting it to `0–100`.
- `ai_settings` is a single-row table holding the admin-configured AI provider, model,
  base URL, and API key used for matching.
- `candidates` carries the uploaded CV file's original name (`cv_filename`) and its
  stored path (`cv_file_path`) alongside the extracted `cv_text`.

See `backend/app/models/` for the SQLAlchemy models and
`backend/alembic/versions/` for the schema migrations (`0001` initial schema, `0002` AI
settings and candidate CV files).

## 6. Installing Dependencies

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## 7. Configuring Environment Variables

Copy the example env files and adjust as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**`backend/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql+psycopg://hireflow:hireflow@localhost:5432/hireflow` |
| `SECRET_KEY` | Secret used to sign JWTs. Generate a long random string for production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry window. |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins. |
| `UPLOAD_DIR` | Directory where uploaded CV PDFs are stored (default `uploads`). |
| `MAX_UPLOAD_MB` | Maximum upload size in MB for CV PDFs and CSV imports (default `10`). |

**`frontend/.env.local`**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API, e.g. `http://localhost:8000/api/v1` |

Never commit real secrets. `.env` files are excluded via `.gitignore`.

## 8. Running Database Migrations

Make sure PostgreSQL is running and `DATABASE_URL` in `backend/.env` points to it,
then from `backend/`:

```bash
alembic upgrade head
```

To seed the database with sample users, jobs, candidates, and applications:

```bash
python -m app.scripts.seed
```

This creates:
- Admin: `admin@hireflow.dev` / `Admin123!`
- Recruiter: `recruiter@hireflow.dev` / `Recruiter123!`

## 9. Starting the Frontend and Backend

**Backend** (from `backend/`, with the virtualenv active):

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

**Frontend** (from `frontend/`):

```bash
npm run dev
```

App available at `http://localhost:3000`.

## 10. Running Tests

Backend tests use an isolated in-memory SQLite database and never touch your real
Postgres data:

```bash
cd backend
pytest -q
```

35 tests cover authentication, authorization, job CRUD and validation, candidate and
application business rules (duplicate prevention, closed-job rejection, terminal status
enforcement), CV PDF upload and batch import, admin AI settings (including that the raw
key is never returned), job CSV batch import, the Top Matches endpoint, and the AI
matching service.

## 11. Demo Account

If you run the seed script (`python -m app.scripts.seed`), you can log in with:
- **Admin:** `admin@hireflow.dev` / `Admin123!`
- **Recruiter:** `recruiter@hireflow.dev` / `Recruiter123!`

## 12. How the Matching Algorithm Works

Scoring is dispatched by `score_candidate` in `backend/app/services/matching.py`, which
uses one of two engines:

- **AI scoring** (`backend/app/services/ai.py`) when an administrator has saved an API
  key on the Settings page. The CV and job requirements are sent to the configured
  provider (OpenAI-compatible chat completions, Anthropic messages, or Gemini
  `generateContent`), which must return a JSON object with `match_score`,
  `matched_skills`, `missing_skills`, and `explanation`. If the provider errors, the
  request times out, or the response cannot be parsed, matching silently falls back to
  the local scorer below.
- **Local scoring** (the built-in fallback) works as follows:

1. **Normalize** CV text and job text — lowercase, strip punctuation (keeping `+`, `#`,
   `.` so terms like `C++`, `C#`, and version numbers survive).
2. **Vectorize** both documents with scikit-learn's `TfidfVectorizer`
   (unigrams + bigrams, English stopwords removed).
3. **Cosine similarity** between the two TF-IDF vectors gives an overall textual
   similarity score (0–1).
4. **Skill coverage**: required skills are parsed from the job's comma/semicolon/
   newline-separated `required_skills` field, and each is checked for literal
   substring presence in the normalized CV text.
5. **Final score** = `40% × text similarity + 60% × skill coverage`, scaled to
   0–100. Skill coverage is weighted higher because recruiters care most about
   concrete, named requirements being present, not just general topical similarity.
6. The result returns matched skills, missing skills, a human-readable explanation,
   and a **warning** if the CV text is too short (`< 30` characters) to be reliably
   scored.

Every response includes the `engine` (`"ai"` or `"tfidf"`) so the UI can show which
one produced the score.

The API never auto-rejects an applicant based on this score — it is exposed purely
as decision support in the application detail page, with an explicit UI disclaimer.

### Configuring AI Matching (Settings)

An administrator opens **Settings**, picks a provider, pastes the API key, and
optionally sets a model and base URL. The key is stored server-side and is never
returned to the browser (only a masked hint of it is). The **Test Connection** button
verifies the provider responds with a valid score. Without a saved key, all matching
uses the local TF-IDF scorer.

The job detail page's **Top Matches** card lets a recruiter select candidates (or score
all of them) and ranks the best 10. To limit provider cost, at most 50 candidates are
scored per request and the best 10 returned.

## 13. How the AI/ML Feature Was Evaluated

A small set of fictional CVs and job descriptions was used to sanity-check the
matcher (see `backend/tests/test_matching.py` and the seed data in
`backend/app/scripts/seed.py`):

- **Strong match**: a backend-engineering CV (Python/FastAPI/PostgreSQL) scored
  against a backend engineering job with the same required skills — scores
  noticeably higher than an unrelated CV.
- **Weak match**: a graphic-design CV scored against the same backend job — scores
  noticeably lower, and all required skills are correctly reported as missing.
- **Edge cases**: an empty/very short CV is handled gracefully (score still in
  range, explicit warning surfaced instead of a crash or a misleadingly high/low
  score).

This was a manual, qualitative evaluation rather than a large labeled benchmark — it
confirms the ranking behaves sensibly in clearly-distinguishable cases, which is the
level of rigor appropriate for a transparent, explainable decision-support tool
rather than a scored benchmark model.

**Known limitations of the matching approach:**
- **Synonyms are not handled.** "JS" vs. "JavaScript", or "Postgres" vs.
  "PostgreSQL", may not match as literal substrings unless they happen to overlap.
- **No semantic understanding.** The TF-IDF + substring approach cannot reason about
  equivalent experience described in different words.
- **Keyword stuffing** in a CV could artificially inflate the text-similarity
  component, though skill coverage still requires the exact skill term to appear.
- **Skill extraction is naive**: it relies on the job's `required_skills` field being
  entered as a clean, comma-separated list, and does not extract skills from
  free-form CV text beyond substring search.
- **Short or sparse CVs** reduce reliability; the system surfaces a warning but does
  not block the analysis.

When AI scoring is enabled these TF-IDF-specific quirks largely do not apply (the model
reads the CV semantically), but AI mode adds its own trade-offs: results are
non-deterministic, they depend on provider availability and network latency, each
candidate costs one provider call, and scoring is skipped entirely (falling back to the
local scorer) if the key is missing or the provider returns an unparseable response.

Because of these limitations, the score is explicitly presented as **decision
support, not a measure of candidate ability**, and the system does not auto-reject
applicants based on it.

## 14. API Reference

All routes are under `/api/v1` and require a Bearer token, except register, login, and
logout.

**Auth**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Dashboard**
- `GET /dashboard/stats`, `GET /dashboard/recent-applications`

**Jobs**
- `GET /jobs`, `POST /jobs`
- `GET /jobs/{job_id}`, `PATCH /jobs/{job_id}`, `DELETE /jobs/{job_id}`
- `POST /jobs/batch` — import jobs from a CSV file (multipart `file`)
- `GET /jobs/batch/template` — download a CSV template
- `POST /jobs/{job_id}/matches` — score candidates and return the top 10

**Candidates**
- `GET /candidates`, `POST /candidates`
- `POST /candidates/batch` — import candidates from CV PDFs (multipart `files`)
- `GET /candidates/{candidate_id}`, `PATCH /candidates/{candidate_id}`,
  `DELETE /candidates/{candidate_id}`
- `POST /candidates/{candidate_id}/cv` — upload a CV PDF (multipart `file`)
- `GET /candidates/{candidate_id}/cv` — download the stored CV PDF

**Applications**
- `GET /applications`, `POST /applications`
- `GET /applications/{application_id}`, `PATCH /applications/{application_id}`,
  `DELETE /applications/{application_id}`
- `PATCH /applications/{application_id}/status`
- `POST /applications/{application_id}/match`, `GET /applications/{application_id}/match`

**Users** (admin only)
- `GET /users`

**Settings** (admin only)
- `GET /settings/ai`, `PUT /settings/ai`, `POST /settings/ai/test`

## 15. Frontend Pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Authentication |
| `/dashboard` | Statistics, status breakdown, recent applications |
| `/jobs`, `/jobs/new`, `/jobs/[id]`, `/jobs/[id]/edit` | Job CRUD, workflow actions, top-10 matches |
| `/jobs/batch` | Import jobs from a CSV file |
| `/candidates`, `/candidates/new`, `/candidates/[id]`, `/candidates/[id]/edit` | Candidate CRUD, CV text and PDF upload/download |
| `/candidates/batch` | Batch import candidates from CV PDFs |
| `/applications`, `/applications/new`, `/applications/[id]` | Applications, status updates, notes, AI match |
| `/users` (admin) | User list |
| `/settings` (admin) | AI provider configuration |

## 16. Project Structure

```
backend/
  app/
    api/v1/          # routers: auth, dashboard, jobs, candidates, applications, users, settings
    core/            # config and auth dependencies
    db/              # engine, session, GUID type
    models/          # SQLAlchemy models
    schemas/         # Pydantic request/response models
    services/        # matching, ai, pdf, storage, pagination
    scripts/seed.py  # sample data
  alembic/versions/  # migrations (0001 initial, 0002 AI settings + candidate CV files)
  tests/             # pytest suite (in-memory SQLite)
frontend/
  src/app/           # Next.js App Router pages
  src/components/    # shared UI (forms, dialogs, states, app shell)
  src/lib/           # API client and auth context
  src/types/         # shared TypeScript types
```

## 17. Known Limitations

- Logout is a client-side token discard; because authentication uses stateless JWTs,
  there is no server-side token revocation/blacklist in this version.
- CSV export, interview scheduling, and email notifications (Priority 3 in the spec)
  are not implemented.
- CV upload supports PDF files (parsed with `pypdf`); scanned/image-only PDFs and other
  file formats are not supported.
- The AI provider API key is stored in plain text in the database; it is masked in API
  responses but not encrypted at rest.
- Batch CV import derives the candidate name/email/phone from the PDF text heuristically;
  files without a detectable email are saved with a placeholder email to be edited later.
- Only candidates present in HireFlow can be scored; there is no import from external
  sourcing systems.
- CSRF protection is not required because the API uses a `Bearer` token in the
  `Authorization` header (not cookies) for state-changing requests, which is not
  vulnerable to classic CSRF.
- No rate limiting is implemented on the auth endpoints.
