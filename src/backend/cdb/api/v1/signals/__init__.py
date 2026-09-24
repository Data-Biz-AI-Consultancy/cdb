from fastapi import APIRouter

from cdb.api.v1.signals.catalog import router as catalog_router
from cdb.api.v1.signals.detected import router as detected_router
from cdb.api.v1.signals.evaluation import router as evaluation_router
from cdb.api.v1.signals.feedback import router as feedback_router
from cdb.api.v1.signals.metrics import router as metrics_router
from cdb.api.v1.signals.routing import router as routing_router

router = APIRouter(prefix="/signals", tags=["Signals"])

router.include_router(catalog_router)
router.include_router(evaluation_router)
router.include_router(metrics_router)
router.include_router(detected_router)
router.include_router(feedback_router)
router.include_router(routing_router)

__all__ = ["router"]
