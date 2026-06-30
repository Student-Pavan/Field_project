from fastapi import APIRouter

from app.api.v1.endpoints import auth, reports, resources, simulations, workflows

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(resources.router)
api_router.include_router(workflows.router)
api_router.include_router(reports.router)
api_router.include_router(simulations.router)
