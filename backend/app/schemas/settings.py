from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.ai_settings import AIProvider


class AISettingsUpdate(BaseModel):
    provider: AIProvider | None = None
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None
    clear_api_key: bool = False


class AISettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: AIProvider
    model: str | None
    base_url: str | None
    enabled: bool
    has_api_key: bool
    api_key_masked: str | None
    updated_at: datetime | None


class AISettingsTestResult(BaseModel):
    ok: bool
    message: str
