import re


def normalise_email(raw: str | None) -> str | None:
    if not raw:
        return None
    email = raw.strip().lower()
    # Reject known placeholder / invalid emails
    if "@linkedin.user" in email or "invalid" in email or "@" not in email:
        return None
    return email


def normalise_linkedin_url(raw: str | None) -> str | None:
    if not raw:
        return None
    url = raw.strip()
    # Strip scheme and www, strip trailing slash
    url = re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
    # Must look like a LinkedIn profile path
    if not url.startswith("linkedin.com/in/"):
        return None
    return url.lower()


def normalise_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    # Strip all non-digit characters except leading +
    raw_stripped = raw.strip()
    has_plus = raw_stripped.startswith("+")
    digits = re.sub(r"\D", "", raw_stripped)
    if len(digits) < 7:
        return None
    return f"+{digits}" if has_plus else digits


def normalise_name(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = raw.strip().lower()
    return cleaned if cleaned else None


def email_prefix(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local = email.split("@")[0].lower()
    stripped = re.sub(r"\d+$", "", local)
    return stripped if len(stripped) >= 5 else None


LEGAL_SUFFIX_REGEX = re.compile(
    r"\b(gmbh\s*&\s*co\.?\s*kg|gmbh|co\.?\s*kg|se|inc\.?|corp\.?|corporation|llc|ltd\.?|limited|ag|pty\s*ltd\.?|s\.?a\.?|plc|b\.?v\.?)\b",
    re.IGNORECASE,
)


def clean_company_name(raw_name: str | None) -> str:
    if not raw_name:
        return ""
    name = raw_name.strip()
    name = LEGAL_SUFFIX_REGEX.sub("", name)
    name = re.sub(r"[\s,\.-]+$", "", name).strip()
    return name or raw_name.strip()


def generate_company_domain(company_name: str | None) -> str:
    cleaned_name = clean_company_name(company_name)
    if not cleaned_name:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "", cleaned_name).lower()
    return f"{cleaned}.com" if cleaned else ""
