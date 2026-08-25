from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, farmers, farms

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & User Management"])
api_router.include_router(farmers.router, prefix="/farmers", tags=["Farmer Profiles"])
api_router.include_router(farms.router, prefix="/farms", tags=["Farms & Crops"])
