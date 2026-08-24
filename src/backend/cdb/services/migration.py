#!/usr/bin/env python3
"""
CDB — Data Migration Service: Jager `cdp` to CDB `cdb`
=====================================================
Reads historical and live data from Jager's `cdp` schema (or database)
and idempotently migrates records into CDB's PostgreSQL `cdb` database.

Execution sequence:
  1. Companies (cdp.companies -> companies)
  2. Persons (cdp.persons -> persons)
  3. Person-Company Relationships (cdp.person_company_relationships + cdp.persons.primary_company_id -> person_company_relationships)
  4. Intake: LinkedIn Connections (cdp.persons_linkedins -> intake_linkedin_connections)
  5. Intake: LinkedIn Messages (cdp.leads_linkedin -> intake_linkedin_messages)
  6. Intake: Notion Meeting Notes (cdp.activities_notion_meeting_notes -> intake_notion_meeting_notes)
  7. Activities (cdp.activities -> activities)
  8. Leads (cdp.leads -> leads)

Key Rules:
  - All writes are idempotent (safe to re-run).
  - jager_origin_id is preserved in attributes JSONB for audit & foreign key resolution.
  - Timestamps (created_at, updated_at) are preserved.
"""

import argparse
import datetime
import json
import logging
import os
import re
import uuid
from typing import Any

import sqlalchemy as sa
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("cdb-migration")


# --- Normalization Helpers ---

def normalise_email(raw: str | None) -> str | None:
    if not raw:
        return None
    email = str(raw).strip().lower()
    if not email or "@linkedin.user" in email or "invalid" in email or "@" not in email:
        return None
    return email


def normalise_linkedin_url(raw: str | None) -> str | None:
    if not raw:
        return None
    url = str(raw).strip()
    url = re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
    if not url.startswith("linkedin.com/in/"):
        return None
    return url.lower()


def normalise_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    raw_stripped = str(raw).strip()
    has_plus = raw_stripped.startswith("+")
    digits = re.sub(r"\D", "", raw_stripped)
    if len(digits) < 7:
        return None
    return f"+{digits}" if has_plus else digits


def map_lead_stage(raw_status: str | None, signal_strength: str | None = None) -> str:
    status = (raw_status or "").strip().lower()
    if status == "prospect":
        return "new"
    elif status == "reached":
        return "contacted"
    elif status in ("decision_maker_reached", "engaging", "qualified"):
        return "qualified"
    elif status in ("contract_signed", "completed", "closed_won"):
        return "converted"
    elif status in ("disqualified", "closed_lost"):
        return "disqualified"
    elif status == "closed":
        if signal_strength and signal_strength.lower() in ("high", "strong"):
            return "converted"
        return "disqualified"
    return "new"


