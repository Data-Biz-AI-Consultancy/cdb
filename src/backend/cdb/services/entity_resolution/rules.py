from dataclasses import dataclass, field
from typing import Any

import jellyfish

from cdb.models.person import Person
from cdb.services.entity_resolution.ml_scorer import compute_ml_match_score
from cdb.services.entity_resolution.normalise import (
    email_prefix,
    normalise_email,
    normalise_linkedin_url,
    normalise_name,
    normalise_phone,
)


@dataclass
class MatchResult:
    matched: bool
    outcome: str  # "auto_merge" | "review_queue" | "no_match"
    confidence: str  # "high" | "medium" | "low" | "none"
    trigger_rule: int | None
    match_signals: dict[str, Any]
    ml_score: float | None = None
    ml_features: dict[str, float] = field(default_factory=dict)


def evaluate_person_match(
    person_a: Person,
    person_b: Person,
    company_domain_a: str | None = None,
    company_domain_b: str | None = None,
) -> MatchResult:
    signals: dict[str, Any] = {}

    # Compute ML probabilistic score
    ml_res = compute_ml_match_score(
        person_a, person_b, company_domain_a, company_domain_b
    )
    signals["ml_score"] = ml_res.score
    signals["ml_features"] = ml_res.feature_scores

    # 1. Email exact match
    email_a = normalise_email(person_a.primary_email)
    email_b = normalise_email(person_b.primary_email)
    if email_a and email_b and email_a == email_b:
        signals["email_match"] = True
        signals["trigger_rule"] = 1
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="high",
            trigger_rule=1,
            match_signals=signals,
            ml_score=1.0,
            ml_features=ml_res.feature_scores,
        )

    # Check secondary emails
    all_emails_a = set([email_a] if email_a else [])
    for e in (person_a.secondary_emails or []):
        norm = normalise_email(e)
        if norm:
            all_emails_a.add(norm)

    all_emails_b = set([email_b] if email_b else [])
    for e in (person_b.secondary_emails or []):
        norm = normalise_email(e)
        if norm:
            all_emails_b.add(norm)

    if all_emails_a.intersection(all_emails_b):
        signals["secondary_email_match"] = True
        signals["trigger_rule"] = 1
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="high",
            trigger_rule=1,
            match_signals=signals,
            ml_score=1.0,
            ml_features=ml_res.feature_scores,
        )

    # 2. LinkedIn URL exact match
    li_a = normalise_linkedin_url(person_a.linkedin_url)
    li_b = normalise_linkedin_url(person_b.linkedin_url)
    if li_a and li_b and li_a == li_b:
        signals["linkedin_url_match"] = True
        signals["trigger_rule"] = 2
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="high",
            trigger_rule=2,
            match_signals=signals,
            ml_score=1.0,
            ml_features=ml_res.feature_scores,
        )

    # 3. Phone exact match
    phone_a = normalise_phone(person_a.primary_phone)
    phone_b = normalise_phone(person_b.primary_phone)
    if phone_a and phone_b and phone_a == phone_b:
        signals["phone_match"] = True
        signals["trigger_rule"] = 3
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="high",
            trigger_rule=3,
            match_signals=signals,
            ml_score=1.0,
            ml_features=ml_res.feature_scores,
        )

    # Prepare names for fuzzy matching
    first_a = normalise_name(person_a.first_name) or ""
    last_a = normalise_name(person_a.last_name) or ""
    full_name_a = f"{first_a} {last_a}".strip()

    first_b = normalise_name(person_b.first_name) or ""
    last_b = normalise_name(person_b.last_name) or ""
    full_name_b = f"{first_b} {last_b}".strip()

    name_sim = 0.0
    if full_name_a and full_name_b:
        name_sim = jellyfish.jaro_winkler_similarity(full_name_a, full_name_b)
        signals["name_similarity"] = round(float(name_sim), 4)

    # 4. Email prefix + full name (prefix >= 5 chars and Jaro-Winkler >= 0.95)
    pref_a = email_prefix(person_a.primary_email)
    pref_b = email_prefix(person_b.primary_email)
    if pref_a and pref_b and pref_a == pref_b and name_sim >= 0.95:
        signals["email_prefix_match"] = True
        signals["trigger_rule"] = 4
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="medium",
            trigger_rule=4,
            match_signals=signals,
            ml_score=ml_res.score,
            ml_features=ml_res.feature_scores,
        )

    # 5. Full name + company domain (Jaro-Winkler >= 0.92 and company domain match)
    if company_domain_a and company_domain_b:
        dom_a = company_domain_a.strip().lower()
        dom_b = company_domain_b.strip().lower()
        if dom_a and dom_b and dom_a == dom_b and name_sim >= 0.92:
            signals["company_domain_match"] = True
            signals["trigger_rule"] = 5
            return MatchResult(
                matched=True,
                outcome="auto_merge",
                confidence="medium",
                trigger_rule=5,
                match_signals=signals,
                ml_score=ml_res.score,
                ml_features=ml_res.feature_scores,
            )

    # 6. Full name only (Jaro-Winkler >= 0.95) -> Review Queue
    if name_sim >= 0.95:
        signals["trigger_rule"] = 6
        return MatchResult(
            matched=True,
            outcome="review_queue",
            confidence="low",
            trigger_rule=6,
            match_signals=signals,
            ml_score=ml_res.score,
            ml_features=ml_res.feature_scores,
        )

    # 7. Fallback to ML Probabilistic threshold
    if ml_res.score >= 0.85:
        signals["trigger_rule"] = 7
        signals["ml_auto_merge"] = True
        return MatchResult(
            matched=True,
            outcome="auto_merge",
            confidence="high",
            trigger_rule=7,
            match_signals=signals,
            ml_score=ml_res.score,
            ml_features=ml_res.feature_scores,
        )
    elif ml_res.score >= 0.50:
        signals["trigger_rule"] = 7
        signals["ml_review_queue"] = True
        return MatchResult(
            matched=True,
            outcome="review_queue",
            confidence="medium",
            trigger_rule=7,
            match_signals=signals,
            ml_score=ml_res.score,
            ml_features=ml_res.feature_scores,
        )

    return MatchResult(
        matched=False,
        outcome="no_match",
        confidence="none",
        trigger_rule=None,
        match_signals=signals,
        ml_score=ml_res.score,
        ml_features=ml_res.feature_scores,
    )

