"""Seed the database with sample users, jobs, candidates, and applications.

Run with: python -m app.scripts.seed
"""

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.candidate import Candidate
from app.models.job import EmploymentType, Job, JobStatus
from app.models.user import User, UserRole


def run():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already has data. Skipping seed.")
            return

        admin = User(name="Admin User", email="admin@hireflow.dev", password_hash=hash_password("Admin123!"), role=UserRole.ADMIN)
        recruiter = User(
            name="Alex Recruiter", email="recruiter@hireflow.dev", password_hash=hash_password("Recruiter123!"), role=UserRole.RECRUITER
        )
        db.add_all([admin, recruiter])
        db.flush()

        job1 = Job(
            title="Backend Engineer",
            department="Engineering",
            description="Design and build scalable backend services using Python, FastAPI, and PostgreSQL. Collaborate with frontend and product teams to ship new features.",
            required_skills="Python, FastAPI, PostgreSQL, SQL, REST APIs",
            preferred_skills="Docker, AWS, Redis",
            experience_level="3+ years",
            employment_type=EmploymentType.FULL_TIME,
            location="Remote",
            status=JobStatus.PUBLISHED,
            created_by=recruiter.id,
        )
        job2 = Job(
            title="Frontend Developer",
            department="Engineering",
            description="Build responsive, accessible user interfaces using React, TypeScript, and Tailwind CSS. Work closely with designers to implement pixel-perfect UI.",
            required_skills="React, TypeScript, CSS, HTML, JavaScript",
            preferred_skills="Next.js, Tailwind CSS",
            experience_level="2+ years",
            employment_type=EmploymentType.FULL_TIME,
            location="New York, NY",
            status=JobStatus.PUBLISHED,
            created_by=recruiter.id,
        )
        job3 = Job(
            title="Data Analyst Intern",
            department="Data",
            description="Support the data team with reporting, dashboards, and ad-hoc analysis using SQL and Python.",
            required_skills="SQL, Excel, Python",
            preferred_skills="Tableau, Power BI",
            experience_level="0-1 years",
            employment_type=EmploymentType.INTERNSHIP,
            location="Remote",
            status=JobStatus.CLOSED,
            created_by=recruiter.id,
        )
        db.add_all([job1, job2, job3])
        db.flush()

        candidate1 = Candidate(
            full_name="Jordan Smith",
            email="jordan.smith@example.com",
            phone="555-0101",
            cv_text=(
                "Backend engineer with 5 years of experience building REST APIs in Python using FastAPI and Flask. "
                "Strong background in PostgreSQL database design, query optimization, and writing automated tests. "
                "Experience deploying services with Docker and AWS."
            ),
            skills="Python, FastAPI, PostgreSQL, Docker, AWS, REST APIs",
            experience_summary="5 years backend engineering experience",
        )
        candidate2 = Candidate(
            full_name="Taylor Nguyen",
            email="taylor.nguyen@example.com",
            phone="555-0102",
            cv_text=(
                "Frontend developer skilled in React, TypeScript, and modern CSS. Built multiple production "
                "Next.js applications with Tailwind CSS. Comfortable working with REST and GraphQL APIs."
            ),
            skills="React, TypeScript, Next.js, Tailwind CSS, JavaScript",
            experience_summary="3 years frontend development experience",
        )
        candidate3 = Candidate(
            full_name="Morgan Lee",
            email="morgan.lee@example.com",
            phone="555-0103",
            cv_text=(
                "Recent graduate with a degree in graphic design. Experience with Adobe Photoshop, Illustrator, "
                "and branding projects for small businesses."
            ),
            skills="Photoshop, Illustrator, Branding",
            experience_summary="1 year freelance design experience",
        )
        db.add_all([candidate1, candidate2, candidate3])
        db.flush()

        app1 = Application(candidate_id=candidate1.id, job_id=job1.id, status=ApplicationStatus.SHORTLISTED, recruiter_notes="Strong technical background, schedule interview.")
        app2 = Application(candidate_id=candidate2.id, job_id=job2.id, status=ApplicationStatus.APPLIED)
        app3 = Application(candidate_id=candidate3.id, job_id=job1.id, status=ApplicationStatus.REJECTED, recruiter_notes="Skills do not match backend requirements.")
        db.add_all([app1, app2, app3])

        db.commit()
        print("Seed data created successfully.")
        print("Admin login: admin@hireflow.dev / Admin123!")
        print("Recruiter login: recruiter@hireflow.dev / Recruiter123!")
    finally:
        db.close()


if __name__ == "__main__":
    run()
