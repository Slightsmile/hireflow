"""ai settings and candidate cv files

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ai_provider = postgresql.ENUM("openai", "anthropic", "gemini", name="ai_provider", create_type=False)

    bind = op.get_bind()
    ai_provider.create(bind, checkfirst=True)

    op.create_table(
        "ai_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", ai_provider, nullable=False, server_default="openai"),
        sa.Column("api_key", sa.Text(), nullable=True),
        sa.Column("model", sa.String(255), nullable=True),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.add_column("candidates", sa.Column("cv_filename", sa.String(255), nullable=True))
    op.add_column("candidates", sa.Column("cv_file_path", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "cv_file_path")
    op.drop_column("candidates", "cv_filename")
    op.drop_table("ai_settings")

    bind = op.get_bind()
    postgresql.ENUM(name="ai_provider").drop(bind, checkfirst=True)
