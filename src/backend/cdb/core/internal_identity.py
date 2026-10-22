"""Single-organization internal identity.

Core serves one organization per database. Email domains, exact member emails,
and host-name tokens come from settings unless an embedding process registers
or binds a replacement. Schema routing and tenant registries stay outside core.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass

from cdb.core.config import settings


def _clean(value: str | None) -> str:
    return (value or "").strip().lower()


def _unique(values: list[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            ordered.append(value)
    return tuple(ordered)


@dataclass(frozen=True, slots=True)
class InternalIdentityPolicy:
    """Emails, domains, and host-name tokens that count as this organization."""

    email_domains: tuple[str, ...] = ()
    member_emails: frozenset[str] = frozenset()
    host_identifiers: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        domains = _unique([_clean(domain).lstrip("@") for domain in self.email_domains])
        emails = frozenset(_clean(email) for email in self.member_emails if _clean(email))
        tokens = _unique([_clean(token) for token in self.host_identifiers])
        object.__setattr__(self, "email_domains", domains)
        object.__setattr__(self, "member_emails", emails)
        object.__setattr__(self, "host_identifiers", tokens)

    def matches_email(self, email: str | None) -> bool:
        """True for an exact member email or a configured domain suffix."""
        normalised = _clean(email)
        if not normalised:
            return False
        if normalised in self.member_emails:
            return True
        host = normalised.rpartition("@")[2]
        if not host:
            return False
        return any(host == domain or host.endswith(f".{domain}") for domain in self.email_domains)

    def matches_host_name(self, speaker: str | None) -> bool:
        """True when a host-name token occurs in the speaker label."""
        lowered = _clean(speaker)
        if not lowered:
            return False
        return any(token in lowered for token in self.host_identifiers)


_registered_policy: InternalIdentityPolicy | None = None
internal_identity_policy_context: ContextVar[InternalIdentityPolicy | None] = ContextVar(
    "internal_identity_policy",
    default=None,
)


def default_internal_identity_policy() -> InternalIdentityPolicy:
    """Policy derived from the current core settings."""
    return InternalIdentityPolicy(
        email_domains=tuple(settings.INTERNAL_EMAIL_DOMAINS),
        member_emails=frozenset(settings.INTERNAL_MEMBER_EMAILS),
        host_identifiers=tuple(settings.INTERNAL_HOST_IDENTIFIERS),
    )


def register_internal_identity_policy(policy: InternalIdentityPolicy) -> None:
    """Replace the process-wide default. Self-hosted core does not call this."""
    global _registered_policy
    _registered_policy = policy


def unregister_internal_identity_policy() -> None:
    """Restore the settings-derived process default."""
    global _registered_policy
    _registered_policy = None


def get_internal_identity_policy() -> InternalIdentityPolicy:
    """Active policy: bound context, then the registered default, then settings."""
    bound = internal_identity_policy_context.get()
    if bound is not None:
        return bound
    if _registered_policy is not None:
        return _registered_policy
    return default_internal_identity_policy()


@contextmanager
def bind_internal_identity_policy(
    policy: InternalIdentityPolicy,
) -> Iterator[InternalIdentityPolicy]:
    """Bind a policy for the current context and restore the previous value after."""
    token = internal_identity_policy_context.set(policy)
    try:
        yield policy
    finally:
        internal_identity_policy_context.reset(token)
