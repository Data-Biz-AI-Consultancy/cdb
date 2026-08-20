import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import NotFoundError
from cdb.models.er import ERCandidatePair
from cdb.models.person import Person
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.er import ERCandidatePairResponse, ERJobResponse, ERMergeResult
from cdb.schemas.person import PersonSummaryResponse
from cdb.services.entity_resolution.merger import merge_persons
from cdb.services.entity_resolution.rules import evaluate_person_match


async def list_er_queue(
    db: AsyncSession,
    status: str = "pending",
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[ERCandidatePairResponse], PaginationMetadata]:
    stmt = select(ERCandidatePair).where(ERCandidatePair.status == status)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    pairs = (await db.execute(stmt)).scalars().all()

    items: list[ERCandidatePairResponse] = []
    for pair in pairs:
        pa = (await db.execute(select(Person).where(Person.id == pair.person_a_id))).scalar_one_or_none()
        pb = (await db.execute(select(Person).where(Person.id == pair.person_b_id))).scalar_one_or_none()

        if not pa or not pb:
            continue

        resp_a = PersonSummaryResponse(
            id=pa.id,
            first_name=pa.first_name,
            last_name=pa.last_name,
            primary_email=pa.primary_email,
            linkedin_url=pa.linkedin_url,
            sources=pa.sources or [],
            created_at=pa.created_at,
        )
        resp_b = PersonSummaryResponse(
            id=pb.id,
            first_name=pb.first_name,
            last_name=pb.last_name,
            primary_email=pb.primary_email,
            linkedin_url=pb.linkedin_url,
            sources=pb.sources or [],
            created_at=pb.created_at,
        )

        items.append(
            ERCandidatePairResponse(
                id=pair.id,
                person_a=resp_a,
                person_b=resp_b,
                match_signals=pair.match_signals or {},
                ml_score=pair.ml_score,
                status=pair.status,
                reviewed_by=pair.reviewed_by,
                reviewed_at=pair.reviewed_at,
                created_at=pair.created_at,
            )
        )

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def accept_er_candidate(
    db: AsyncSession, pair_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> ERMergeResult:
    pair = (await db.execute(select(ERCandidatePair).where(ERCandidatePair.id == pair_id))).scalar_one_or_none()
    if not pair:
        raise NotFoundError(f"Candidate pair {pair_id} not found.")

    master_id, sub_id = await merge_persons(db, pair.person_a_id, pair.person_b_id)
    return ERMergeResult(master_person_id=master_id, merged_person_id=sub_id)


async def reject_er_candidate(
    db: AsyncSession, pair_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> None:
    pair = (await db.execute(select(ERCandidatePair).where(ERCandidatePair.id == pair_id))).scalar_one_or_none()
    if not pair:
        raise NotFoundError(f"Candidate pair {pair_id} not found.")

    pair.status = "rejected"
    await db.commit()


async def run_full_er_scan(db: AsyncSession) -> ERJobResponse:
    # Full scan: compares all active persons pairwise and detects auto-merges or review queue candidates
    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()

    for i in range(len(persons)):
        for j in range(i + 1, len(persons)):
            p1 = persons[i]
            p2 = persons[j]
            res = evaluate_person_match(p1, p2)
            if res.outcome == "auto_merge":
                # Trigger merge
                try:
                    await merge_persons(db, p1.id, p2.id)
                except Exception:
                    pass
            elif res.outcome == "review_queue":
                # Check if pair exists
                existing = (
                    await db.execute(
                        select(ERCandidatePair).where(
                            (
                                (ERCandidatePair.person_a_id == p1.id)
                                & (ERCandidatePair.person_b_id == p2.id)
                            )
                            | (
                                (ERCandidatePair.person_a_id == p2.id)
                                & (ERCandidatePair.person_b_id == p1.id)
                            )
                        )
                    )
                ).scalar_one_or_none()
                if not existing:
                    db.add(
                        ERCandidatePair(
                            person_a_id=p1.id,
                            person_b_id=p2.id,
                            match_signals=res.match_signals,
                            status="pending",
                        )
                    )
                    await db.commit()

    return ERJobResponse(job_id=str(uuid.uuid4()), status="completed")
