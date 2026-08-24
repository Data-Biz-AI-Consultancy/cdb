import logging

from sqlalchemy import create_engine, select, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.database import AsyncSessionLocal
from cdb.core.security import get_password_hash
from cdb.models.user import User

logger = logging.getLogger(__name__)


def ensure_database_exists(db_url: str | None = None) -> None:
    """
    Ensures that the PostgreSQL target database specified in db_url exists.
    If the database does not exist, connects to a maintenance database (postgres, jager, template1)
    and executes CREATE DATABASE.
    """
    url_str = db_url or settings.SYNC_DATABASE_URL
    if not url_str:
        return

    try:
        url = make_url(url_str)
        # Only process PostgreSQL connections
        if "postgresql" not in url.drivername and "postgres" not in url.drivername:
            return

        target_db = url.database
        if not target_db:
            return

        # Maintenance databases to attempt connecting to for CREATE DATABASE
        maintenance_dbs = ["postgres", "jager", "template1"]
        # Filter out the target_db so we do not attempt connecting to the non-existent DB
        maintenance_dbs = [db for db in maintenance_dbs if db != target_db]

        driver = "postgresql+psycopg2"

        for m_db in maintenance_dbs:
            try:
                m_url = url.set(drivername=driver, database=m_db)
                engine = create_engine(m_url, isolation_level="AUTOCOMMIT")
                with engine.connect() as conn:
                    exists = conn.execute(
                        text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                        {"dbname": target_db},
                    ).scalar()
                    if not exists:
                        logger.info("Database '%s' does not exist. Creating...", target_db)
                        conn.execute(text(f'CREATE DATABASE "{target_db}"'))
                        logger.info("Database '%s' created successfully.", target_db)
                    else:
                        logger.debug("Database '%s' already exists.", target_db)
                engine.dispose()
                return
            except Exception as e:
                logger.debug("Could not connect to maintenance database '%s': %s", m_db, e)
                continue

    except Exception as exc:
        logger.warning("Could not automatically check/create database: %s", exc)


async def ensure_initial_admin(db: AsyncSession | None = None) -> None:
    """
    Ensures the default/initial admin superuser exists in the users table.
    Creates the account if FIRST_SUPERUSER_EMAIL is configured and not yet present.
    """
    if not settings.FIRST_SUPERUSER_EMAIL or not settings.FIRST_SUPERUSER_PASSWORD:
        return

    async def _create_admin(session: AsyncSession) -> None:
        stmt = select(User).where(User.email == settings.FIRST_SUPERUSER_EMAIL)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            admin_user = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                hashed_pw=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                full_name=settings.FIRST_SUPERUSER_FULL_NAME,
                role="admin",
                is_active=True,
            )
            session.add(admin_user)
            await session.commit()
            logger.info("Initial admin user '%s' created successfully.", settings.FIRST_SUPERUSER_EMAIL)
        else:
            logger.debug("Initial admin user '%s' already exists.", settings.FIRST_SUPERUSER_EMAIL)

    try:
        if db is not None:
            await _create_admin(db)
        else:
            async with AsyncSessionLocal() as session:
                await _create_admin(session)
    except Exception as exc:
        logger.warning("Could not automatically check/create initial admin user: %s", exc)

