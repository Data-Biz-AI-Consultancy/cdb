"""
cdb.services.signals.detected.mapper

Converts DetectedSignal ORM models into API response schemas.
"""

import uuid
from decimal import Decimal

from cdb.models.signal import DetectedSignal
from cdb.schemas.signals import (
    ConnectedPersonResponse,
    DetectedSignalResponse,
    DetectedSignalStatus,
    SignalDefinition,
    SignalSeverity,
    SuggestedPersonResponse,
)


def to_detected_response(sig: DetectedSignal) -> DetectedSignalResponse:
    """Converts ORM DetectedSignal into rich response model."""
    comp_name = sig.company.name if sig.company else None
    opp_title = sig.opportunity.title if sig.opportunity else None
    eng_title = sig.engagement.title if sig.engagement else None

    connected_persons: list[ConnectedPersonResponse] = []
    connected_person_ids_set: set[uuid.UUID] = set()

    if getattr(sig, "signal_persons", None):
        for sp in sig.signal_persons:
            if sp.person and not sp.person.is_internal:
                p = sp.person
                p_name = f"{p.first_name or ''} {p.last_name or ''}".strip() or "Unnamed Contact"
                connected_persons.append(
                    ConnectedPersonResponse(
                        id=p.id,
                        name=p_name,
                        first_name=p.first_name,
                        last_name=p.last_name,
                        email=p.primary_email,
                        primary_email=p.primary_email,
                        role=sp.role,
                        linkedin_url=p.linkedin_url,
                    )
                )
                connected_person_ids_set.add(p.id)
    elif getattr(sig, "connected_persons", None):
        for cp in sig.connected_persons:
            if not cp.is_internal:
                p_name = f"{cp.first_name or ''} {cp.last_name or ''}".strip() or "Unnamed Contact"
                connected_persons.append(
                    ConnectedPersonResponse(
                        id=cp.id,
                        name=p_name,
                        first_name=cp.first_name,
                        last_name=cp.last_name,
                        email=cp.primary_email,
                        primary_email=cp.primary_email,
                        role="participant",
                        linkedin_url=cp.linkedin_url,
                    )
                )
                connected_person_ids_set.add(cp.id)
    elif sig.person and not sig.person.is_internal:
        p_name = (
            f"{sig.person.first_name or ''} {sig.person.last_name or ''}".strip()
            or "Unnamed Contact"
        )
        connected_persons.append(
            ConnectedPersonResponse(
                id=sig.person.id,
                name=p_name,
                first_name=sig.person.first_name,
                last_name=sig.person.last_name,
                email=sig.person.primary_email,
                primary_email=sig.person.primary_email,
                role="primary",
                linkedin_url=sig.person.linkedin_url,
            )
        )
        connected_person_ids_set.add(sig.person.id)

    if len(connected_persons) > 1:
        person_name = ", ".join(p.name for p in connected_persons)
    elif connected_persons:
        person_name = connected_persons[0].name
    elif sig.person and not sig.person.is_internal:
        person_name = f"{sig.person.first_name or ''} {sig.person.last_name or ''}".strip() or None
    else:
        person_name = None

    if connected_persons:
        primary_person_id = connected_persons[0].id
    elif sig.person and not sig.person.is_internal:
        primary_person_id = sig.person_id
    else:
        primary_person_id = None

    meta = sig.metadata_payload or {}
    raw_conf = meta.get("confidence_score")
    if raw_conf is not None:
        conf_score = Decimal(str(raw_conf))
    elif sig.score is not None:
        conf_score = Decimal(str(sig.score)) / Decimal("100") if sig.score > 1 else sig.score
    else:
        conf_score = None

    # Parse suggested persons from metadata payload
    suggested_persons: list[SuggestedPersonResponse] = []
    raw_suggested = meta.get("suggested_persons") or []
    for sp_item in raw_suggested:
        sp_id = None
        if sp_item.get("person_id"):
            try:
                sp_id = uuid.UUID(str(sp_item["person_id"]))
            except Exception:
                pass
        # Only suggest if not already connected
        if sp_id and sp_id in connected_person_ids_set:
            continue
        suggested_persons.append(
            SuggestedPersonResponse(
                person_id=sp_id,
                name=sp_item.get("name") or "Candidate Contact",
                first_name=sp_item.get("first_name"),
                role=sp_item.get("role"),
                company_id=uuid.UUID(str(sp_item["company_id"]))
                if sp_item.get("company_id")
                else None,
                company_name=sp_item.get("company_name"),
                confidence=sp_item.get("confidence"),
            )
        )

    return DetectedSignalResponse(
        id=sig.id,
        signal_id=sig.signal_id,
        signal=SignalDefinition.model_validate(sig.signal) if sig.signal else None,
        company_id=sig.company_id,
        company_name=comp_name,
        person_id=primary_person_id,
        person_name=person_name,
        connected_persons=connected_persons,
        suggested_persons=suggested_persons,
        opportunity_id=sig.opportunity_id,
        opportunity_title=opp_title,
        engagement_id=sig.engagement_id,
        engagement_title=eng_title,
        activity_id=sig.activity_id,
        status=DetectedSignalStatus(sig.status),
        severity=SignalSeverity(sig.severity),
        score=sig.score,
        confidence_score=conf_score,
        confidence_tier=meta.get("confidence_tier"),
        is_uncertain=meta.get("is_uncertain", False),
        uncertainty_reasons=meta.get("uncertainty_reasons", []),
        has_conflict=meta.get("has_conflict", False),
        conflicting_signal_ids=meta.get("conflicting_signal_ids", []),
        conflict_summary=meta.get("conflict_summary"),
        evidence=meta.get("evidence"),
        evidence_fingerprint=sig.evidence_fingerprint,
        title=sig.title,
        summary=sig.summary,
        metadata_payload=meta,
        actioned_at=sig.actioned_at,
        actioned_by_id=sig.actioned_by_id,
        resolution_notes=sig.resolution_notes,
        snoozed_until=sig.snoozed_until,
        reopen_count=sig.reopen_count or 0,
        last_reopened_at=sig.last_reopened_at,
        detected_at=sig.detected_at,
        expires_at=sig.expires_at,
        created_at=sig.created_at,
        updated_at=sig.updated_at,
    )


# Backward-compatible private alias
_to_detected_response = to_detected_response

__all__ = ["to_detected_response", "_to_detected_response"]
