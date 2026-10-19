import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base
from app.db.types import GUID


class AIProvider(str, enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


class AISettings(Base):
    __tablename__ = "ai_settings"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    provider: Mapped[AIProvider] = mapped_column(
        Enum(AIProvider, name="ai_provider", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=AIProvider.OPENAI,
    )
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


def get_ai_settings(db) -> AISettings | None:
    return db.query(AISettings).order_by(AISettings.updated_at.desc()).first()
