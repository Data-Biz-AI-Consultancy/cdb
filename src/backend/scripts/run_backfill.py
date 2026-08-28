import asyncio
import logging

from cdb.core.database import AsyncSessionLocal
from cdb.services.ingestion.backfill import backfill_linkedin_companies_and_relationships
from cdb.services.segmentation.service import evaluate_segments_and_temperature

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting LinkedIn company & relationship backfill...")
    async with AsyncSessionLocal() as session:
        res = await backfill_linkedin_companies_and_relationships(session)
        logger.info("Backfill result: %s", res)

        logger.info("Re-evaluating segments across all persons...")
        seg_res = await evaluate_segments_and_temperature(session)
        logger.info("Segmentation result: %s", seg_res)


if __name__ == "__main__":
    asyncio.run(main())
