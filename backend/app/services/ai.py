"""AI-backed CV-to-job scoring.

The admin configures a provider (OpenAI-compatible, Anthropic, or Gemini), an API
key, an optional model and an optional base URL on the Settings page. This module
turns an AISettings row into a single structured score for one candidate/job pair.

Any network, auth, or parsing problem raises ``AIError`` so the caller can fall
back to the deterministic TF-IDF matcher in ``app.services.matching``.
"""

import json
import re

import httpx

TIMEOUT = 30.0

DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-sonnet-latest",
    "gemini": "gemini-1.5-flash",
}
DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
}

SYSTEM_PROMPT = (
    "You are an expert technical recruiter and CV screening assistant. You compare a "
    "candidate's CV against a job's requirements and return a structured, explainable "
    "assessment. You provide decision support only and never make a hiring decision."
)

RESULT_INSTRUCTIONS = (
    "Respond with ONLY a JSON object (no markdown, no commentary) using exactly this shape:\n"
    "{\n"
    '  "match_score": <integer 0-100>,\n'
    '  "matched_skills": [<required skills clearly evidenced in the CV>],\n'
    '  "missing_skills": [<required skills not evidenced in the CV>],\n'
    '  "explanation": "<2-3 sentence justification of the score>"\n'
    "}\n"
    "Score how well the CV satisfies the job, weighting concrete required skills most "
    "heavily. Do not inflate the score for keyword stuffing; judge real evidence."
)


class AIError(Exception):
    pass


def _provider_name(config) -> str:
    provider = getattr(config, "provider", None)
    return getattr(provider, "value", str(provider))


def _build_user_prompt(
    cv_text: str,
    job_title: str,
    job_description: str,
    required_skills: str | None,
    preferred_skills: str | None,
) -> str:
    return (
        f"JOB TITLE:\n{job_title or 'N/A'}\n\n"
        f"JOB DESCRIPTION:\n{job_description or 'N/A'}\n\n"
        f"REQUIRED SKILLS:\n{required_skills or 'N/A'}\n\n"
        f"PREFERRED SKILLS:\n{preferred_skills or 'N/A'}\n\n"
        f"CANDIDATE CV:\n{cv_text or '(empty CV)'}\n\n"
        f"{RESULT_INSTRUCTIONS}"
    )


def score_cv_with_ai(
    cv_text: str | None,
    job_title: str,
    job_description: str,
    required_skills: str | None,
    preferred_skills: str | None,
    config,
) -> dict:
    if not config or not getattr(config, "api_key", None):
        raise AIError("AI scoring is not configured")

    user_prompt = _build_user_prompt(
        cv_text or "", job_title, job_description, required_skills, preferred_skills
    )
    provider = _provider_name(config)
    if provider == "openai":
        raw = _call_openai(config, user_prompt)
    elif provider == "anthropic":
        raw = _call_anthropic(config, user_prompt)
    elif provider == "gemini":
        raw = _call_gemini(config, user_prompt)
    else:
        raise AIError(f"Unsupported AI provider: {provider}")

    return _parse_result(raw)


def test_connection(config) -> tuple[bool, str]:
    try:
        score_cv_with_ai(
            cv_text="Test CV: a backend engineer with five years of Python experience.",
            job_title="Backend Engineer",
            job_description="Build and maintain REST APIs in Python.",
            required_skills="Python",
            preferred_skills=None,
            config=config,
        )
    except AIError as exc:
        return False, str(exc)
    return True, "Connection successful. The AI provider responded with a valid score."


def _model_for(config, provider: str) -> str:
    return config.model or DEFAULT_MODELS[provider]


def _post(url: str, *, headers: dict, json_body: dict) -> dict:
    try:
        response = httpx.post(url, headers=headers, json=json_body, timeout=TIMEOUT)
    except httpx.HTTPError as exc:
        raise AIError(f"Could not reach the AI provider: {exc}") from exc
    if response.status_code >= 400:
        raise AIError(f"AI provider returned HTTP {response.status_code}: {response.text[:200]}")
    try:
        return response.json()
    except ValueError as exc:
        raise AIError("AI provider returned a non-JSON response") from exc


def _call_openai(config, user_prompt: str) -> str:
    base = (config.base_url or DEFAULT_BASE_URLS["openai"]).rstrip("/")
    data = _post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {config.api_key}", "Content-Type": "application/json"},
        json_body={
            "model": _model_for(config, "openai"),
            "temperature": 0,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        },
    )
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIError("Unexpected response shape from the AI provider") from exc


def _call_anthropic(config, user_prompt: str) -> str:
    base = (config.base_url or DEFAULT_BASE_URLS["anthropic"]).rstrip("/")
    data = _post(
        f"{base}/v1/messages",
        headers={
            "x-api-key": config.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json_body={
            "model": _model_for(config, "anthropic"),
            "max_tokens": 1024,
            "temperature": 0,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
        },
    )
    try:
        blocks = data["content"]
        text = "".join(block.get("text", "") for block in blocks if block.get("type") == "text")
    except (KeyError, TypeError) as exc:
        raise AIError("Unexpected response shape from the AI provider") from exc
    if not text:
        raise AIError("AI provider returned an empty response")
    return text


def _call_gemini(config, user_prompt: str) -> str:
    base = (config.base_url or DEFAULT_BASE_URLS["gemini"]).rstrip("/")
    url = f"{base}/models/{_model_for(config, 'gemini')}:generateContent?key={config.api_key}"
    data = _post(
        url,
        headers={"Content-Type": "application/json"},
        json_body={
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0},
        },
    )
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIError("Unexpected response shape from the AI provider") from exc


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```[A-Za-z0-9]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_result(raw: str) -> dict:
    text = _strip_fences(raw or "")
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise AIError("AI response did not contain a JSON object")
        try:
            obj = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise AIError("AI response contained invalid JSON") from exc

    if not isinstance(obj, dict):
        raise AIError("AI response was not a JSON object")

    try:
        score = int(round(float(obj.get("match_score"))))
    except (TypeError, ValueError) as exc:
        raise AIError("AI response did not include a numeric match_score") from exc

    matched = [str(s).strip() for s in obj.get("matched_skills", []) if str(s).strip()]
    missing = [str(s).strip() for s in obj.get("missing_skills", []) if str(s).strip()]
    explanation = str(obj.get("explanation") or "").strip() or "AI-generated match assessment."

    return {
        "match_score": max(0, min(100, score)),
        "matched_skills": matched,
        "missing_skills": missing,
        "explanation": explanation,
        "warning": None,
    }