class DataMigrator:
    def __init__(
        self,
        source_url: str,
        target_url: str,
        dry_run: bool = False,
        batch_size: int = 500,
    ):
        self.source_url = source_url
        self.target_url = target_url
        self.dry_run = dry_run
        self.batch_size = batch_size

        self.source_engine = sa.create_engine(source_url)
        self.target_engine = sa.create_engine(target_url)

        # Lookup caches: jager_origin_id (str) -> new CDB UUID
        self.company_id_map: dict[str, uuid.UUID] = {}
        self.person_id_map: dict[str, uuid.UUID] = {}
        self.person_by_email: dict[str, uuid.UUID] = {}
        self.person_by_linkedin: dict[str, uuid.UUID] = {}

        # Stats summary
        self.stats: dict[str, dict[str, int]] = {
            "companies": {"read": 0, "migrated": 0, "skipped": 0},
            "persons": {"read": 0, "migrated": 0, "skipped": 0},
            "person_company_relationships": {"read": 0, "migrated": 0, "skipped": 0},
            "intake_linkedin_connections": {"read": 0, "migrated": 0, "skipped": 0},
            "intake_linkedin_messages": {"read": 0, "migrated": 0, "skipped": 0},
            "intake_notion_meeting_notes": {"read": 0, "migrated": 0, "skipped": 0},
            "activities": {"read": 0, "migrated": 0, "skipped": 0},
            "leads": {"read": 0, "migrated": 0, "skipped": 0},
        }

    def _init_caches_from_target(self, target_conn: sa.Connection) -> None:
        """Pre-populate lookup caches from existing rows in CDB target database."""
        logger.info("Pre-populating lookup caches from CDB target database...")

        # Companies
        res_comp = target_conn.execute(
            text("SELECT id, domain, attributes FROM companies WHERE deleted_at IS NULL")
        ).mappings().all()
        for r in res_comp:
            c_id = r["id"] if isinstance(r["id"], uuid.UUID) else uuid.UUID(str(r["id"]))
            attrs = r["attributes"] or {}
            if isinstance(attrs, str):
                try:
                    attrs = json.loads(attrs)
                except Exception:
                    attrs = {}
            origin_id = attrs.get("jager_origin_id")
            if origin_id:
                self.company_id_map[str(origin_id)] = c_id

        # Persons
        res_pers = target_conn.execute(
            text("SELECT id, primary_email, linkedin_url, attributes FROM persons WHERE deleted_at IS NULL")
        ).mappings().all()
        for r in res_pers:
            p_id = r["id"] if isinstance(r["id"], uuid.UUID) else uuid.UUID(str(r["id"]))
            if r["primary_email"]:
                self.person_by_email[r["primary_email"].strip().lower()] = p_id
            if r["linkedin_url"]:
                self.person_by_linkedin[r["linkedin_url"].strip().lower()] = p_id
            attrs = r["attributes"] or {}
            if isinstance(attrs, str):
                try:
                    attrs = json.loads(attrs)
                except Exception:
                    attrs = {}
            origin_id = attrs.get("jager_origin_id")
            if origin_id:
                self.person_id_map[str(origin_id)] = p_id

        logger.info(
            f"Loaded existing target cache: {len(self.company_id_map)} companies, "
            f"{len(self.person_id_map)} persons by origin ID."
        )

    def _get_table_ref(self, conn: sa.Connection, schema: str, table: str) -> str | None:
        """Returns qualified table name if it exists, or None."""
        if conn.dialect.name == "sqlite":
            insp = sa.inspect(conn)
            if table in insp.get_table_names():
                return f'"{table}"'
            return None
        insp = sa.inspect(conn)
        if insp.has_table(table, schema=schema):
            return f'"{schema}"."{table}"'
        if insp.has_table(table, schema="public"):
            return f'"public"."{table}"'
        if insp.has_table(table):
            return f'"{table}"'
        return None

    def _bind_uuid(self, u: uuid.UUID | None, conn: sa.Connection) -> Any:
        if u is None:
            return None
        return str(u) if conn.dialect.name == "sqlite" else u

    def _json_val(self, val: Any, conn: sa.Connection) -> Any:
        if val is None:
            return None
        return json.dumps(val) if isinstance(val, (dict, list)) else str(val)

    # --- 1. Migrate Companies ---
    def migrate_companies(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 1: Migrating Companies ---")
        tbl = self._get_table_ref(source_conn, "cdp", "companies")
        if not tbl:
            logger.warning("Source table companies does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"SELECT id, company_name, domain, attributes, created_at, updated_at FROM {tbl}")
        ).mappings().all()

        self.stats["companies"]["read"] = len(rows)

        for r in rows:
            orig_id = str(r["id"])
            name = (r.get("company_name") or "").strip() or "Unnamed Company"
            domain = (r.get("domain") or "").strip().lower() or None
            created_at = r.get("created_at") or datetime.datetime.now(datetime.UTC)
            updated_at = r.get("updated_at") or datetime.datetime.now(datetime.UTC)

            attrs = r.get("attributes") or {}
            if isinstance(attrs, str):
                try:
                    attrs = json.loads(attrs)
                except Exception:
                    attrs = {}
            attrs["jager_origin_id"] = orig_id

            # Check if domain already exists in target
            existing_id = None
            if domain:
                res = target_conn.execute(
                    text("SELECT id FROM companies WHERE domain = :domain"),
                    {"domain": domain},
                ).scalar()
                if res:
                    existing_id = res if isinstance(res, uuid.UUID) else uuid.UUID(str(res))

            if existing_id:
                self.company_id_map[orig_id] = existing_id
                self.stats["companies"]["skipped"] += 1
                continue

            # Also check by origin_id in attributes
            if target_conn.dialect.name == "postgresql":
                res_orig = target_conn.execute(
                    text("SELECT id FROM companies WHERE attributes->>'jager_origin_id' = :orig_id"),
                    {"orig_id": orig_id},
                ).scalar()
            else:
                res_orig = target_conn.execute(
                    text("SELECT id FROM companies WHERE attributes LIKE :orig_pattern"),
                    {"orig_pattern": f'%"{orig_id}"%'},
                ).scalar()

            if res_orig:
                existing_id = res_orig if isinstance(res_orig, uuid.UUID) else uuid.UUID(str(res_orig))
                self.company_id_map[orig_id] = existing_id
                self.stats["companies"]["skipped"] += 1
                continue

            new_id = uuid.uuid4()
            if not self.dry_run:
                target_conn.execute(
                    text(f"""
                        INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO companies (id, name, domain, attributes, created_at, updated_at)
                        VALUES (:id, :name, :domain, :attributes, :created_at, :updated_at)
                        {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT (domain) DO NOTHING')}
                    """),
                    {
                        "id": self._bind_uuid(new_id, target_conn),
                        "name": name,
                        "domain": domain,
                        "attributes": self._json_val(attrs, target_conn),
                        "created_at": created_at,
                        "updated_at": updated_at,
                    },
                )
            self.company_id_map[orig_id] = new_id
            self.stats["companies"]["migrated"] += 1

        logger.info(
            f"Companies: {self.stats['companies']['migrated']} migrated, "
            f"{self.stats['companies']['skipped']} skipped / deduped."
        )

    # --- 2. Migrate Persons ---
    def migrate_persons(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 2: Migrating Persons ---")
        tbl = self._get_table_ref(source_conn, "cdp", "persons")
        if not tbl:
            logger.warning("Source table persons does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT id, first_name, last_name, primary_email, primary_phone, linkedin_url,
                       city, country, in_linkedin_connections, in_substack_subscriber_export,
                       attributes, created_at, updated_at
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["persons"]["read"] = len(rows)

        for r in rows:
            orig_id = str(r["id"])
            first_name = (r.get("first_name") or "").strip() or None
            last_name = (r.get("last_name") or "").strip() or None
            email = normalise_email(r.get("primary_email"))
            phone = normalise_phone(r.get("primary_phone"))
            li_url = normalise_linkedin_url(r.get("linkedin_url"))
            city = (r.get("city") or "").strip() or None
            country = (r.get("country") or "").strip() or None
            if country and len(country) > 2:
                country = country[:2].upper()

            created_at = r.get("created_at") or datetime.datetime.now(datetime.UTC)
            updated_at = r.get("updated_at") or datetime.datetime.now(datetime.UTC)

            attrs = r.get("attributes") or {}
            if isinstance(attrs, str):
                try:
                    attrs = json.loads(attrs)
                except Exception:
                    attrs = {}
            attrs["jager_origin_id"] = orig_id

            # Determine sources
            sources = []
            if r.get("in_linkedin_connections"):
                sources.append("linkedin")
            if r.get("in_substack_subscriber_export"):
                sources.append("substack")
            if not sources:
                sources.append("migration")

            # Check if exists by origin_id, email, or linkedin_url
            existing_id = None
            if orig_id in self.person_id_map:
                existing_id = self.person_id_map[orig_id]
            elif email and email in self.person_by_email:
                existing_id = self.person_by_email[email]
            elif li_url and li_url in self.person_by_linkedin:
                existing_id = self.person_by_linkedin[li_url]

            if not existing_id:
                # Check DB directly in case
                if email:
                    res_email = target_conn.execute(
                        text("SELECT id FROM persons WHERE primary_email = :e"), {"e": email}
                    ).scalar()
                    if res_email:
                        existing_id = res_email if isinstance(res_email, uuid.UUID) else uuid.UUID(str(res_email))
                if not existing_id and li_url:
                    res_li = target_conn.execute(
                        text("SELECT id FROM persons WHERE linkedin_url = :li"), {"li": li_url}
                    ).scalar()
                    if res_li:
                        existing_id = res_li if isinstance(res_li, uuid.UUID) else uuid.UUID(str(res_li))

            if existing_id:
                self.person_id_map[orig_id] = existing_id
                if email:
                    self.person_by_email[email] = existing_id
                if li_url:
                    self.person_by_linkedin[li_url] = existing_id
                self.stats["persons"]["skipped"] += 1
                continue

            new_id = uuid.uuid4()
            if not self.dry_run:
                # Convert sources to list / JSON appropriately
                sources_val = json.dumps(sources) if target_conn.dialect.name == "sqlite" else sources
                target_conn.execute(
                    text("""
                        INSERT INTO persons (
                            id, first_name, last_name, primary_email, primary_phone,
                            linkedin_url, city, country, sources, attributes, created_at, updated_at
                        ) VALUES (
                            :id, :first_name, :last_name, :primary_email, :primary_phone,
                            :linkedin_url, :city, :country, :sources, :attributes, :created_at, :updated_at
                        )
                    """),
                    {
                        "id": self._bind_uuid(new_id, target_conn),
                        "first_name": first_name,
                        "last_name": last_name,
                        "primary_email": email,
                        "primary_phone": phone,
                        "linkedin_url": li_url,
                        "city": city,
                        "country": country,
                        "sources": sources_val,
                        "attributes": self._json_val(attrs, target_conn),
                        "created_at": created_at,
                        "updated_at": updated_at,
                    },
                )
            self.person_id_map[orig_id] = new_id
            if email:
                self.person_by_email[email] = new_id
            if li_url:
                self.person_by_linkedin[li_url] = new_id
            self.stats["persons"]["migrated"] += 1

        logger.info(
            f"Persons: {self.stats['persons']['migrated']} migrated, "
            f"{self.stats['persons']['skipped']} skipped / deduped."
        )

    # --- 3. Migrate Person-Company Relationships ---
    def migrate_relationships(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 3: Migrating Person-Company Relationships ---")
        existing_pcr_keys: set[tuple[uuid.UUID, uuid.UUID, str | None]] = set()
        res_existing = target_conn.execute(
            text("SELECT person_id, company_id, title FROM person_company_relationships")
        ).mappings().all()
        for r in res_existing:
            p_id = r["person_id"] if isinstance(r["person_id"], uuid.UUID) else uuid.UUID(str(r["person_id"]))
            c_id = r["company_id"] if isinstance(r["company_id"], uuid.UUID) else uuid.UUID(str(r["company_id"]))
            existing_pcr_keys.add((p_id, c_id, r["title"]))

        pcr_tbl = self._get_table_ref(source_conn, "cdp", "person_company_relationships")
        if pcr_tbl:
            rows = source_conn.execute(
                text(f"""
                    SELECT id, person_id, company_id, role, is_current, started_at, ended_at, created_at, updated_at
                    FROM {pcr_tbl}
                """)
            ).mappings().all()
            self.stats["person_company_relationships"]["read"] += len(rows)

            for r in rows:
                p_orig = str(r["person_id"])
                c_orig = str(r["company_id"])
                target_p_id = self.person_id_map.get(p_orig)
                target_c_id = self.company_id_map.get(c_orig)

                if not target_p_id or not target_c_id:
                    self.stats["person_company_relationships"]["skipped"] += 1
                    continue

                title = (r.get("role") or "").strip() or None
                key = (target_p_id, target_c_id, title)
                if key in existing_pcr_keys:
                    self.stats["person_company_relationships"]["skipped"] += 1
                    continue

                is_current = bool(r.get("is_current", True))
                started_at = r.get("started_at")
                ended_at = r.get("ended_at")
                created_at = r.get("created_at") or datetime.datetime.now(datetime.UTC)
                updated_at = r.get("updated_at") or datetime.datetime.now(datetime.UTC)

                if not self.dry_run:
                    target_conn.execute(
                        text(f"""
                            INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO person_company_relationships (
                                id, person_id, company_id, title, is_current, started_at, ended_at, created_at, updated_at
                            ) VALUES (
                                :id, :person_id, :company_id, :title, :is_current, :started_at, :ended_at, :created_at, :updated_at
                            ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT DO NOTHING')}
                        """),
                        {
                            "id": self._bind_uuid(uuid.uuid4(), target_conn),
                            "person_id": self._bind_uuid(target_p_id, target_conn),
                            "company_id": self._bind_uuid(target_c_id, target_conn),
                            "title": title,
                            "is_current": is_current,
                            "started_at": started_at,
                            "ended_at": ended_at,
                            "created_at": created_at,
                            "updated_at": updated_at,
                        },
                    )
                existing_pcr_keys.add(key)
                self.stats["person_company_relationships"]["migrated"] += 1

        # Also derive from primary_company_id in cdp.persons if not present
        persons_tbl = self._get_table_ref(source_conn, "cdp", "persons")
        if persons_tbl:
            try:
                persons_with_comp = source_conn.execute(
                    text(f"SELECT id, primary_company_id FROM {persons_tbl} WHERE primary_company_id IS NOT NULL")
                ).mappings().all()

                for r in persons_with_comp:
                    p_orig = str(r["id"])
                    c_orig = str(r["primary_company_id"])
                    target_p_id = self.person_id_map.get(p_orig)
                    target_c_id = self.company_id_map.get(c_orig)

                    if not target_p_id or not target_c_id:
                        continue

                    key = (target_p_id, target_c_id, None)
                    if key in existing_pcr_keys:
                        continue

                    if not self.dry_run:
                        target_conn.execute(
                            text(f"""
                                INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO person_company_relationships (
                                    id, person_id, company_id, title, is_current, created_at, updated_at
                                ) VALUES (
                                    :id, :person_id, :company_id, NULL, {('1' if target_conn.dialect.name == 'sqlite' else 'TRUE')}, :created_at, :updated_at
                                ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT DO NOTHING')}
                            """),
                            {
                                "id": self._bind_uuid(uuid.uuid4(), target_conn),
                                "person_id": self._bind_uuid(target_p_id, target_conn),
                                "company_id": self._bind_uuid(target_c_id, target_conn),
                                "created_at": datetime.datetime.now(datetime.UTC),
                                "updated_at": datetime.datetime.now(datetime.UTC),
                            },
                        )
                    existing_pcr_keys.add(key)
                    self.stats["person_company_relationships"]["migrated"] += 1
            except Exception as e:
                logger.debug(f"Could not check primary_company_id: {e}")

        logger.info(
            f"PCRs: {self.stats['person_company_relationships']['migrated']} migrated, "
            f"{self.stats['person_company_relationships']['skipped']} skipped."
        )

    # --- 4. Migrate Intake: LinkedIn Connections ---
    def migrate_intake_linkedin_connections(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 4: Migrating Intake LinkedIn Connections ---")
        tbl = self._get_table_ref(source_conn, "cdp", "persons_linkedins")
        if not tbl:
            logger.warning("Source table persons_linkedins does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT connection_id, first_name, last_name, profile_url, email_address,
                       company, position, connected_at, raw_payload
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["intake_linkedin_connections"]["read"] = len(rows)

        for r in rows:
            conn_id = str(r["connection_id"])
            email = normalise_email(r.get("email_address"))
            li_url = normalise_linkedin_url(r.get("profile_url"))

            resolved_p_id = None
            if email and email in self.person_by_email:
                resolved_p_id = self.person_by_email[email]
            elif li_url and li_url in self.person_by_linkedin:
                resolved_p_id = self.person_by_linkedin[li_url]

            raw_payload = r.get("raw_payload") or {}
            if isinstance(raw_payload, str):
                try:
                    raw_payload = json.loads(raw_payload)
                except Exception:
                    raw_payload = {}

            if not self.dry_run:
                target_conn.execute(
                    text(f"""
                        INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO intake_linkedin_connections (
                            id, connection_id, first_name, last_name, profile_url, email_address,
                            company, position, connected_at, raw_payload, status, resolved_person_id, ingested_at
                        ) VALUES (
                            :id, :connection_id, :first_name, :last_name, :profile_url, :email_address,
                            :company, :position, :connected_at, :raw_payload, 'resolved', :resolved_person_id, :ingested_at
                        ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT (connection_id) DO NOTHING')}
                    """),
                    {
                        "id": self._bind_uuid(uuid.uuid4(), target_conn),
                        "connection_id": conn_id,
                        "first_name": (r.get("first_name") or "").strip() or None,
                        "last_name": (r.get("last_name") or "").strip() or None,
                        "profile_url": li_url,
                        "email_address": email,
                        "company": (r.get("company") or "").strip() or None,
                        "position": (r.get("position") or "").strip() or None,
                        "connected_at": r.get("connected_at"),
                        "raw_payload": self._json_val(raw_payload, target_conn),
                        "resolved_person_id": self._bind_uuid(resolved_p_id, target_conn),
                        "ingested_at": datetime.datetime.now(datetime.UTC),
                    },
                )
            self.stats["intake_linkedin_connections"]["migrated"] += 1

        logger.info(f"Intake LinkedIn Connections: {self.stats['intake_linkedin_connections']['migrated']} migrated.")

    # --- 5. Migrate Intake: LinkedIn Messages ---
    def migrate_intake_linkedin_messages(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 5: Migrating Intake LinkedIn Messages ---")
        tbl = self._get_table_ref(source_conn, "cdp", "leads_linkedin")
        if not tbl:
            logger.warning("Source table leads_linkedin does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT conversation_id, person_id, full_name, message_count, convo_history, raw_payload
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["intake_linkedin_messages"]["read"] = len(rows)

        for r in rows:
            convo_id = str(r["conversation_id"])
            p_orig = str(r["person_id"]) if r.get("person_id") else None
            resolved_p_id = self.person_id_map.get(p_orig) if p_orig else None

            raw_payload = r.get("raw_payload") or {}
            if isinstance(raw_payload, str):
                try:
                    raw_payload = json.loads(raw_payload)
                except Exception:
                    raw_payload = {}

            if "message_count" not in raw_payload and r.get("message_count") is not None:
                raw_payload["message_count"] = r.get("message_count")

            if not self.dry_run:
                target_conn.execute(
                    text(f"""
                        INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO intake_linkedin_messages (
                            id, conversation_id, participant_names, message_count, raw_content,
                            raw_payload, status, resolved_person_id, ingested_at
                        ) VALUES (
                            :id, :conversation_id, :participant_names, :message_count, :raw_content,
                            :raw_payload, 'resolved', :resolved_person_id, :ingested_at
                        ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT (conversation_id) DO NOTHING')}
                    """),
                    {
                        "id": self._bind_uuid(uuid.uuid4(), target_conn),
                        "conversation_id": convo_id,
                        "participant_names": (r.get("full_name") or "").strip() or None,
                        "message_count": int(r.get("message_count") or 0),
                        "raw_content": r.get("convo_history"),
                        "raw_payload": self._json_val(raw_payload, target_conn),
                        "resolved_person_id": self._bind_uuid(resolved_p_id, target_conn),
                        "ingested_at": datetime.datetime.now(datetime.UTC),
                    },
                )
            self.stats["intake_linkedin_messages"]["migrated"] += 1

        logger.info(f"Intake LinkedIn Messages: {self.stats['intake_linkedin_messages']['migrated']} migrated.")

    # --- 6. Migrate Intake: Notion Meeting Notes ---
    def migrate_intake_notion_meeting_notes(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 6: Migrating Intake Notion Meeting Notes ---")
        tbl = self._get_table_ref(source_conn, "cdp", "activities_notion_meeting_notes")
        if not tbl:
            logger.warning("Source table activities_notion_meeting_notes does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT page_id, database_name, title, meeting_date, attendees, summary_or_content, to_dos, url, raw_payload
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["intake_notion_meeting_notes"]["read"] = len(rows)

        for r in rows:
            page_id = str(r["page_id"])
            to_dos = r.get("to_dos") or []
            if isinstance(to_dos, str):
                try:
                    to_dos = json.loads(to_dos)
                except Exception:
                    to_dos = [to_dos]

            raw_payload = r.get("raw_payload") or {}
            if isinstance(raw_payload, str):
                try:
                    raw_payload = json.loads(raw_payload)
                except Exception:
                    raw_payload = {}

            if not self.dry_run:
                target_conn.execute(
                    text(f"""
                        INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO intake_notion_meeting_notes (
                            id, page_id, database_name, title, meeting_date, attendees, summary,
                            to_dos, url, raw_payload, status, ingested_at
                        ) VALUES (
                            :id, :page_id, :database_name, :title, :meeting_date, :attendees, :summary,
                            :to_dos, :url, :raw_payload, 'resolved', :ingested_at
                        ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT (page_id) DO NOTHING')}
                    """),
                    {
                        "id": self._bind_uuid(uuid.uuid4(), target_conn),
                        "page_id": page_id,
                        "database_name": (r.get("database_name") or "").strip() or None,
                        "title": (r.get("title") or "").strip() or None,
                        "meeting_date": r.get("meeting_date"),
                        "attendees": r.get("attendees"),
                        "summary": r.get("summary_or_content"),
                        "to_dos": self._json_val(to_dos, target_conn),
                        "url": r.get("url"),
                        "raw_payload": self._json_val(raw_payload, target_conn),
                        "ingested_at": datetime.datetime.now(datetime.UTC),
                    },
                )
            self.stats["intake_notion_meeting_notes"]["migrated"] += 1

        logger.info(f"Intake Notion Meeting Notes: {self.stats['intake_notion_meeting_notes']['migrated']} migrated.")

    # --- 7. Migrate Activities ---
    def migrate_activities(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 7: Migrating Activities ---")
        tbl = self._get_table_ref(source_conn, "cdp", "activities")
        if not tbl:
            logger.warning("Source table activities does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT id, activity_type, source, source_id, person_id, company_id, title,
                       activity_date, summary_or_content, participants, to_dos, url, created_at, updated_at
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["activities"]["read"] = len(rows)

        for r in rows:
            orig_id = str(r["id"])
            p_orig = str(r["person_id"]) if r.get("person_id") else None
            c_orig = str(r["company_id"]) if r.get("company_id") else None

            target_p_id = self.person_id_map.get(p_orig) if p_orig else None
            target_c_id = self.company_id_map.get(c_orig) if c_orig else None

            # Fallback: if no person_id but participants/title has matchable person
            if not target_p_id and not target_c_id:
                participants = r.get("participants") or r.get("title") or ""
                # Try finding any matched person from person caches
                for email_candidate, pid in self.person_by_email.items():
                    if email_candidate in participants.lower():
                        target_p_id = pid
                        break

            # If still neither person_id nor company_id, link to the first company or skip
            if not target_p_id and not target_c_id:
                if self.company_id_map:
                    target_c_id = next(iter(self.company_id_map.values()))
                else:
                    self.stats["activities"]["skipped"] += 1
                    continue

            source_id = str(r["source_id"]) if r.get("source_id") else None
            act_type = (r.get("activity_type") or "meeting").strip().lower()
            source = (r.get("source") or "notion").strip().lower()
            occurred_at = r.get("activity_date") or r.get("created_at") or datetime.datetime.now(datetime.UTC)
            created_at = r.get("created_at") or datetime.datetime.now(datetime.UTC)
            updated_at = r.get("updated_at") or datetime.datetime.now(datetime.UTC)

            attrs: dict[str, Any] = {"jager_origin_id": orig_id}
            if r.get("participants"):
                attrs["participants"] = r.get("participants")
            if r.get("to_dos"):
                attrs["to_dos"] = r.get("to_dos")
            if r.get("url"):
                attrs["url"] = r.get("url")

            if not self.dry_run:
                target_conn.execute(
                    text(f"""
                        INSERT {('OR IGNORE' if target_conn.dialect.name == 'sqlite' else '')} INTO activities (
                            id, person_id, company_id, type, source, source_id,
                            occurred_at, title, summary, attributes, created_at, updated_at
                        ) VALUES (
                            :id, :person_id, :company_id, :type, :source, :source_id,
                            :occurred_at, :title, :summary, :attributes, :created_at, :updated_at
                        ) {('' if target_conn.dialect.name == 'sqlite' else 'ON CONFLICT (source_id) DO NOTHING')}
                    """),
                    {
                        "id": self._bind_uuid(uuid.uuid4(), target_conn),
                        "person_id": self._bind_uuid(target_p_id, target_conn),
                        "company_id": self._bind_uuid(target_c_id, target_conn),
                        "type": act_type,
                        "source": source,
                        "source_id": source_id,
                        "occurred_at": occurred_at,
                        "title": (r.get("title") or "").strip() or None,
                        "summary": r.get("summary_or_content"),
                        "attributes": self._json_val(attrs, target_conn),
                        "created_at": created_at,
                        "updated_at": updated_at,
                    },
                )
            self.stats["activities"]["migrated"] += 1

        logger.info(
            f"Activities: {self.stats['activities']['migrated']} migrated, "
            f"{self.stats['activities']['skipped']} skipped."
        )

    # --- 8. Migrate Leads ---
    def migrate_leads(self, source_conn: sa.Connection, target_conn: sa.Connection) -> None:
        logger.info("--- Step 8: Migrating Leads ---")
        tbl = self._get_table_ref(source_conn, "cdp", "leads")
        if not tbl:
            logger.warning("Source table leads does not exist. Skipping.")
            return

        rows = source_conn.execute(
            text(f"""
                SELECT id, person_id, company_id, status, source, intent, signal_strength,
                       summary, message_count, convo_history, opportunity_type, rate,
                       {('created_at' if source_conn.dialect.name == 'sqlite' else 'COALESCE(intake_at, updated_at) AS created_at')}, updated_at
                FROM {tbl}
            """)
        ).mappings().all()

        self.stats["leads"]["read"] = len(rows)

        for r in rows:
            orig_id = str(r["id"])
            p_orig = str(r["person_id"]) if r.get("person_id") else None
            c_orig = str(r["company_id"]) if r.get("company_id") else None

            target_p_id = self.person_id_map.get(p_orig) if p_orig else None
            target_c_id = self.company_id_map.get(c_orig) if c_orig else None

            if not target_p_id:
                self.stats["leads"]["skipped"] += 1
                continue

            stage = map_lead_stage(r.get("status"), r.get("signal_strength"))
            source = (r.get("source") or "linkedin_message").strip().lower()
            intent = (r.get("intent") or "").strip() or None
            signal_strength = (r.get("signal_strength") or "").strip().lower() or None
            notes = r.get("summary")
            created_at = r.get("created_at") or datetime.datetime.now(datetime.UTC)
            updated_at = r.get("updated_at") or datetime.datetime.now(datetime.UTC)

            # Check if this lead already migrated by source_ref_id
            existing = target_conn.execute(
                text("SELECT id FROM leads WHERE source_ref_id = :ref_id"),
                {"ref_id": orig_id},
            ).scalar()
            if existing:
                self.stats["leads"]["skipped"] += 1
                continue

            if not self.dry_run:
                target_conn.execute(
                    text("""
                        INSERT INTO leads (
                            id, person_id, company_id, stage, source, source_ref_id,
                            intent, signal_strength, notes, created_at, updated_at
                        ) VALUES (
                            :id, :person_id, :company_id, :stage, :source, :source_ref_id,
                            :intent, :signal_strength, :notes, :created_at, :updated_at
                        )
                    """),
                    {
                        "id": self._bind_uuid(uuid.uuid4(), target_conn),
                        "person_id": self._bind_uuid(target_p_id, target_conn),
                        "company_id": self._bind_uuid(target_c_id, target_conn),
                        "stage": stage,
                        "source": source,
                        "source_ref_id": orig_id,
                        "intent": intent,
                        "signal_strength": signal_strength,
                        "notes": notes,
                        "created_at": created_at,
                        "updated_at": updated_at,
                    },
                )
            self.stats["leads"]["migrated"] += 1

        logger.info(
            f"Leads: {self.stats['leads']['migrated']} migrated, "
            f"{self.stats['leads']['skipped']} skipped."
        )

    def run(self) -> None:
        logger.info("Starting Jager `cdp` to CDB `cdb` data migration...")
        logger.info(f"Source URL: {self.source_url}")
        logger.info(f"Target URL: {self.target_url}")
        logger.info(f"Dry run mode: {self.dry_run}")

        with self.source_engine.connect() as source_conn, self.target_engine.begin() as target_conn:
            self._init_caches_from_target(target_conn)

            self.migrate_companies(source_conn, target_conn)
            self.migrate_persons(source_conn, target_conn)
            self.migrate_relationships(source_conn, target_conn)
            self.migrate_intake_linkedin_connections(source_conn, target_conn)
            self.migrate_intake_linkedin_messages(source_conn, target_conn)
            self.migrate_intake_notion_meeting_notes(source_conn, target_conn)
            self.migrate_activities(source_conn, target_conn)
            self.migrate_leads(source_conn, target_conn)

        self.print_summary()

    def print_summary(self) -> None:
        logger.info("================== MIGRATION SUMMARY ==================")
        logger.info(f"{'Table':<32} | {'Read':<8} | {'Migrated':<8} | {'Skipped':<8}")
        logger.info("-" * 64)
        for tbl, s in self.stats.items():
            logger.info(f"{tbl:<32} | {s['read']:<8} | {s['migrated']:<8} | {s['skipped']:<8}")
        logger.info("=======================================================")


def validate_target(target_url: str) -> None:
    logger.info("Running validation queries on CDB target database...")
    engine = sa.create_engine(target_url)
    with engine.connect() as conn:
        tables = [
            "companies",
            "persons",
            "person_company_relationships",
            "activities",
            "leads",
            "intake_linkedin_connections",
            "intake_linkedin_messages",
            "intake_notion_meeting_notes",
        ]
        logger.info(f"{'Table':<32} | {'Row Count':<10}")
        logger.info("-" * 46)
        for t in tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                logger.info(f"{t:<32} | {cnt:<10}")
            except Exception as e:
                logger.warning(f"{t:<32} | ERROR: {e}")

        # Check for orphan FKs
        try:
            orphan_leads = conn.execute(
                text("SELECT COUNT(*) FROM leads WHERE person_id NOT IN (SELECT id FROM persons)")
            ).scalar()
            logger.info(f"Orphaned leads count: {orphan_leads}")
        except Exception:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate data from Jager cdp to CDB cdb PostgreSQL.")
    parser.add_argument(
        "--source-url",
        default=os.getenv("JAGER_DATABASE_URL", "postgresql://jager:jager@localhost:5432/jager"),
        help="Source PostgreSQL connection URL (default: JAGER_DATABASE_URL or localhost:5432/jager)",
    )
    parser.add_argument(
        "--target-url",
        default=os.getenv("DATABASE_URL", "postgresql://cdb:cdb@localhost:5433/cdb"),
        help="Target PostgreSQL connection URL (default: DATABASE_URL or localhost:5433/cdb)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without committing changes to target DB",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Run validation checks on target CDB database only",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for processing records",
    )

    args = parser.parse_args()

    if args.validate_only:
        validate_target(args.target_url)
        return

    migrator = DataMigrator(
        source_url=args.source_url,
        target_url=args.target_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
    )
    migrator.run()


if __name__ == "__main__":
    main()
