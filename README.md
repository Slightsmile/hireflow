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
- Full CRUD for candidate profiles, with search and pagination, including pasted CV
  text storage.
- Application management linking a candidate to a job, with status transitions
  (`applied → shortlisted → interview → hired/rejected`), recruiter notes, and
  duplicate/closed-job protection.
- AI-powered CV-to-job match scoring (TF-IDF + cosine similarity + skill coverage),
  with an explainable breakdown of matched/missing skills.
- Consistent loading, empty, error, and confirmation states across the UI.

## 3. Technology Stack

**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.

**Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.0.

**Database:** PostgreSQL, managed with Alembic migrations (SQLite is used
automatically in the backend test suite so tests don't require a live Postgres
instance).

**Auth:** JWT bearer tokens (`python-jose`), password hashing with `bcrypt`.

**AI/ML:** TF-IDF vectorization + cosine similarity (`scikit-learn`) blended with
explicit required-skill coverage.

**Testing:** Pytest + FastAPI `TestClient`, running against an in-memory SQLite
database.

## 4. System Architecture

```
frontend/ (Next.js, port 3000)
   │  REST calls, JSON, Bearer token in Authorization header
   ▼
backend/ (FastAPI, port 8000)
   │  /api/v1/{auth,dashboard,jobs,candidates,applications,users}
   │  SQLAlchemy ORM
   ▼
PostgreSQL (via Alembic-managed schema)
```

- The frontend never talks to the database directly; all data access goes through
  the versioned REST API.
- Authorization is enforced in FastAPI dependencies (`get_current_user`,
  `require_admin`), not just hidden in the UI — directly calling a protected endpoint
  without a valid token, or calling an admin endpoint as a recruiter, is rejected by
  the backend.
- The matching logic lives in `backend/app/services/matching.py` and is invoked from
  the `applications` router; it has no external dependencies beyond `scikit-learn`
  and runs entirely locally.

## 5. Database Relationships

- `users (1) ──< (many) jobs` — a user (recruiter) creates many jobs (`jobs.created_by`).
- `jobs (1) ──< (many) applications` — a job can receive many applications.
- `candidates (1) ──< (many) applications` — a candidate can have many applications.
- `applications` has a **unique constraint on `(candidate_id, job_id)`** — a candidate
  cannot apply twice to the same job.
- `applications.match_score` has a check constraint restricting it to `0–100`.

See `backend/app/models/` for the SQLAlchemy models and
`backend/alembic/versions/0001_initial_schema.py` for the schema migration.

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

21 tests cover authentication, authorization, job CRUD and validation, candidate and
application business rules (duplicate prevention, closed-job rejection, terminal
status enforcement), and the AI matching service.

## 11. Demo Account

If you run the seed script (`python -m app.scripts.seed`), you can log in with:
- **Admin:** `admin@hireflow.dev` / `Admin123!`
- **Recruiter:** `recruiter@hireflow.dev` / `Recruiter123!`

## 12. How the Matching Algorithm Works

Implemented in `backend/app/services/matching.py`:

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

The API never auto-rejects an applicant based on this score — it is exposed purely
as decision support in the application detail page, with an explicit UI disclaimer.

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

Because of these limitations, the score is explicitly presented as **decision
support, not a measure of candidate ability**, and the system does not auto-reject
applicants based on it.

## 14. Known Limitations

- Logout is a client-side token discard; because authentication uses stateless JWTs,
  there is no server-side token revocation/blacklist in this version.
- CSV export, interview scheduling, and email notifications (Priority 3 in the spec)
  are not implemented.
- CV upload is limited to pasted text; PDF/file upload parsing is not implemented in
  this version.
- CSRF protection is not required because the API uses a `Bearer` token in the
  `Authorization` header (not cookies) for state-changing requests, which is not
  vulnerable to classic CSRF.
- No rate limiting is implemented on the auth endpoints.
