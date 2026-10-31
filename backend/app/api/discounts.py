from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import get_db, verify_csrf, verify_origin
from app.api.admin_common import merged_input, page_rows
from app.core.permissions import require_role
from app.models.discount import Discount
from app.models.product import Product
from app.schemas.discount import DiscountCreate, DiscountUpdate, DiscountOut, DiscountPage, Kind, Scope

router = APIRouter(prefix="/discounts", tags=["Discounts"])
read_access = require_role("ADMIN", "STAFF")
write_access = require_role("ADMIN")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]


async def output(db, discount):
    result = DiscountOut.model_validate(discount)
    if discount.product_id:
        result.product_name = await db.scalar(select(Product.name).where(Product.id == discount.product_id))
    return result


async def persist(db, discount):
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "Discount conflicts with current product or usage state") from exc
    await db.refresh(discount)
    return await output(db, discount)


async def check_product(db, payload):
    if payload.product_id and not await db.get(Product, payload.product_id):
        raise HTTPException(422, "product_id must reference an existing product")


@router.get("", response_model=DiscountPage)
async def list_discounts(search: str | None = None, kind: Kind | None = None,
                         scope: Scope | None = None, active: bool | None = None,
                         page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                         user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    stmt = select(Discount)
    if search and search.strip():
        stmt = stmt.where(Discount.name.icontains(search.strip(), autoescape=True))
    for field, value in ((Discount.kind, kind), (Discount.scope, scope), (Discount.active, active)):
        if value is not None:
            stmt = stmt.where(field == value)
    rows, meta = await page_rows(db, stmt.order_by(Discount.created_at, Discount.id), page, page_size)
    return {"items": [await output(db, row) for row in rows], **meta}


@router.post("", response_model=DiscountOut, status_code=201, dependencies=mutation_checks)
async def create_discount(payload: DiscountCreate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    await check_product(db, payload)
    discount = Discount(**payload.model_dump())
    db.add(discount)
    return await persist(db, discount)


@router.get("/{discount_id}", response_model=DiscountOut)
async def get_discount(discount_id: str, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    discount = await db.get(Discount, discount_id)
    if not discount:
        raise HTTPException(404, "Discount not found")
    return await output(db, discount)


@router.patch("/{discount_id}", response_model=DiscountOut, dependencies=mutation_checks)
async def update_discount(discount_id: str, payload: DiscountUpdate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    discount = await db.get(Discount, discount_id)
    if not discount:
        raise HTTPException(404, "Discount not found")
    validated = merged_input(DiscountCreate, discount, payload)
    await check_product(db, validated)
    if validated.max_uses is not None and validated.max_uses < discount.uses_count:
        raise HTTPException(409, "max_uses cannot be lower than recorded uses_count")
    for key in payload.model_fields_set:
        setattr(discount, key, getattr(validated, key))
    return await persist(db, discount)
