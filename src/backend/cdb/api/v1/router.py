from fastapi import APIRouter

from cdb.api.v1.activities import router as activities_router
from cdb.api.v1.auth import router as auth_router
from cdb.api.v1.companies import router as companies_router
from cdb.api.v1.er import router as er_router
from cdb.api.v1.health import router as health_router
from cdb.api.v1.ingestion import router as ingestion_router
from cdb.api.v1.leads import router as leads_router
from cdb.api.v1.opportunities import router as opportunities_router
from cdb.api.v1.persons import router as persons_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(persons_router)
api_v1_router.include_router(companies_router)
api_v1_router.include_router(activities_router)
api_v1_router.include_router(leads_router)
api_v1_router.include_router(opportunities_router)
api_v1_router.include_router(ingestion_router)
api_v1_router.include_router(er_router)
