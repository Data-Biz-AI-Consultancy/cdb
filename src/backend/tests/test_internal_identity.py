"""Single-organization internal identity policy."""

import pytest

from cdb.core.config import Settings
from cdb.core.internal_identity import (
    InternalIdentityPolicy,
    bind_internal_identity_policy,
    get_internal_identity_policy,
    register_internal_identity_policy,
    unregister_internal_identity_policy,
)
from cdb.models.person import Person
from cdb.services.signals.utils.activity import is_last_speaker_host


@pytest.fixture(autouse=True)
def _restore_identity_policy():
    unregister_internal_identity_policy()
    yield
    unregister_internal_identity_policy()


def test_settings_defaults_leave_emails_empty_and_keep_generic_host_tokens():
    assert Settings.model_fields["INTERNAL_EMAIL_DOMAINS"].default_factory() == []
    assert Settings.model_fields["INTERNAL_MEMBER_EMAILS"].default_factory() == []
    assert Settings.model_fields["INTERNAL_HOST_IDENTIFIERS"].default_factory() == ["host", "me"]


def test_settings_accept_comma_separated_identity_lists():
    parsed = Settings(
        INTERNAL_EMAIL_DOMAINS="Acme.com, @Example.com",
        INTERNAL_MEMBER_EMAILS="Ada@Acme.com, ",
        INTERNAL_HOST_IDENTIFIERS="Ops, Host",
    )
    assert parsed.INTERNAL_EMAIL_DOMAINS == ["Acme.com", "@Example.com"]
    assert parsed.INTERNAL_MEMBER_EMAILS == ["Ada@Acme.com"]
    assert parsed.INTERNAL_HOST_IDENTIFIERS == ["Ops", "Host"]


def test_name_and_databiz_address_are_external_by_default(monkeypatch):
    monkeypatch.setattr("cdb.core.config.settings.INTERNAL_EMAIL_DOMAINS", [])
    monkeypatch.setattr("cdb.core.config.settings.INTERNAL_MEMBER_EMAILS", [])
    monkeypatch.setattr("cdb.core.config.settings.INTERNAL_HOST_IDENTIFIERS", ["host", "me"])

    person = Person(
        first_name="Jimmy",
        last_name="Pang",
        primary_email="jimmy@databiz.ai",
        secondary_emails=["jimmy.pang@example.com"],
    )
    assert person.is_internal is False
    assert is_last_speaker_host("Jimmy Pang: let's talk budget") is False
    assert is_last_speaker_host("Databiz: let's talk budget") is False
    assert is_last_speaker_host("Host: let's talk budget") is True
    assert is_last_speaker_host("Me: let's talk budget") is True


def test_explicit_markers_stay_internal_without_a_policy():
    flagged = Person(first_name="Ada", attributes={"is_internal": True})
    tagged = Person(first_name="Grace", attributes={"tags": ["Internal team"]})
    assert flagged.is_internal is True
    assert tagged.is_internal is True


def test_registered_policy_matches_only_configured_emails_domains_and_host_tokens():
    register_internal_identity_policy(
        InternalIdentityPolicy(
            email_domains=("Acme.com",),
            member_emails={"ada@partner.test"},
            host_identifiers=("ops",),
        )
    )

    member = Person(primary_email="Ada@Partner.test")
    domain = Person(primary_email="lee@mail.acme.com")
    outsider = Person(
        first_name="Jimmy",
        last_name="Pang",
        primary_email="jimmy@databiz.ai",
        secondary_emails=["not-ada@partner.test"],
    )
    near_domain = Person(primary_email="lee@notacme.com")

    assert member.is_internal is True
    assert domain.is_internal is True
    assert outsider.is_internal is False
    assert near_domain.is_internal is False

    assert is_last_speaker_host("Ops Lead: following up") is True
    assert is_last_speaker_host("Host: following up") is False
    assert is_last_speaker_host("Jimmy Pang: following up") is False
    assert is_last_speaker_host("Databiz: following up") is False


def test_bound_policy_overrides_the_registered_policy_for_the_current_context():
    register_internal_identity_policy(
        InternalIdentityPolicy(member_emails={"ada@partner.test"}, host_identifiers=("ops",))
    )
    bound = InternalIdentityPolicy(member_emails={"lee@other.test"}, host_identifiers=("host",))

    with bind_internal_identity_policy(bound):
        assert get_internal_identity_policy() is bound
        assert Person(primary_email="lee@other.test").is_internal is True
        assert Person(primary_email="ada@partner.test").is_internal is False
        assert is_last_speaker_host("Host: hello") is True
        assert is_last_speaker_host("Ops: hello") is False

    assert Person(primary_email="ada@partner.test").is_internal is True
    assert Person(primary_email="lee@other.test").is_internal is False


def test_explicit_host_tokens_do_not_read_the_active_policy():
    register_internal_identity_policy(InternalIdentityPolicy(host_identifiers=("ops",)))
    assert is_last_speaker_host("Ops: hello", host_identifiers=("host",)) is False
    assert is_last_speaker_host("Host: hello", host_identifiers=("host",)) is True
