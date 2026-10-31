from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_db, verify_csrf, verify_origin
from app.core.permissions import require_role
from app.models.product import Product
from app.models.tax import TaxRule

router = APIRouter(prefix="/taxes", tags=["Taxes"])
read_access = require_role("ADMIN", "STAFF")
write_access = require_role("ADMIN")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]


class TaxInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    rate_bps: int = Field(ge=0, le=10000)
    scope: str = "GLOBAL"
    product_id: str | None = None
    effective_from: date
    effective_to: date | None = None
    active: bool = True

    @model_validator(mode="after")
    def validate_rule(self):
        if self.scope not in {"GLOBAL", "PRODUCT"}:
            raise ValueError("scope must be GLOBAL or PRODUCT")
        if (self.scope == "PRODUCT") != (self.product_id is not None):
            raise ValueError("PRODUCT scope requires product_id; GLOBAL scope forbids it")
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be before effective_from")
        return self


class TaxPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    rate_bps: int | None = Field(default=None, ge=0, le=10000)
    scope: str | None = None
    product_id: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    active: bool | None = None


class TaxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    rate_bps: int
    scope: str
    product_id: str | None
    product_name: str | None = None
    effective_from: date
    effective_to: date | None
    active: bool
    created_at: str | None = None


class TaxPage(BaseModel):
    items: list[TaxOut]
    total: int
    page: int
    page_size: int
    has_next: bool


async def output(db: AsyncSession, tax: TaxRule):
    product_name = (
        await db.scalar(select(Product.name).where(Product.id == tax.product_id))
        if tax.product_id else None
    )
    return TaxOut(
        id=tax.id, name=tax.name, rate_bps=tax.rate_bps, scope=tax.scope,
        product_id=tax.product_id, product_name=product_name,
        effective_from=tax.effective_from, effective_to=tax.effective_to,
        active=tax.active, created_at=tax.created_at.isoformat() if tax.created_at else None,
    )


async def validate_product(db: AsyncSession, scope: str, product_id: str | None):
    if scope not in {"GLOBAL", "PRODUCT"} or ((scope == "PRODUCT") != (product_id is not None)):
        raise HTTPException(422, "Invalid tax scope or product association")
    if product_id and not await db.get(Product, product_id):
        raise HTTPException(422, "product_id must reference an existing product")


@router.get("", response_model=TaxPage)
async def list_taxes(
    search: str | None = None, scope: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    user=Depends(read_access), db: AsyncSession = Depends(get_db),
):
    stmt = select(TaxRule)
    if search and search.strip():
        stmt = stmt.where(TaxRule.name.icontains(search.strip(), autoescape=True))
    if scope:
        if scope not in {"GLOBAL", "PRODUCT"}:
            raise HTTPException(422, "scope must be GLOBAL or PRODUCT")
        stmt = stmt.where(TaxRule.scope == scope)
    if active is not None:
        stmt = stmt.where(TaxRule.active.is_(active))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.scalars(stmt.order_by(TaxRule.name, TaxRule.id)
                            .offset((page - 1) * page_size).limit(page_size))).all()
    return {"items": [await output(db, row) for row in rows], "total": total,
            "page": page, "page_size": page_size, "has_next": page * page_size < total}


@router.post("", response_model=TaxOut, status_code=201, dependencies=mutation_checks)
async def create_tax(payload: TaxInput, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    await validate_product(db, payload.scope, payload.product_id)
    tax = TaxRule(**payload.model_dump())
    db.add(tax)
    await db.commit()
    await db.refresh(tax)
    return await output(db, tax)


@router.get("/{tax_id}", response_model=TaxOut)
async def get_tax(tax_id: str, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    tax = await db.get(TaxRule, tax_id)
    if tax is None:
        raise HTTPException(404, "Tax rule not found")
    return await output(db, tax)


@router.patch("/{tax_id}", response_model=TaxOut, dependencies=mutation_checks)
async def patch_tax(tax_id: str, payload: TaxPatch, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    tax = await db.get(TaxRule, tax_id)
    if tax is None:
        raise HTTPException(404, "Tax rule not found")
    values = {**{k: getattr(tax, k) for k in TaxInput.model_fields}, **payload.model_dump(exclude_unset=True)}
    try:
        validated = TaxInput.model_validate(values)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    await validate_product(db, validated.scope, validated.product_id)
    for key in payload.model_fields_set:
        setattr(tax, key, getattr(validated, key))
    await db.commit()
    await db.refresh(tax)
    return await output(db, tax)
