# backend/app/main.py
from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.api.plans import router as plans_router
from app.api.customers import router as customers_router
from app.api.discounts import router as discounts_router
from app.api.billing_reads import router as billing_reads_router
from app.api.payments import router as payments_router
from app.api.quotations import router as quotations_router
from app.api.taxes import router as taxes_router
from app.api.revenue_alerts import router as revenue_alerts_router
from app.api.activity import router as activity_router
from app.api.gst import router as gst_router
from app.api.imports import router as imports_router
from app.core.config import settings
from app.core.db import engine, Base
from app.core.admin_schema import initialize_admin_schema
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
app.include_router(customers_router, prefix=settings.api_prefix)
app.include_router(discounts_router, prefix=settings.api_prefix)
app.include_router(billing_reads_router, prefix=settings.api_prefix)
app.include_router(payments_router, prefix=settings.api_prefix)
app.include_router(quotations_router, prefix=settings.api_prefix)
app.include_router(taxes_router, prefix=settings.api_prefix)
app.include_router(revenue_alerts_router, prefix=settings.api_prefix)
app.include_router(activity_router, prefix=settings.api_prefix)
app.include_router(gst_router, prefix=settings.api_prefix)
app.include_router(imports_router, prefix=settings.api_prefix)

@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}

# Register models with SQLAlchemy before creating the schema. These imports
# also resolve the string-based relationships across the account hierarchy.
from app.models.plan import Plan  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.subscription import Subscription  # noqa: F401
from app.models.invoice import Invoice  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.quotation import Quotation, QuotationLine, QuotationTemplate, QuotationTemplateLine  # noqa: F401
from app.models.tax import TaxRule  # noqa: F401
from app.models.activity import ActivityEvent, UserNotification  # noqa: F401
from app.models.gst import GstSettings  # noqa: F401
from app.models.import_batch import ImportBatch  # noqa: F401

# Create tables on startup (dev only)
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(initialize_admin_schema)

@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
