from fastapi import APIRouter

from cdb.api.v1.auth import router as auth_router
from cdb.api.v1.health import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
