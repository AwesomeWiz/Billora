# backend/app/api/products.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.auth import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.db import AsyncSessionLocal
from ..core.permissions import require_role
from ..models.product import Product
from ..models.product_variant import ProductVariant
from ..schemas.product import (
    ProductCreate,
    ProductOut,
    VariantCreate,
    VariantOut,
)

router = APIRouter(prefix="/products", tags=["Catalog"])

# Helper to provide a DB session per request
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as sess:
        yield sess

# ------------------------------------------------------------------
# Product endpoints
# ------------------------------------------------------------------
@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(user, "ADMIN", "STAFF")
    prod = Product(**payload.dict())
    db.add(prod)
    await db.commit()
    await db.refresh(prod)
    return ProductOut.from_orm(prod)

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    prod = await db.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.from_orm(prod)

@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(user, "ADMIN", "STAFF")
    prod = await db.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.dict().items():
        setattr(prod, field, value)
    await db.commit()
    await db.refresh(prod)
    return ProductOut.from_orm(prod)

# ------------------------------------------------------------------
# Variant endpoints
# ------------------------------------------------------------------
@router.post("/variants", response_model=VariantOut, status_code=status.HTTP_201_CREATED)
async def create_variant(
    payload: VariantCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(user, "ADMIN", "STAFF")
    # ensure parent product exists
    prod = await db.get(Product, payload.product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Parent product not found")
    var = ProductVariant(**payload.dict())
    db.add(var)
    await db.commit()
    await db.refresh(var)
    return VariantOut.from_orm(var)

@router.get("/variants/{variant_id}", response_model=VariantOut)
async def get_variant(variant_id: str, db: AsyncSession = Depends(get_db)):
    var = await db.get(ProductVariant, variant_id)
    if not var:
        raise HTTPException(status_code=404, detail="Variant not found")
    return VariantOut.from_orm(var)
