# HireFlow — AI-Powered Recruitment Management System
## Detailed Product Requirements and Technical Specification

### 1. Project Overview

**Project Name:** HireFlow

**Product Type:** Full-Stack Recruitment Management Web Application

**Purpose:** Build a recruitment management platform that helps recruiters manage job openings, organize candidate information, track applications throughout the hiring process, and evaluate how closely a candidate's CV matches a job's requirements.

HireFlow aims to solve the problem of managing recruitment activities across spreadsheets, emails, and disconnected tools. It provides a centralized workspace where recruiters can manage jobs, candidates, applications, and AI-assisted candidate matching.

**Primary Users:**
- Administrators who manage users and oversee the system.
- Recruiters who create job openings, manage candidates, review applications, and use the CV-matching feature.

**Project Goal:** Demonstrate practical full-stack development skills through a functional, secure, maintainable application with persistent data, meaningful business logic, and a practical AI/ML feature.

---

### 2. Technology Stack

Use the following stack, subject to your familiarity and available development time.

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS
- A consistent component system for forms, tables, dialogs, and notifications.

**Backend**
- Python
- FastAPI
- Pydantic for request and response validation.
- SQLAlchemy for database access.

**Database**
- PostgreSQL
- Alembic for database migrations.

**Authentication and Security**
- Secure password hashing.
- Session-based authentication or securely implemented token authentication.
- Backend authorization and protected endpoints.
- Environment variables for secrets and configuration.

**AI/ML**
- A transparent, lightweight CV-to-job matching algorithm using TF-IDF and cosine similarity, or another clearly explained ML approach.

**Testing**
- Pytest for backend tests.
- Frontend tests where time permits.
- Integration tests for critical business workflows.

**Deployment**
- Deploy the frontend and backend separately if practical.
- Use a managed PostgreSQL database or another reliable PostgreSQL deployment.
- Document local setup even if a live deployment is unavailable.

---

### 3. Functional Requirements

#### 3.1 Authentication and Authorization

Implement a secure authentication system.

Features:
- User registration.
- Login and logout.
- Password hashing.
- Protected application pages.
- Protected backend endpoints.
- Role-based authorization.
- Clear validation errors for invalid credentials or registration data.

Roles:

**Administrator**
- View and manage application users.
- Access recruitment records.
- Manage job openings and candidates.

**Recruiter**
- Create and manage permitted job openings.
- Manage candidate profiles.
- Review applications.
- Change application statuses.
- Run CV-matching analyses.

Enforce permissions on the backend rather than relying solely on hidden frontend buttons.

A user must not be able to access protected data simply by changing a URL or sending a request directly to the API.

#### 3.2 Dashboard

Create a dashboard showing recruitment activity using actual database records.

Display:
- Total jobs.
- Number of open jobs.
- Total candidates.
- Total applications.
- Applications awaiting review.
- Interviews scheduled, if interview management is implemented.
- Recent applications.
- Application counts grouped by status.

Dashboard statistics must be calculated from persisted records rather than hardcoded sample numbers.

Include:
- Loading indicators.
- Empty states.
- Error messages.
- Navigation to the relevant management pages.

#### 3.3 Job Management

Provide complete CRUD functionality for job openings.

Each job should contain:
- Job title.
- Department.
- Job description.
- Required skills.
- Preferred skills, if applicable.
- Experience requirements.
- Employment type.
- Location.
- Job status.
- Creation date.
- User who created the job.

Required operations:
- Create a job.
- View job details.
- List jobs.
- Edit job information.
- Publish, close, or archive a job.
- Delete a job when appropriate.
- Search jobs by title.
- Filter jobs by status and department.
- Paginate results.

Validation:
- Job title and description cannot be empty.
- Required fields must be validated on the backend.
- Only valid job statuses may be submitted.
- Closed jobs should not accept new applications through any public application workflow.

#### 3.4 Candidate Management

Create a candidate directory for storing and managing applicant information.

Candidate fields:
- Full name.
- Email address.
- Phone number.
- CV text or uploaded CV file.
- Relevant skills, where available.
- Experience summary, where available.
- Creation date.

Required operations:
- Add a candidate.
- View candidate details.
- Edit candidate information.
- Delete a candidate when appropriate.
- Search candidates by name or email.
- Filter and paginate candidate records.
- View all applications associated with a candidate.

Validation:
- Validate email format.
- Prevent accidental duplicate candidate records.
- Handle missing or incomplete CV information.
- Validate uploaded file type and size if PDF uploads are supported.
- Protect candidate information against unauthorized access.

For the initial version, storing pasted CV text is acceptable and reduces file-processing complexity.

#### 3.5 Application Management

Applications connect candidates to job openings and represent the recruitment workflow.

Each application should include:
- Candidate ID.
- Job ID.
- Application status.
- Application date.
- Match score, when available.
- Recruiter notes.
- Last updated timestamp.

Suggested statuses:
- Applied.
- Shortlisted.
- Interview.
- Hired.
- Rejected.

