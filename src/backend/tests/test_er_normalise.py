from cdb.services.entity_resolution.normalise import (
    email_prefix,
    normalise_email,
    normalise_linkedin_url,
    normalise_name,
    normalise_phone,
)


def test_normalise_email():
    assert normalise_email("  Alice@Example.COM  ") == "alice@example.com"
    assert normalise_email("fake@linkedin.user") is None
    assert normalise_email("invalid-email") is None
    assert normalise_email(None) is None


def test_normalise_linkedin_url():
    assert (
        normalise_linkedin_url("https://www.linkedin.com/in/alice-smith/")
        == "linkedin.com/in/alice-smith"
    )
    assert normalise_linkedin_url("http://linkedin.com/in/bob") == "linkedin.com/in/bob"
    assert normalise_linkedin_url("https://google.com") is None
    assert normalise_linkedin_url(None) is None


def test_normalise_phone():
    assert normalise_phone("+44 (0) 7911 123456") == "+4407911123456"
    assert normalise_phone("123") is None
    assert normalise_phone("07911 123456") == "07911123456"
    assert normalise_phone(None) is None


def test_normalise_name():
    assert normalise_name("  John Doe  ") == "john doe"
    assert normalise_name("") is None
    assert normalise_name(None) is None


def test_email_prefix():
    assert email_prefix("alice123@example.com") == "alice"
    assert email_prefix("al123@example.com") is None
    assert email_prefix("bob.smith@example.com") == "bob.smith"
    assert email_prefix(None) is None


def test_clean_company_name():
    from cdb.services.entity_resolution.normalise import clean_company_name

    assert clean_company_name("Acme Corp.") == "Acme"
    assert clean_company_name("BioTech GmbH & Co. KG") == "BioTech"
    assert clean_company_name("Global Solutions LLC") == "Global Solutions"
    assert clean_company_name("Startup Inc") == "Startup"
    assert clean_company_name("") == ""
    assert clean_company_name(None) == ""


def test_generate_company_domain():
    from cdb.services.entity_resolution.normalise import generate_company_domain

    assert generate_company_domain("Acme Corp.") == "acme.com"
    assert generate_company_domain("BioTech GmbH & Co. KG") == "biotech.com"
    assert generate_company_domain("") == ""
    assert generate_company_domain(None) == ""
