from dataclasses import dataclass, field

import jellyfish

from cdb.models.person import Person
from cdb.services.entity_resolution.normalise import (
    email_prefix,
    normalise_email,
    normalise_name,
    normalise_phone,
)


@dataclass
class MLScoreResult:
    score: float
    confidence_level: str  # "high" (>=0.85), "medium" (0.50-0.84), "low" (<0.50)
    feature_scores: dict[str, float] = field(default_factory=dict)


def compute_ml_match_score(
    person_a: Person,
    person_b: Person,
    company_domain_a: str | None = None,
    company_domain_b: str | None = None,
) -> MLScoreResult:
    """
    Computes a probabilistic match score [0.0, 1.0] across feature vectors:
    - Name similarity (0.35)
    - Email prefix similarity (0.25)
    - Company / domain overlap (0.20)
    - GEO / location match (0.10)
    - Handles & phone match (0.10)
    """
    features: dict[str, float] = {}

    # 1. Name similarity (Weight 0.35)
    first_a = normalise_name(person_a.first_name) or ""
    last_a = normalise_name(person_a.last_name) or ""
    full_name_a = f"{first_a} {last_a}".strip()

    first_b = normalise_name(person_b.first_name) or ""
    last_b = normalise_name(person_b.last_name) or ""
    full_name_b = f"{first_b} {last_b}".strip()

    name_score = 0.0
    if full_name_a and full_name_b:
        name_score = float(jellyfish.jaro_winkler_similarity(full_name_a, full_name_b))
    elif first_a and first_b:
        name_score = float(jellyfish.jaro_winkler_similarity(first_a, first_b)) * 0.7
    features["name_similarity"] = round(name_score, 4)

    # 2. Email prefix similarity (Weight 0.25)
    pref_a = email_prefix(person_a.primary_email)
    pref_b = email_prefix(person_b.primary_email)
    email_pref_score = 0.0
    if pref_a and pref_b:
        if pref_a == pref_b:
            email_pref_score = 1.0
        else:
            email_pref_score = float(jellyfish.jaro_winkler_similarity(pref_a, pref_b))
    elif normalise_email(person_a.primary_email) and normalise_email(person_b.primary_email):
        if normalise_email(person_a.primary_email) == normalise_email(person_b.primary_email):
            email_pref_score = 1.0
    features["email_prefix_similarity"] = round(email_pref_score, 4)

    # 3. Company / domain overlap (Weight 0.20)
    company_score = 0.0
    if company_domain_a and company_domain_b:
        dom_a = company_domain_a.strip().lower()
        dom_b = company_domain_b.strip().lower()
        if dom_a == dom_b:
            company_score = 1.0
        else:
            company_score = float(jellyfish.jaro_winkler_similarity(dom_a, dom_b))
    features["company_similarity"] = round(company_score, 4)

    # 4. GEO / location match (Weight 0.10)
    geo_score = 0.0
    country_a = (person_a.country or "").strip().upper()
    country_b = (person_b.country or "").strip().upper()
    city_a = (person_a.city or "").strip().lower()
    city_b = (person_b.city or "").strip().lower()

    if country_a and country_b and country_a == country_b:
        geo_score += 0.5
        if city_a and city_b and city_a == city_b:
            geo_score += 0.5
    features["geo_similarity"] = round(geo_score, 4)

    # 5. Handles & phone match (Weight 0.10)
    handle_score = 0.0
    phone_a = normalise_phone(person_a.primary_phone)
    phone_b = normalise_phone(person_b.primary_phone)
    if phone_a and phone_b and phone_a == phone_b:
        handle_score = 1.0
    else:
        tw_a = (person_a.twitter_handle or "").strip().lower()
        tw_b = (person_b.twitter_handle or "").strip().lower()
        if tw_a and tw_b and tw_a == tw_b:
            handle_score = 1.0
    features["handles_phone_similarity"] = round(handle_score, 4)

    # Weighted composite score
    total_score = (
        name_score * 0.35
        + email_pref_score * 0.25
        + company_score * 0.20
        + geo_score * 0.10
        + handle_score * 0.10
    )
    total_score = round(min(max(total_score, 0.0), 1.0), 4)

    if total_score >= 0.85:
        confidence = "high"
    elif total_score >= 0.50:
        confidence = "medium"
    else:
        confidence = "low"

    return MLScoreResult(
        score=total_score,
        confidence_level=confidence,
        feature_scores=features,
    )
