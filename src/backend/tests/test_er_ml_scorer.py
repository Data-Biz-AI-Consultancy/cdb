from cdb.models.person import Person
from cdb.services.entity_resolution.ml_scorer import compute_ml_match_score


def test_ml_scorer_high_confidence():
    p1 = Person(
        first_name="Alexander",
        last_name="Hamilton",
        primary_email="a.hamilton@treasury.gov",
        country="US",
        city="New York",
    )
    p2 = Person(
        first_name="Alex",
        last_name="Hamilton",
        primary_email="a.hamilton@alumni.columbia.edu",
        country="US",
        city="New York",
    )

    res = compute_ml_match_score(p1, p2)
    assert res.score >= 0.50
    assert "name_similarity" in res.feature_scores
    assert res.feature_scores["email_prefix_similarity"] == 1.0
    assert res.feature_scores["geo_similarity"] == 1.0


def test_ml_scorer_low_confidence():
    p1 = Person(
        first_name="Alice",
        last_name="Smith",
        primary_email="alice@company.com",
        country="US",
    )
    p2 = Person(
        first_name="Bob",
        last_name="Jones",
        primary_email="bob@other.org",
        country="DE",
    )

    res = compute_ml_match_score(p1, p2)
    assert res.score < 0.50
    assert res.confidence_level == "low"
