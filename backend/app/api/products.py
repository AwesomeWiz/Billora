# backend/app/api/products.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.db import AsyncSessionLocal
from ..core.permissions import require_role
from ..models.product import Product
from ..models.product_variant import ProductVariant
from ..schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductOut,
    VariantCreate,
    VariantOut,
)
from app.api.auth import get_current_user, verify_csrf, verify_origin

router = APIRouter(prefix="/products", tags=["Catalog"])

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        yield db

# ------------------------------------------------------------------
# Product list (public)
# ------------------------------------------------------------------
@router.get("/", response_model=List[ProductOut])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product)
    if name:
        stmt = stmt.where(Product.name.ilike(f"%{name.strip()}%"))
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    products = result.scalars().all()
    return [ProductOut.from_orm(p) for p in products]

# ------------------------------------------------------------------
# Product mutations (protected)
# ------------------------------------------------------------------
@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def create_product(
    payload: ProductCreate,
    user=Depends(require_role("ADMIN", "STAFF")),
    db: AsyncSession = Depends(get_db),
):
    product = Product(**payload.dict())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ProductOut.from_orm(product)

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.from_orm(product)

@router.patch("/{product_id}", response_model=ProductOut,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    user=Depends(require_role("ADMIN", "STAFF")),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    for field, value in updates.items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return ProductOut.from_orm(product)

# ------------------------------------------------------------------
# Variant endpoints (protected)
# ------------------------------------------------------------------
@router.post("/variants", response_model=VariantOut, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def create_variant(
    payload: VariantCreate,
    user=Depends(require_role("ADMIN", "STAFF")),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Parent product not found")
    variant = ProductVariant(**payload.dict())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return VariantOut.from_orm(variant)

@router.get("/variants/{variant_id}", response_model=VariantOut)
async def get_variant(variant_id: str, db: AsyncSession = Depends(get_db)):
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    return VariantOut.from_orm(variant)