Required operations:
- Create an application for an existing candidate and job.
- List applications.
- View application details.
- Update application status.
- Add or edit recruiter notes.
- Filter by job and status.
- View application history or timestamps.
- Prevent duplicate applications for the same candidate and job.

Business rules:
- An application must reference an existing candidate and an existing job.
- A candidate cannot apply twice to the same job.
- Closed jobs cannot accept new applications.
- Only authorized users may update application information.
- Status changes must be validated.
- Hired and rejected applications should be treated as terminal outcomes unless an authorized user explicitly reopens the application through a defined workflow.

#### 3.6 AI-Powered CV-to-Job Matching

Implement a feature that compares candidate CV information with the requirements of a selected job.

**Input**
- Candidate CV text.
- Job description.
- Required skills.
- Optional preferred skills and experience requirements.

**Processing**
1. Normalize text and remove irrelevant formatting.
2. Extract or identify relevant terms and skills.
3. Represent the CV and job description using TF-IDF or another documented text representation.
4. Calculate cosine similarity.
5. Compare required skills against the candidate's identified skills.
6. Produce an explainable result for recruiter review.

**Output**
- Match score from 0 to 100.
- Skills found in both the CV and job requirements.
- Required skills not identified in the CV.
- A short explanation of the match.
- A warning when insufficient CV text is available.

The result must be presented as decision-support information, not as an objective measure of a candidate's ability.

The system must not automatically reject applicants based on the score.

**Evaluation**
- Prepare a small set of fictional CVs and job descriptions.
- Include strong, moderate, and weak matches.
- Compare the results against manually assessed examples.
- Record whether the rankings are sensible.
- Document limitations such as synonyms, missing information, keyword stuffing, and inaccurate skill extraction.

Do not claim the model is accurate without performing an evaluation.

#### 3.7 Search, Filtering, and Pagination

Implement reusable search and filtering patterns for:
- Jobs.
- Candidates.
- Applications.

Requirements:
- Search inputs should be validated.
- Filtering should operate on actual database records.
- Pagination should be handled consistently.
- Empty search results should display a useful message.
- Filtering should not expose records the current user is unauthorized to access.

---

### 4. Database Design

Create a normalized relational database.

#### Users
Suggested columns:
- id
- name
- email
- password_hash
- role
- created_at
- updated_at

Constraints:
- Unique email.
- Valid role.
- Required fields.

#### Jobs
Suggested columns:
- id
- title
- department
- description
- required_skills
- preferred_skills
- experience_level
- employment_type
- location
- status
- created_by
- created_at
- updated_at

Relationship:
- A user can create multiple jobs.

#### Candidates
Suggested columns:
- id
- full_name
- email
- phone
- cv_text
- created_at
- updated_at

Constraints:
- Appropriate email validation.
- Duplicate handling.

#### Applications
Suggested columns:
- id
- candidate_id
- job_id
- status
- match_score
- recruiter_notes
- applied_at
- updated_at

Relationships:
- A candidate can have multiple applications.
- A job can have multiple applications.
- Each application belongs to one candidate and one job.

Constraints:
- Foreign keys to candidates and jobs.
- Unique candidate/job combination.
- Valid status values.
- Match score must be within the accepted range.

Use migrations to create and update the database schema. Avoid manually modifying production tables without a corresponding migration.

---

### 5. Backend API Specification

Use a versioned REST API, such as `/api/v1`.

#### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

#### Dashboard
- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/recent-applications`

#### Jobs
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs/{job_id}`
- `PATCH /api/v1/jobs/{job_id}`
- `DELETE /api/v1/jobs/{job_id}`

Support query parameters for search, status, department, page, and page size where relevant.

#### Candidates
- `GET /api/v1/candidates`
- `POST /api/v1/candidates`
- `GET /api/v1/candidates/{candidate_id}`
- `PATCH /api/v1/candidates/{candidate_id}`
- `DELETE /api/v1/candidates/{candidate_id}`

#### Applications
- `GET /api/v1/applications`
- `POST /api/v1/applications`
- `GET /api/v1/applications/{application_id}`
- `PATCH /api/v1/applications/{application_id}`
- `PATCH /api/v1/applications/{application_id}/status`
- `DELETE /api/v1/applications/{application_id}`

#### AI Matching
- `POST /api/v1/applications/{application_id}/match`
- `GET /api/v1/applications/{application_id}/match`

The matching endpoint should verify that the application exists and that the requesting user is authorized to access it.

Store matching results only when appropriate, and distinguish saved results from newly calculated results.

Use consistent HTTP status codes and response formats. Handle validation failures, missing records, authentication failures, authorization failures, and unexpected server errors without leaking sensitive details.

---

### 6. Frontend Pages

Implement the following pages.

**1. Login**
- Email and password fields.
- Client-side validation.
- Error handling.
- Loading state.
- Redirect after successful authentication.

**2. Dashboard**
- Statistics cards.
- Recent applications.
- Application status summary.
- Quick navigation to jobs and candidates.

**3. Jobs**
- Job listing table.
- Search and filters.
- Create and edit forms.
- Job details.
- Publish and close actions.

