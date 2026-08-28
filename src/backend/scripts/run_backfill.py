import asyncio
import logging

from cdb.core.database import AsyncSessionLocal
from cdb.services.ingestion.backfill import (
    backfill_linkedin_companies_and_relationships,
    backfill_linkedin_messages_into_activities,
    backfill_notion_meeting_notes_into_activities,
)
from cdb.services.segmentation.service import evaluate_segments_and_temperature

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting complete CDB backfill process...")
    async with AsyncSessionLocal() as session:
        logger.info("1. Backfilling LinkedIn companies and employment relationships...")
        comp_res = await backfill_linkedin_companies_and_relationships(session)
        logger.info("Company backfill result: %s", comp_res)

        logger.info("2. Backfilling LinkedIn messages into activities & leads...")
        msg_res = await backfill_linkedin_messages_into_activities(session)
        logger.info("Message backfill result: %s", msg_res)

        logger.info("3. Backfilling Notion meeting notes into activities...")
        notion_res = await backfill_notion_meeting_notes_into_activities(session)
        logger.info("Notion backfill result: %s", notion_res)

        logger.info("4. Re-evaluating segments and engagement temperatures...")
        seg_res = await evaluate_segments_and_temperature(session)
        logger.info("Segmentation result: %s", seg_res)

    logger.info("Complete backfill finished successfully!")


if __name__ == "__main__":
    asyncio.run(main())
