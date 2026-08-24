from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.init_db import ensure_database_exists, ensure_initial_admin
from cdb.models.user import User


def test_ensure_database_exists_empty_url():
    # Should safely return without error when no url is provided and settings has empty url
    with patch("cdb.core.init_db.settings") as mock_settings:
        mock_settings.SYNC_DATABASE_URL = ""
        ensure_database_exists(None)


def test_ensure_database_exists_non_postgres():
    # Non-postgres URLs (such as SQLite) should be skipped gracefully
    ensure_database_exists("sqlite+aiosqlite:///:memory:")


def test_ensure_database_exists_creates_database_when_missing():
    mock_conn = MagicMock()
    # First query checks if db exists -> returns None (not found)
    mock_conn.execute.return_value.scalar.return_value = None

    mock_engine = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn

    with patch("cdb.core.init_db.create_engine", return_value=mock_engine) as mock_create_engine:
        ensure_database_exists("postgresql://jager:jager@db:5432/cdb")

        mock_create_engine.assert_called_once()
        # Verify isolation_level="AUTOCOMMIT" was used
        assert mock_create_engine.call_args[1].get("isolation_level") == "AUTOCOMMIT"
        # Verify CREATE DATABASE "cdb" was executed
        executed_sqls = [str(call[0][0]) for call in mock_conn.execute.call_args_list]
        assert any('CREATE DATABASE "cdb"' in sql for sql in executed_sqls)


def test_ensure_database_exists_skips_when_database_already_exists():
    mock_conn = MagicMock()
    # First query checks if db exists -> returns 1 (already exists)
    mock_conn.execute.return_value.scalar.return_value = 1

    mock_engine = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn

    with patch("cdb.core.init_db.create_engine", return_value=mock_engine):
        ensure_database_exists("postgresql://jager:jager@db:5432/cdb")

        executed_sqls = [str(call[0][0]) for call in mock_conn.execute.call_args_list]
        assert not any("CREATE DATABASE" in sql for sql in executed_sqls)


def test_ensure_database_exists_fallback_maintenance_db():
    # First maintenance DB connection fails, second succeeds
    mock_conn = MagicMock()
    mock_conn.execute.return_value.scalar.return_value = 1
    mock_engine_success = MagicMock()
    mock_engine_success.connect.return_value.__enter__.return_value = mock_conn

    side_effects = [Exception("Cannot connect to postgres"), mock_engine_success]

    with patch("cdb.core.init_db.create_engine", side_effect=side_effects):
        ensure_database_exists("postgresql://jager:jager@db:5432/cdb")

        assert mock_conn.execute.called


def test_ensure_database_exists_no_target_db():
    # URL without database name should return safely
    ensure_database_exists("postgresql://user:pass@localhost")


def test_ensure_database_exists_handles_exception_gracefully():
    with patch("cdb.core.init_db.make_url", side_effect=Exception("Fatal parse error")):
        # Should not raise exception
        ensure_database_exists("postgresql://jager:jager@db:5432/cdb")


@pytest.mark.asyncio
async def test_ensure_initial_admin_creates_user(db_session: AsyncSession):
    with patch("cdb.core.init_db.settings") as mock_settings:
        mock_settings.FIRST_SUPERUSER_EMAIL = "admin_test@cdb.internal"
        mock_settings.FIRST_SUPERUSER_PASSWORD = "testpassword123"
        mock_settings.FIRST_SUPERUSER_FULL_NAME = "Test Admin"

        await ensure_initial_admin(db=db_session)

        # Check user was created
        stmt = select(User).where(User.email == "admin_test@cdb.internal")
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.email == "admin_test@cdb.internal"
        assert user.role == "admin"
        assert user.full_name == "Test Admin"
        assert user.is_active is True

        # Running again should not duplicate or fail
        await ensure_initial_admin(db=db_session)


@pytest.mark.asyncio
async def test_ensure_initial_admin_skips_when_empty_settings(db_session: AsyncSession):
    with patch("cdb.core.init_db.settings") as mock_settings:
        mock_settings.FIRST_SUPERUSER_EMAIL = ""
        mock_settings.FIRST_SUPERUSER_PASSWORD = ""

        await ensure_initial_admin(db=db_session)
        # Should not raise and should not create users
