# backend/app/main.py
from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.api.plans import router as plans_router
from app.core.config import settings
from app.core.db import engine, Base
import uvicorn

app = FastAPI(
    title="Billora Backend",
    version="0.1.0",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
)

# Register routers
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(products_router, prefix=settings.api_prefix)
app.include_router(plans_router, prefix=settings.api_prefix)

@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}

# Register models with SQLAlchemy before creating the schema. These imports
# also resolve the string-based relationships across the account hierarchy.
from app.models.plan import Plan  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.subscription import Subscription  # noqa: F401
from app.models.invoice import Invoice  # noqa: F401

# Create tables on startup (dev only)
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
