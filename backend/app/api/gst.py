from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_db, verify_csrf, verify_origin
from app.core.permissions import require_role
from app.models.gst import GstSettings

router = APIRouter(prefix="/gst", tags=["GST"])
read_access = require_role("ADMIN", "STAFF")
write_access = require_role("ADMIN")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]


class GstSettingsPatch(BaseModel):
    gstin: str | None = Field(default=None, pattern=r"^[0-9A-Z]{15}$")
    legal_business_name: str | None = Field(default=None, max_length=200)
    registered_state_code: str | None = Field(default=None, pattern=r"^[0-9]{2}$")
    composition_scheme: bool | None = None
    e_invoicing_enabled: bool | None = None
    reverse_charge_applicable: bool | None = None


def settings_out(settings: GstSettings):
    return {
        "gstin": settings.gstin,
        "legal_business_name": settings.legal_business_name,
        "registered_state_code": settings.registered_state_code,
        "composition_scheme": settings.composition_scheme,
        "e_invoicing_enabled": settings.e_invoicing_enabled,
        "reverse_charge_applicable": settings.reverse_charge_applicable,
    }


@router.get("/settings")
async def get_settings(user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    settings = await db.get(GstSettings, 1)
    if settings is None:
        return {
            "gstin": None, "legal_business_name": None, "registered_state_code": None,
            "composition_scheme": False, "e_invoicing_enabled": False,
            "reverse_charge_applicable": False,
        }
    return settings_out(settings)


@router.patch("/settings", dependencies=mutation_checks)
async def update_settings(payload: GstSettingsPatch, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    settings = await db.get(GstSettings, 1)
    if settings is None:
        settings = GstSettings(id=1)
        db.add(settings)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings_out(settings)


@router.get("/intelligence")
async def gst_intelligence(user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    # Legacy invoices have no tax snapshots, so report zero recorded tax and
    # disclose that the source data required for tax analytics is unavailable.
    return {
        "total_tax_collected_minor": 0,
        "cgst_collected_minor": 0,
        "sgst_collected_minor": 0,
        "igst_collected_minor": 0,
        "pending_error_count": 0,
        "currency": "INR",
        "tax_snapshot_data_available": False,
    }


@router.get("/errors")
async def gst_errors(user=Depends(read_access)):
    return {"items": []}


@router.post("/errors/{error_id}/approve", dependencies=mutation_checks)
async def approve_tax_fix(error_id: str, user=Depends(write_access)):
    raise HTTPException(404, "GST error record not found")
