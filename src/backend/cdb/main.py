from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cdb.api.v1.health import router as root_health_router
from cdb.api.v1.router import api_v1_router
from cdb.core.config import settings
from cdb.core.errors import register_error_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    yield
    # Shutdown logic


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="CDB (Client DataBase) - Open-source Personal CRM & Customer Data Platform",
        lifespan=lifespan,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error handling envelope registration
    register_error_handlers(application)

    # Root health endpoint
    application.include_router(root_health_router)

    # API v1 Router
    application.include_router(api_v1_router)

    return application


app = create_application()
