from cdb.models.person import Person
from cdb.services.entity_resolution.rules import evaluate_person_match


def test_er_rule1_email_match():
    p1 = Person(first_name="Alice", last_name="Smith", primary_email="alice@acme.com")
    p2 = Person(first_name="Alicia", last_name="Smith", primary_email="alice@acme.com")
    res = evaluate_person_match(p1, p2)
    assert res.matched is True
    assert res.outcome == "auto_merge"
    assert res.trigger_rule == 1


def test_er_rule2_linkedin_match():
    p1 = Person(first_name="Alice", last_name="Smith", linkedin_url="linkedin.com/in/alicesmith")
    p2 = Person(first_name="Alice", last_name="S", linkedin_url="https://www.linkedin.com/in/alicesmith/")
    res = evaluate_person_match(p1, p2)
    assert res.matched is True
    assert res.outcome == "auto_merge"
    assert res.trigger_rule == 2


def test_er_rule3_phone_match():
    p1 = Person(first_name="Alice", last_name="Smith", primary_phone="+44 7911 123456")
    p2 = Person(first_name="Alice", last_name="Smith", primary_phone="+447911123456")
    res = evaluate_person_match(p1, p2)
    assert res.matched is True
    assert res.outcome == "auto_merge"
    assert res.trigger_rule == 3


def test_er_rule5_name_and_company_domain():
    p1 = Person(first_name="Alice", last_name="Smith")
    p2 = Person(first_name="Alice", last_name="Smith")
    res = evaluate_person_match(p1, p2, company_domain_a="acme.com", company_domain_b="acme.com")
    assert res.matched is True
    assert res.outcome == "auto_merge"
    assert res.trigger_rule == 5


def test_er_rule6_name_only_review_queue():
    p1 = Person(first_name="Alice", last_name="Smith")
    p2 = Person(first_name="Alice", last_name="Smyth")
    res = evaluate_person_match(p1, p2)
    assert res.matched is True
    assert res.outcome == "review_queue"
    assert res.trigger_rule == 6


def test_er_no_match():
    p1 = Person(first_name="Alice", last_name="Smith", primary_email="alice@acme.com")
    p2 = Person(first_name="Bob", last_name="Jones", primary_email="bob@acme.com")
    res = evaluate_person_match(p1, p2)
    assert res.matched is False
    assert res.outcome == "no_match"
