import re
from collections.abc import Sequence
from uuid import UUID

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.services.entity_resolution.normalise import normalise_text_tokens

FIRST_NAME_STOPWORDS = {
    "ai",
    "anthropic",
    "attention",
    "brand",
    "business",
    "call",
    "catchup",
    "chat",
    "chatgpt",
    "check",
    "claude",
    "client",
    "coffee",
    "consulting",
    "daily",
    "data",
    "founder",
    "founders",
    "foundation",
    "gemini",
    "google",
    "group",
    "growth",
    "helping",
    "hustle",
    "idea",
    "interview",
    "intro",
    "lead",
    "marketing",
    "meeting",
    "meetup",
    "monthly",
    "online",
    "openai",
    "overview",
    "owner",
    "owners",
    "paying",
    "plan",
    "planning",
    "product",
    "quality",
    "review",
    "round",
    "sales",
    "sync",
    "team",
    "tech",
    "test",
    "the",
    "time",
    "weekly",
    "welcome",
}

COMPANY_STOPWORDS = {
    "best",
    "consulting",
    "core",
    "data",
    "deal",
    "free",
    "gmbh",
    "good",
    "group",
    "hero",
    "inc",
    "lead",
    "line",
    "link",
    "llc",
    "next",
    "open",
    "peak",
    "plus",
    "real",
    "star",
    "team",
    "tech",
    "true",
    "view",
    "work",
}


def clean_meeting_title(raw_title: str | None) -> str:
    """Strips trailing ISO timestamp suffixes from Notion meeting note titles."""
    if not raw_title:
        return "Notion Meeting Note"
    cleaned = re.sub(r"\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*$", "", raw_title).strip()
    return cleaned or raw_title.strip()


class NotionAttendeeIndex:
    """Pre-indexed lookup for fast, accurate person and company resolution for Notion notes."""

    def __init__(
        self,
        persons: Sequence[Person],
        companies: Sequence[Company],
        person_companies: dict[UUID, list[str]],
        person_company_ids: dict[UUID, UUID],
    ):
        self.persons = persons
        self.companies = companies
        self.person_companies = person_companies
        self.person_company_ids = person_company_ids

        self.persons_by_id: dict[UUID, Person] = {p.id: p for p in persons}
        self.persons_by_first_name: dict[str, list[Person]] = {}
        self.persons_by_last_name: dict[str, list[Person]] = {}
        self.first_name_counts: dict[str, int] = {}

        self.default_host_person: Person | None = None
        for p in persons:
            fn = normalise_text_tokens(p.first_name)
            ln = normalise_text_tokens(p.last_name)
            if fn:
                self.persons_by_first_name.setdefault(fn, []).append(p)
                self.first_name_counts[fn] = self.first_name_counts.get(fn, 0) + 1
            if ln:
                self.persons_by_last_name.setdefault(ln, []).append(p)

            if fn == "jimmy" and ln == "pang":
                self.default_host_person = p

        if not self.default_host_person and persons:
            self.default_host_person = persons[0]

    def resolve_meeting(
        self,
        title: str | None,
        attendees: str | None,
        url: str | None,
        content: str | None,
    ) -> tuple[UUID | None, UUID | None, str]:
        """
        Resolves (matched_person_id, matched_company_id, clean_title).
        Prioritization:
        1. Full name match (accent-stripped, word-boundary, non-host prioritized)
        2. First name + company match
        3. Unique distinctive first name match in title
        4. Host Jimmy Pang fallback
        5. Company match from person or title
        6. Default person fallback to satisfy DB constraints
        """
        clean_title = clean_meeting_title(title)
        title_norm = normalise_text_tokens(clean_title)
        attendees_norm = normalise_text_tokens(attendees)
        url_norm = normalise_text_tokens(url)
        content_snippet = normalise_text_tokens((content or "")[:1000])

        title_url_corpus = f"{attendees_norm} {title_norm} {url_norm}"
        search_corpus = f"{title_url_corpus} {content_snippet}"

        tokens = set(search_corpus.split())
        relevant_persons_set: set[Person] = set()
        for tok in tokens:
            if tok in self.persons_by_first_name:
                relevant_persons_set.update(self.persons_by_first_name[tok])
            if tok in self.persons_by_last_name:
                relevant_persons_set.update(self.persons_by_last_name[tok])

        matched_person: Person | None = None
        jimmy_person: Person | None = None

        # 1. Full name matches (First + Last or Last + First)
        candidates: list[tuple[bool, int, Person]] = []
        for p in relevant_persons_set:
            fn = normalise_text_tokens(p.first_name)
            ln = normalise_text_tokens(p.last_name)
            if fn and ln and len(fn) >= 2 and len(ln) >= 2:
                full = f"{fn} {ln}"
                rev_full = f"{ln} {fn}"
                if re.search(rf"\b{re.escape(full)}\b", search_corpus) or re.search(
                    rf"\b{re.escape(rev_full)}\b", search_corpus
                ):
                    in_title_or_att = bool(
                        re.search(rf"\b{re.escape(full)}\b", title_url_corpus)
                        or re.search(rf"\b{re.escape(rev_full)}\b", title_url_corpus)
                    )
                    candidates.append((in_title_or_att, len(full), p))

        if candidates:
            # Sort: in title/attendees/url first, then longest full name
            candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
            for _in_title_or_att, _length, p in candidates:
                fn = normalise_text_tokens(p.first_name)
                ln = normalise_text_tokens(p.last_name)
                if fn == "jimmy" and ln == "pang":
                    jimmy_person = p
                else:
                    matched_person = p
                    break

        # 2. First name + Company affiliation match
        if not matched_person:
            title_tokens = set(title_url_corpus.split())
            for tok in title_tokens:
                if (
                    tok in self.persons_by_first_name
                    and tok != "jimmy"
                    and tok not in FIRST_NAME_STOPWORDS
                ):
                    for p in self.persons_by_first_name[tok]:
                        p_comps = self.person_companies.get(p.id, [])
                        if any(
                            re.search(rf"\b{re.escape(comp)}\b", search_corpus)
                            for comp in p_comps
                            if len(comp) >= 4 and comp not in COMPANY_STOPWORDS
                        ):
                            matched_person = p
                            break
                    if matched_person:
                        break

        # 3. Unique distinctive first name in title
        if not matched_person:
            title_tokens = set(title_norm.split())
            for tok in title_tokens:
                if (
                    tok in self.persons_by_first_name
                    and tok != "jimmy"
                    and tok not in FIRST_NAME_STOPWORDS
                    and self.first_name_counts.get(tok, 0) == 1
                ):
                    matched_person = self.persons_by_first_name[tok][0]
                    break

        # 4. Host fallback if host was in the meeting
        if not matched_person and jimmy_person:
            matched_person = jimmy_person

        # 5. Company resolution
        matched_company_id: UUID | None = None
        if matched_person and matched_person.id in self.person_company_ids:
            matched_company_id = self.person_company_ids[matched_person.id]

        if not matched_company_id:
            for c in self.companies:
                cname = normalise_text_tokens(c.name)
                if cname and len(cname) >= 4 and cname not in COMPANY_STOPWORDS:
                    if re.search(rf"\b{re.escape(cname)}\b", title_url_corpus):
                        matched_company_id = c.id
                        break

        # 6. Fallback to default host if neither person nor company matched
        default_person_id = self.default_host_person.id if self.default_host_person else None
        final_person_id = (
            matched_person.id
            if matched_person
            else (default_person_id if not matched_company_id else None)
        )

        return final_person_id, matched_company_id, clean_title