**4. Candidates**
- Candidate listing.
- Search.
- Candidate creation and editing.
- Candidate details.
- CV information.

**5. Applications**
- Application listing.
- Candidate and job references.
- Status labels.
- Status update controls.
- Search and filters.

**6. Application Details**
- Candidate information.
- Job requirements.
- Application status.
- Recruiter notes.
- AI matching results.
- Match-analysis action.

**7. User Management**
- Administrator-only user listing.
- Role display.
- Account management where implemented.

All pages should use a consistent layout, responsive navigation, accessible forms, readable typography, and reusable UI components.

---

### 7. User Experience Requirements

The interface should be professional, clean, and easy to understand.

Visual direction:
- Neutral background.
- Dark navy sidebar.
- Clear page titles.
- Consistent spacing.
- Restrained accent colors.
- Clear typography.
- Responsive tables and forms.

Required interaction states:
- Loading.
- Success.
- Validation error.
- Server error.
- Empty results.
- Confirmation for destructive actions.
- Disabled states for actions that cannot currently be performed.

Avoid adding decorative charts or animations that do not improve usability.

Prioritize functional workflows over visual complexity.

---

### 8. Security Requirements

Implement security appropriate to the application's scope.

- Hash passwords using a suitable password-hashing algorithm.
- Never return password hashes through API responses.
- Enforce authentication and authorization on the backend.
- Validate request bodies and query parameters.
- Restrict allowed application status values.
- Use ORM queries or parameterized SQL.
- Store secrets in environment variables.
- Configure CORS for the intended frontend origin.
- Use secure cookie settings if cookie-based authentication is chosen.
- Protect cookie-authenticated state-changing requests against CSRF.
- Apply sensible request-size and upload limits.
- Prevent unauthorized access to candidate CVs and recruiter notes.
- Avoid logging passwords, tokens, or unnecessary candidate information.
- Provide generic internal-error messages without exposing stack traces to users.

Document any security limitations that remain.

---

### 9. Testing Requirements

Create tests for the most important functionality.

Authentication:
- Valid login succeeds.
- Invalid credentials fail.
- Protected endpoints reject unauthenticated requests.
- Users cannot access administrator-only actions.

Jobs:
- A job can be created and retrieved.
- Invalid job data is rejected.
- Existing jobs can be updated.
- Unauthorized modifications are rejected.

Candidates and applications:
- Candidate records persist.
- An application can be associated with a valid candidate and job.
- Duplicate applications are rejected.
- Invalid status transitions are rejected.
- Closed jobs cannot accept new applications.

AI matching:
- A clearly relevant CV receives a stronger match than an unrelated CV in controlled examples.
- Empty input is handled gracefully.
- Match scores stay within the defined range.
- Missing skills are reported consistently.

Use a test database and avoid running destructive tests against real user data.

---

### 10. Documentation and Submission

The repository should include:

- README.md
- `.env.example`
- Backend source code.
- Frontend source code.
- Database models and migrations.
- Tests.
- Seed data or a sample-data script.
- Dependency manifests and installation instructions.

The README should explain:
1. The problem being solved.
2. The project's main features.
3. The technology stack.
4. The system architecture.
5. The database relationships.
6. How to install dependencies.
7. How to configure environment variables.
8. How to run database migrations.
9. How to start the frontend and backend.
10. How to execute tests.
11. How to access the demo account, if provided.
12. How the matching algorithm works.
13. How the AI/ML feature was evaluated.
14. Known limitations.

Do not commit actual API keys, database credentials, or production secrets.

---

### 11. Scope Priorities

**Priority 1 — Essential**
- Authentication.
- Job CRUD.
- Candidate CRUD.
- Application management.
- PostgreSQL persistence.
- Basic role-based access.
- AI/ML matching.
- Input validation.
- Critical backend tests.
- README and setup instructions.

**Priority 2 — Important improvements**
- Search and filtering.
- Pagination.
- Dashboard statistics.
- Responsive design.
- Better error handling.
- Sample data.
- Deployment.

**Priority 3 — Optional extensions**
- Interview scheduling.
- Email notifications.
- CSV export.
- Application activity history.
- More advanced matching.
- Additional analytics.

Do not start optional extensions until all Priority 1 requirements work reliably.

---

### 12. Acceptance Criteria

HireFlow is considered ready when:

1. A user can log in and access only permitted resources.
2. A recruiter can create, view, edit, and manage jobs.
3. A recruiter can create and manage candidate profiles.
4. Applications can be created and linked to valid candidates and jobs.
5. Application status changes persist in the database.
6. Invalid and duplicate records are rejected appropriately.
7. The AI/ML matching feature produces explainable results.
8. Critical functionality has automated tests.
9. The interface handles loading, empty, success, and error states.
10. The README explains setup and the application's limitations.
11. The developer can demonstrate the main workflow and explain the implementation.

**Final principle:** Deliver a reliable, understandable recruitment management application. A small system with complete workflows, sensible validation, and a defensible AI/ML feature is preferable to an ambitious system with incomplete functionality.
