import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

from cdb.core.config import settings

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
