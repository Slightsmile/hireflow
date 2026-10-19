"""CV-to-job matching using TF-IDF text similarity plus explicit skill overlap.

Approach (documented for README/evaluation):
1. Normalize CV text and job text (lowercase, strip punctuation).
2. Vectorize both documents with TF-IDF (unigrams + bigrams, English stopwords removed).
3. Score textual similarity with cosine similarity, scaled to 0-100.
4. Separately extract required skills (comma-separated) and check literal/substring
   presence in the CV text to compute a skill-coverage score.
5. Final score blends similarity (40%) and skill coverage (60%), since recruiters care
   most about concrete required skills being present.
6. Output lists matched/missing skills and a short human-readable explanation so the
   result is a decision-support aid, not an opaque score.
"""

import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.ai import AIError, score_cv_with_ai

MIN_CV_LENGTH = 30


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s+#.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_skills(skills_text: str | None) -> list[str]:
    if not skills_text:
        return []
    parts = re.split(r"[,;\n]", skills_text)
    return [p.strip() for p in parts if p.strip()]


def skill_present(skill: str, normalized_cv: str) -> bool:
    skill_norm = normalize_text(skill)
    if not skill_norm:
        return False
    return skill_norm in normalized_cv


def compute_text_similarity(cv_text: str, job_text: str) -> float:
    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        matrix = vectorizer.fit_transform([cv_text, job_text])
        if matrix.shape[1] == 0:
            return 0.0
        sim = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        return float(sim)
    except ValueError:
        return 0.0


def match_cv_to_job(
    cv_text: str | None,
    job_description: str,
    required_skills: str | None,
    preferred_skills: str | None = None,
) -> dict:
    cv_text = cv_text or ""
    warning = None
    if len(cv_text.strip()) < MIN_CV_LENGTH:
        warning = "Candidate CV text is very short; match results may be unreliable."

    normalized_cv = normalize_text(cv_text)
    job_combined = " ".join(
        filter(None, [job_description, required_skills or "", preferred_skills or ""])
    )
    normalized_job = normalize_text(job_combined)

    text_similarity = compute_text_similarity(normalized_cv, normalized_job)

    required_list = parse_skills(required_skills)
    matched_skills = [s for s in required_list if skill_present(s, normalized_cv)]
    missing_skills = [s for s in required_list if s not in matched_skills]

    skill_coverage = (len(matched_skills) / len(required_list)) if required_list else text_similarity

    final_score = (0.4 * text_similarity) + (0.6 * skill_coverage)
    match_score = max(0, min(100, round(final_score * 100)))

    if required_list:
        explanation = (
            f"Candidate matches {len(matched_skills)} of {len(required_list)} required skills "
            f"({', '.join(matched_skills) if matched_skills else 'none'}). "
            f"Overall text similarity to the job description is {round(text_similarity * 100)}%."
        )
    else:
        explanation = (
            f"No structured required skills were provided; score is based on overall text "
            f"similarity to the job description ({round(text_similarity * 100)}%)."
        )

    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "explanation": explanation,
        "warning": warning,
    }


def score_candidate(
    cv_text: str | None,
    job_description: str,
    required_skills: str | None,
    preferred_skills: str | None = None,
    job_title: str = "",
    ai_config=None,
) -> dict:
    """Score one candidate against a job.

    Uses the configured AI provider when available, otherwise (or if the provider
    call fails) falls back to the deterministic TF-IDF matcher. The returned dict
    always includes an ``engine`` key: ``"ai"`` or ``"tfidf"``.
    """
    if ai_config is not None and getattr(ai_config, "api_key", None):
        try:
            result = score_cv_with_ai(
                cv_text=cv_text,
                job_title=job_title,
                job_description=job_description,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                config=ai_config,
            )
            result["engine"] = "ai"
            return result
        except AIError:
            pass

    result = match_cv_to_job(cv_text, job_description, required_skills, preferred_skills)
    result["engine"] = "tfidf"
    return result
