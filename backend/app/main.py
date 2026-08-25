from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.api.v1.router import api_router


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == "admin@agritrace.org").first()
            if not admin_user:
                default_admin = User(
                    email="admin@agritrace.org",
                    full_name="AgriTrace System Administrator",
                    hashed_password=get_password_hash("AdminPass123!"),
                    role=UserRole.SUPER_ADMIN,
                    organization="AgriTrace Global HQ",
                    is_active=True,
                    is_verified=True
                )
                db.add(default_admin)
                db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[Warning] Database initialization skipped or deferred: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
