from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import get_db, verify_csrf, verify_origin
from app.api.admin_common import merged_input, page_rows
from app.core.permissions import require_role
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.schemas.product import (ProductCreate, ProductUpdate, ProductOut, ProductPage,
                                 VariantCreate, VariantOut, NestedVariantCreate, NestedVariantOut, VariantUpdate)

router = APIRouter(prefix="/products", tags=["Catalog"])
read_access = require_role("ADMIN", "STAFF")
write_access = require_role("ADMIN")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]


async def product_or_404(db, product_id):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


async def product_output(db, product):
    result = ProductOut.model_validate(product)
    result.variant_count = await db.scalar(select(func.count()).select_from(ProductVariant).where(
        ProductVariant.product_id == product.id, ProductVariant.deleted_at.is_(None)))
    return result


async def variant_or_404(db, product_id, variant_id):
    variant = await db.scalar(select(ProductVariant).where(ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id, ProductVariant.deleted_at.is_(None)))
    if not variant:
        raise HTTPException(404, "Variant not found for this product")
    return variant


def check_variant_price(product, delta):
    if not 0 <= product.sales_price_minor + delta <= 9_007_199_254_740_991:
        raise HTTPException(422, "Variant resolved price must be a nonnegative safe integer")


@router.get("", response_model=ProductPage)
async def list_products(search: str | None = None, type: str | None = None, active: bool | None = None,
                        page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                        user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    stmt = select(Product)
    if search and search.strip():
        stmt = stmt.where(Product.name.icontains(search.strip(), autoescape=True))
    if type:
        stmt = stmt.where(Product.type == type)
    if active is not None:
        stmt = stmt.where(Product.active == active)
    rows, meta = await page_rows(db, stmt.order_by(Product.created_at, Product.id), page, page_size)
    return {"items": [await product_output(db, row) for row in rows], **meta}


@router.get("/", response_model=list[ProductOut], include_in_schema=False)
async def legacy_list_products(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
                               name: str | None = None, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    stmt = select(Product)
    if name and name.strip():
        stmt = stmt.where(Product.name.icontains(name.strip(), autoescape=True))
    rows = await db.scalars(stmt.order_by(Product.id).offset(skip).limit(limit))
    return [await product_output(db, row) for row in rows]


@router.post("", response_model=ProductOut, status_code=201, dependencies=mutation_checks)
async def create_product(payload: ProductCreate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return await product_output(db, product)


# Register legacy static paths before the /{product_id} detail route.
@router.post("/variants", response_model=VariantOut, status_code=201, dependencies=mutation_checks)
async def create_variant(payload: VariantCreate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    product = await product_or_404(db, payload.product_id)
    check_variant_price(product, payload.price_adjust_minor)
    variant = ProductVariant(**payload.model_dump())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


@router.get("/variants/{variant_id}", response_model=VariantOut)
async def get_variant(variant_id: str, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    variant = await db.get(ProductVariant, variant_id)
    if not variant or variant.deleted_at is not None:
        raise HTTPException(404, "Variant not found")
    return variant


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    return await product_output(db, await product_or_404(db, product_id))


@router.patch("/{product_id}", response_model=ProductOut, dependencies=mutation_checks)
async def update_product(product_id: str, payload: ProductUpdate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    product = await product_or_404(db, product_id)
    validated = merged_input(ProductCreate, product, payload)
    if 'sales_price_minor' in payload.model_fields_set:
        variants = await db.scalars(select(ProductVariant).where(ProductVariant.product_id == product_id, ProductVariant.deleted_at.is_(None)))
        for variant in variants:
            check_variant_price(validated, variant.price_delta_minor)
    for field in payload.model_fields_set:
        setattr(product, field, getattr(validated, field))
    await db.commit()
    await db.refresh(product)
    return await product_output(db, product)


@router.get("/{product_id}/variants", response_model=list[NestedVariantOut])
async def list_variants(product_id: str, user=Depends(read_access), db: AsyncSession = Depends(get_db)):
    await product_or_404(db, product_id)
    return (await db.scalars(select(ProductVariant).where(ProductVariant.product_id == product_id,
        ProductVariant.deleted_at.is_(None)).order_by(ProductVariant.created_at, ProductVariant.id))).all()


@router.post("/{product_id}/variants", response_model=NestedVariantOut, status_code=201, dependencies=mutation_checks)
async def create_nested_variant(product_id: str, payload: NestedVariantCreate, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    product = await product_or_404(db, product_id)
    check_variant_price(product, payload.price_delta_minor)
    variant = ProductVariant(product_id=product_id, **payload.model_dump())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


@router.patch("/{product_id}/variants/{variant_id}", response_model=NestedVariantOut, dependencies=mutation_checks)
async def update_variant(product_id: str, variant_id: str, payload: VariantUpdate,
                         user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    product = await product_or_404(db, product_id)
    variant = await variant_or_404(db, product_id, variant_id)
    validated = merged_input(NestedVariantCreate, variant, payload)
    check_variant_price(product, validated.price_delta_minor)
    for field in payload.model_fields_set:
        setattr(variant, field, getattr(validated, field))
    await db.commit()
    await db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}", status_code=204, dependencies=mutation_checks)
async def delete_variant(product_id: str, variant_id: str, user=Depends(write_access), db: AsyncSession = Depends(get_db)):
    variant = await variant_or_404(db, product_id, variant_id)
    # Keep historical IDs and price data for references; omit tombstones from catalog reads.
    variant.active = False
    variant.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return Response(status_code=204)
