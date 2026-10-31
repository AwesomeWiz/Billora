# backend/app/main.py
from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.products import router as products_router
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
app.include_router(auth_router)
app.include_router(products_router)

# Health endpoint
@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}

# Create tables on startup (for dev only; migrations should be used in prod)
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
