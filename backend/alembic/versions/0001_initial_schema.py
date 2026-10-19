"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = postgresql.ENUM("admin", "recruiter", name="user_role", create_type=False)
    job_status = postgresql.ENUM("draft", "published", "closed", "archived", name="job_status", create_type=False)
    employment_type = postgresql.ENUM(
        "full_time", "part_time", "contract", "internship", name="employment_type", create_type=False
    )
    application_status = postgresql.ENUM(
        "applied", "shortlisted", "interview", "hired", "rejected", name="application_status", create_type=False
    )

    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    job_status.create(bind, checkfirst=True)
    employment_type.create(bind, checkfirst=True)
    application_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="recruiter"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("required_skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("preferred_skills", sa.Text(), nullable=True),
        sa.Column("experience_level", sa.String(255), nullable=True),
        sa.Column("employment_type", employment_type, nullable=False, server_default="full_time"),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("status", job_status, nullable=False, server_default="draft"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_title", "jobs", ["title"])

    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("cv_text", sa.Text(), nullable=True),
        sa.Column("skills", sa.Text(), nullable=True),
        sa.Column("experience_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_candidates_email"),
    )
    op.create_index("ix_candidates_full_name", "candidates", ["full_name"])
    op.create_index("ix_candidates_email", "candidates", ["email"])

    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("status", application_status, nullable=False, server_default="applied"),
        sa.Column("match_score", sa.Integer(), nullable=True),
        sa.Column("match_explanation", sa.Text(), nullable=True),
        sa.Column("recruiter_notes", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job"),
        sa.CheckConstraint("match_score IS NULL OR (match_score >= 0 AND match_score <= 100)", name="ck_match_score_range"),
    )


def downgrade() -> None:
    op.drop_table("applications")
    op.drop_table("candidates")
    op.drop_table("jobs")
    op.drop_table("users")

    bind = op.get_bind()
    postgresql.ENUM(name="application_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="employment_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="job_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="user_role").drop(bind, checkfirst=True)
