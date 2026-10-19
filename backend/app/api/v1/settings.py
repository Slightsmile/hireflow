from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.ai_settings import AIProvider, AISettings, get_ai_settings
from app.models.user import User
from app.schemas.settings import AISettingsOut, AISettingsTestResult, AISettingsUpdate
from app.services.ai import test_connection

router = APIRouter()


def _mask(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) <= 8:
        return "\u2022" * len(key)
    return f"{key[:4]}\u2026{key[-4:]}"


def _to_out(row: AISettings | None) -> AISettingsOut:
    if row is None:
        return AISettingsOut(
            provider=AIProvider.OPENAI,
            model=None,
            base_url=None,
            enabled=False,
            has_api_key=False,
            api_key_masked=None,
            updated_at=None,
        )
    return AISettingsOut(
        provider=row.provider,
        model=row.model,
        base_url=row.base_url,
        enabled=bool(row.api_key),
        has_api_key=bool(row.api_key),
        api_key_masked=_mask(row.api_key),
        updated_at=row.updated_at,
    )


@router.get("/ai", response_model=AISettingsOut)
def get_ai_configuration(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return _to_out(get_ai_settings(db))


@router.put("/ai", response_model=AISettingsOut)
def update_ai_configuration(
    payload: AISettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    row = get_ai_settings(db)
    if row is None:
        row = AISettings(provider=AIProvider.OPENAI)
        db.add(row)

    if payload.provider is not None:
        row.provider = payload.provider
    if payload.model is not None:
        row.model = payload.model.strip() or None
    if payload.base_url is not None:
        row.base_url = payload.base_url.strip() or None
    if payload.clear_api_key:
        row.api_key = None
    elif payload.api_key:
        row.api_key = payload.api_key.strip()

    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/ai/test", response_model=AISettingsTestResult)
def test_ai_configuration(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    row = get_ai_settings(db)
    if row is None or not row.api_key:
        return AISettingsTestResult(ok=False, message="Save an API key before testing the connection.")
    ok, message = test_connection(row)
    return AISettingsTestResult(ok=ok, message=message)
