import dataclasses
import logging
import re
from collections.abc import Sequence
from uuid import UUID

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.services.entity_resolution.normalise import normalise_text_tokens

logger = logging.getLogger(__name__)

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


@dataclasses.dataclass
class ExtractedEntity:
    person_id: UUID | None
    name: str
    first_name: str
    last_name: str | None
    role: str  # 'interviewer', 'recruiter', 'hiring_manager', 'attendee', 'host', 'counterparty'
    company_id: UUID | None
    company_name: str | None
    is_internal: bool
    confidence: float
    context_snippet: str | None = None

    def to_dict(self) -> dict:
        return {
            "person_id": str(self.person_id) if self.person_id else None,
            "name": self.name,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "company_id": str(self.company_id) if self.company_id else None,
            "company_name": self.company_name,
            "is_internal": self.is_internal,
            "confidence": self.confidence,
            "context_snippet": self.context_snippet,
        }


@dataclasses.dataclass
class NotionMeetingResolution:
    primary_person_id: UUID | None
    company_id: UUID | None
    clean_title: str
    entities: list[ExtractedEntity]
    suggested_persons: list[dict]


class NotionAttendeeIndex:
    """
    Enhanced Entity Detection and Lookup Index for Notion Meeting Notes.
    Parses titles, attendee fields, structured summaries, and transcripts
    to extract and attribute multiple participant entities with contextual roles.
    """

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
        self.companies_by_id: dict[UUID, Company] = {c.id: c for c in companies}
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

            if p.is_internal and not self.default_host_person:
                self.default_host_person = p

        if not self.default_host_person and persons:
            self.default_host_person = persons[0]

    def _infer_role_from_context(
        self,
        name: str,
        first_name: str,
        content: str,
        is_internal: bool,
        person: Person | None = None,
    ) -> str:
        """Infers candidate role (interviewer, recruiter, hiring_manager, host, attendee)."""
        if is_internal:
            return "host"

        # Check job title / attributes if known
        if person and person.attributes:
            tags = [str(t).lower() for t in person.attributes.get("tags") or []]
            segment = str(person.attributes.get("segment") or "").lower()
            if "recruiters_and_talent" in segment or any("recruiter" in t for t in tags):
                return "recruiter"
            if "hiring_decision_makers" in segment:
                # Could be interviewer or hiring manager
                pass

        c_lower = content.lower()
        fn_norm = normalise_text_tokens(first_name)

        # Recruiter patterns
        recruiter_patterns = [
            rf"\b(?:let|ask|reach\s+out\s+to|share\s+feedback\s+with|contact)\s+{re.escape(fn_norm)}\b",
            rf"\b{re.escape(fn_norm)}\s+(?:will\s+reach\s+out|will\s+come\s+back|is\s+the\s+recruiter|from\s+talent|talent\s+acquisition)\b",
            rf"\b(?:recruiter|talent\s+partner|talent\s+acquisition):\s*{re.escape(fn_norm)}\b",
        ]
        if any(re.search(p, c_lower) for p in recruiter_patterns):
            return "recruiter"

        # Hiring manager patterns
        hm_patterns = [
            rf"\b(?:hiring\s+manager\s+is\s+(?:the\s+cto\s+)?|reporting\s+to\s+){re.escape(fn_norm)}\b",
            rf"\b{re.escape(fn_norm)},\s+the\s+(?:cto|vp|head\s+of|director)\b",
            rf"\b(?:cto|vp\s+of\s+eng|head\s+of\s+data)\s+{re.escape(fn_norm)}\b",
        ]
        if any(re.search(p, c_lower) for p in hm_patterns):
            return "hiring_manager"

        # Interviewer / Lead patterns
        interviewer_patterns = [
            rf"\b{re.escape(fn_norm)}\s+(?:introduced|emphasized|asked|described|framed|pointed\s+out|explained|confirmed)\b",
            rf"\binterview\s+with\s+{re.escape(fn_norm)}\b",
            rf"\b{re.escape(fn_norm)}\s*:\s*",  # speaker label
        ]
        if any(re.search(p, c_lower) for p in interviewer_patterns):
            return "interviewer"

        return "counterparty"

    def detect_meeting_entities(
        self,
        title: str | None,
        attendees: str | None,
        url: str | None,
        content: str | None,
    ) -> NotionMeetingResolution:
        """
        Executes comprehensive entity detection across meeting title, attendees,
        structured summaries, and conversation transcripts.
        """
        clean_title = clean_meeting_title(title)
        title_norm = normalise_text_tokens(clean_title)
        attendees_norm = normalise_text_tokens(attendees)
        url_norm = normalise_text_tokens(url)
        content_full = content or ""
        content_norm = normalise_text_tokens(content_full)

        title_att_corpus = f"{attendees_norm} {title_norm} {url_norm}"
        search_corpus = f"{title_att_corpus} {content_norm}"

        # 1. Resolve Company
        matched_company_id: UUID | None = None
        matched_company_name: str | None = None

        for c in self.companies:
            cname = normalise_text_tokens(c.name)
            if cname and len(cname) >= 3 and cname not in COMPANY_STOPWORDS:
                if re.search(rf"\b{re.escape(cname)}\b", title_att_corpus) or re.search(
                    rf"\b{re.escape(cname)}\b", content_norm[:2000]
                ):
                    matched_company_id = c.id
                    matched_company_name = c.name
                    break

        # 2. Extract entities
        extracted_entities: list[ExtractedEntity] = []
        seen_person_ids: set[UUID] = set()
        seen_names: set[str] = set()

        # A. Full Name matches against all known persons
        for p in self.persons:
            fn = normalise_text_tokens(p.first_name)
            ln = normalise_text_tokens(p.last_name)
            if fn and ln and len(fn) >= 2 and len(ln) >= 2:
                full = f"{fn} {ln}"
                rev_full = f"{ln} {fn}"
                in_title_att = bool(
                    re.search(rf"\b{re.escape(full)}\b", title_att_corpus)
                    or re.search(rf"\b{re.escape(rev_full)}\b", title_att_corpus)
                )
                in_content = bool(
                    re.search(rf"\b{re.escape(full)}\b", search_corpus)
                    or re.search(rf"\b{re.escape(rev_full)}\b", search_corpus)
                )
                if in_title_att or in_content:
                    p_comp_id = self.person_company_ids.get(p.id) or matched_company_id
                    p_comp_name = (
                        self.companies_by_id[p_comp_id].name
                        if p_comp_id and p_comp_id in self.companies_by_id
                        else matched_company_name
                    )
                    role = self._infer_role_from_context(
                        name=f"{p.first_name} {p.last_name}",
                        first_name=p.first_name or "",
                        content=content_full,
                        is_internal=p.is_internal,
                        person=p,
                    )
                    conf = 0.95 if in_title_att else 0.85
                    entity = ExtractedEntity(
                        person_id=p.id,
                        name=f"{p.first_name} {p.last_name}".strip(),
                        first_name=p.first_name or "",
                        last_name=p.last_name,
                        role=role,
                        company_id=p_comp_id,
                        company_name=p_comp_name,
                        is_internal=p.is_internal,
                        confidence=conf,
                    )
                    extracted_entities.append(entity)
                    seen_person_ids.add(p.id)
                    seen_names.add(fn)

        # B. Company-Scoped First Name matches
        # If we have a resolved company (e.g. Enpal), match candidate first names against company's contacts
        if matched_company_id:
            for p in self.persons:
                if p.id in seen_person_ids:
                    continue
                p_comps = self.person_companies.get(p.id, [])
                p_comp_id = self.person_company_ids.get(p.id)
                if (
                    matched_company_name and normalise_text_tokens(matched_company_name) in p_comps
                ) or p_comp_id == matched_company_id:
                    fn = normalise_text_tokens(p.first_name)
                    if fn and len(fn) >= 3 and fn not in FIRST_NAME_STOPWORDS:
                        # Look for first name mentions in title, summary, or transcript
                        if re.search(rf"\b{re.escape(fn)}\b", search_corpus):
                            role = self._infer_role_from_context(
                                name=f"{p.first_name} {p.last_name or ''}".strip(),
                                first_name=p.first_name or "",
                                content=content_full,
                                is_internal=p.is_internal,
                                person=p,
                            )
                            entity = ExtractedEntity(
                                person_id=p.id,
                                name=f"{p.first_name} {p.last_name or ''}".strip(),
                                first_name=p.first_name or "",
                                last_name=p.last_name,
                                role=role,
                                company_id=matched_company_id,
                                company_name=matched_company_name,
                                is_internal=p.is_internal,
                                confidence=0.88,
                            )
                            extracted_entities.append(entity)
                            seen_person_ids.add(p.id)
                            seen_names.add(fn)

        # C. Distinctive first names in title/summary
        tokens = set(title_att_corpus.split())
        for tok in tokens:
            if (
                tok in self.persons_by_first_name
                and tok not in FIRST_NAME_STOPWORDS
                and tok not in seen_names
                and self.first_name_counts.get(tok, 0) == 1
            ):
                candidate_p = self.persons_by_first_name[tok][0]
                if candidate_p.id not in seen_person_ids:
                    p_comp_id = self.person_company_ids.get(candidate_p.id) or matched_company_id
                    p_comp_name = (
                        self.companies_by_id[p_comp_id].name
                        if p_comp_id and p_comp_id in self.companies_by_id
                        else matched_company_name
                    )
                    role = self._infer_role_from_context(
                        name=f"{candidate_p.first_name} {candidate_p.last_name or ''}".strip(),
                        first_name=candidate_p.first_name or "",
                        content=content_full,
                        is_internal=candidate_p.is_internal,
                        person=candidate_p,
                    )
                    entity = ExtractedEntity(
                        person_id=candidate_p.id,
                        name=f"{candidate_p.first_name} {candidate_p.last_name or ''}".strip(),
                        first_name=candidate_p.first_name or "",
                        last_name=candidate_p.last_name,
                        role=role,
                        company_id=p_comp_id,
                        company_name=p_comp_name,
                        is_internal=candidate_p.is_internal,
                        confidence=0.80,
                    )
                    extracted_entities.append(entity)
                    seen_person_ids.add(candidate_p.id)
                    seen_names.add(tok)

        # D. Internal team members / host mention in conversation
        for p in self.persons:
            if p.is_internal and p.id not in seen_person_ids:
                fn = normalise_text_tokens(p.first_name)
                if fn and len(fn) >= 3 and re.search(rf"\b{re.escape(fn)}\b", search_corpus):
                    entity = ExtractedEntity(
                        person_id=p.id,
                        name=f"{p.first_name} {p.last_name or ''}".strip(),
                        first_name=p.first_name or "",
                        last_name=p.last_name,
                        role="host",
                        company_id=None,
                        company_name=None,
                        is_internal=True,
                        confidence=0.90,
                    )
                    extracted_entities.append(entity)
                    seen_person_ids.add(p.id)
                    seen_names.add(fn)

        # 3. Select primary counterparty person_id
        # Rank: non-internal interviewers > non-internal recruiters > non-internal counterparties/attendees
        role_priority = {
            "interviewer": 1,
            "recruiter": 2,
            "hiring_manager": 3,
            "attendee": 4,
            "counterparty": 5,
            "host": 99,
        }

        external_entities = [e for e in extracted_entities if not e.is_internal and e.person_id]
        external_entities.sort(key=lambda e: (role_priority.get(e.role, 10), -e.confidence))

        primary_person_id: UUID | None = None
        if external_entities:
            primary_person_id = external_entities[0].person_id
            if not matched_company_id and external_entities[0].company_id:
                matched_company_id = external_entities[0].company_id

        # If no external person identified, check company
        if not primary_person_id and not matched_company_id:
            # Fallback to host only if completely unresolvable to allow basic record storage
            if self.default_host_person:
                primary_person_id = self.default_host_person.id

        # 4. Build suggested persons payload
        suggested_persons: list[dict] = []
        for e in external_entities:
            suggested_persons.append(
                {
                    "person_id": str(e.person_id) if e.person_id else None,
                    "name": e.name,
                    "first_name": e.first_name,
                    "role": e.role,
                    "company_id": str(e.company_id) if e.company_id else None,
                    "company_name": e.company_name,
                    "confidence": e.confidence,
                }
            )

        return NotionMeetingResolution(
            primary_person_id=primary_person_id,
            company_id=matched_company_id,
            clean_title=clean_title,
            entities=extracted_entities,
            suggested_persons=suggested_persons,
        )

    def resolve_meeting(
        self,
        title: str | None,
        attendees: str | None,
        url: str | None,
        content: str | None,
    ) -> tuple[UUID | None, UUID | None, str]:
        """Backwards-compatible tuple signature (primary_person_id, company_id, clean_title)."""
        res = self.detect_meeting_entities(
            title=title, attendees=attendees, url=url, content=content
        )
        return res.primary_person_id, res.company_id, res.clean_title
