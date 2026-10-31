from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_csrf, verify_origin
from app.api.billing_reads import get_db, page_response
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.quotation import Quotation, QuotationLine, QuotationTemplate, QuotationTemplateLine
from app.models.subscription import Subscription
from app.schemas.quotations import (
    CreateQuotation,
    CreateQuotationTemplate,
    QuotationDto,
    QuotationPage,
    QuotationTemplateDto,
    TemplatePage,
)

router = APIRouter(tags=["Quotations"])
BUSINESS_TZ = timezone(timedelta(hours=5, minutes=30))


def require_internal(current):
    if current["account"].role not in (Role.ADMIN, Role.STAFF):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def template_response(db: AsyncSession, template: QuotationTemplate):
    plan = await db.get(Plan, template.plan_id)
    rows = (await db.execute(
        select(QuotationTemplateLine, Product, ProductVariant)
        .join(Product, Product.id == QuotationTemplateLine.product_id)
        .outerjoin(ProductVariant, ProductVariant.id == QuotationTemplateLine.variant_id)
        .where(QuotationTemplateLine.template_id == template.id)
        .order_by(QuotationTemplateLine.id)
    )).all()
    return {
        "id": template.id, "name": template.name, "plan_id": template.plan_id,
        "plan_name": plan.name, "validity_days": template.validity_days,
        "active": template.active, "created_by": template.created_by,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "lines": [{
            "id": line.id, "template_id": line.template_id, "product_id": line.product_id,
            "product_name": product.name, "variant_id": line.variant_id,
            "variant_name": variant.name if variant else None, "quantity": line.quantity,
            "unit_price_minor": line.unit_price_minor, "tax_rule_id": line.tax_rule_id,
        } for line, product, variant in rows],
    }


async def quotation_response(db: AsyncSession, quotation: Quotation):
    account = await db.get(Account, quotation.account_id)
    customer = await db.scalar(select(Customer).where(Customer.account_id == quotation.account_id))
    subscription = await db.get(Subscription, quotation.subscription_id)
    plan = await db.get(Plan, subscription.plan_id)
    template = await db.get(QuotationTemplate, quotation.template_id) if quotation.template_id else None
    lines = (await db.scalars(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation.id).order_by(QuotationLine.id)
    )).all()
    status = quotation.status
    if status == "ISSUED" and quotation.valid_until < datetime.now(BUSINESS_TZ).date():
        status = "EXPIRED"
    return {
        "id": quotation.id, "number": quotation.number,
        "subscription_id": quotation.subscription_id, "account_id": quotation.account_id,
        "customer_name": customer.name if customer else account.email,
        "customer_email": account.email, "template_id": quotation.template_id,
        "template_name": template.name if template else None,
        "issued_on": quotation.issued_on, "valid_until": quotation.valid_until,
        "status": status, "terms": quotation.terms, "subtotal_minor": quotation.subtotal_minor,
        "tax_minor": quotation.tax_minor, "total_minor": quotation.total_minor,
        "created_by": quotation.created_by,
        "created_at": quotation.created_at.isoformat() if quotation.created_at else None,
        "lines": [{
            "id": line.id, "quotation_id": line.quotation_id,
            "source_product_id": line.source_product_id, "product_name": line.product_name,
            "variant_id": line.variant_id, "variant_name": line.variant_name,
            "quantity": line.quantity, "unit_price_minor": line.unit_price_minor,
            "tax_rule_id": line.tax_rule_id, "description": line.description,
            "subtotal_minor": line.subtotal_minor,
        } for line in lines],
        "subscription": {
            "id": subscription.id, "code": subscription.id, "status": subscription.status,
            "plan_id": plan.id, "plan_name": plan.name, "account_id": quotation.account_id,
        },
    }


async def authoritative_line(db: AsyncSession, line):
    if line.tax_rule_id:
        raise HTTPException(status_code=422, detail="Tax rules are not configured in this database")
    product = await db.get(Product, line.source_product_id)
    if product is None or not product.active:
        raise HTTPException(status_code=422, detail="Product is unavailable")
    variant = None
    expected_price = product.sales_price_minor
    if line.variant_id:
        variant = await db.get(ProductVariant, line.variant_id)
        if variant is None or variant.product_id != product.id or not variant.active:
            raise HTTPException(status_code=422, detail="Variant is unavailable for this product")
        expected_price += variant.price_adjust_minor
    if line.unit_price_minor != expected_price:
        raise HTTPException(status_code=422, detail="Unit price must match the current product catalog")
    return product, variant, expected_price * line.quantity


@router.get("/quotation-templates", response_model=TemplatePage)
async def list_templates(
    search: str | None = None, plan_id: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    require_internal(current)
    stmt = select(QuotationTemplate)
    if search and search.strip():
        stmt = stmt.where(QuotationTemplate.name.ilike(f"%{search.strip()}%"))
    if plan_id:
        stmt = stmt.where(QuotationTemplate.plan_id == plan_id)
    if active is not None:
        stmt = stmt.where(QuotationTemplate.active.is_(active))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    templates = (await db.scalars(stmt.order_by(QuotationTemplate.created_at.desc(), QuotationTemplate.id)
                                  .offset((page - 1) * page_size).limit(page_size))).all()
    return page_response([await template_response(db, t) for t in templates], total, page, page_size)


@router.post("/quotation-templates", response_model=QuotationTemplateDto, status_code=201,
             dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def create_template(
    payload: CreateQuotationTemplate, current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    require_internal(current)
    plan = await db.get(Plan, payload.plan_id)
    if not plan or not plan.active:
        raise HTTPException(status_code=422, detail="Active plan not found")
    template = QuotationTemplate(name=payload.name.strip(), plan_id=plan.id,
                                 validity_days=payload.validity_days, active=payload.active,
                                 created_by=current["user"].id)
    db.add(template)
    await db.flush()
    for line in payload.lines:
        if line.tax_rule_id:
            raise HTTPException(status_code=422, detail="Tax rules are not configured in this database")
        product = await db.get(Product, line.product_id)
        if product is None or not product.active:
            raise HTTPException(status_code=422, detail="Product is unavailable")
        variant = await db.get(ProductVariant, line.variant_id) if line.variant_id else None
        if line.variant_id and (variant is None or variant.product_id != product.id or not variant.active):
            raise HTTPException(status_code=422, detail="Variant is unavailable for this product")
        expected_price = product.sales_price_minor + (variant.price_adjust_minor if variant else 0)
        if line.unit_price_minor is not None and line.unit_price_minor != expected_price:
            raise HTTPException(status_code=422, detail="Unit price must match the current product catalog")
        db.add(QuotationTemplateLine(
            template_id=template.id, product_id=product.id, variant_id=variant.id if variant else None,
            quantity=line.quantity, unit_price_minor=expected_price, tax_rule_id=None,
        ))
    await db.commit()
    await db.refresh(template)
    return await template_response(db, template)


@router.get("/quotation-templates/{template_id}", response_model=QuotationTemplateDto)
async def get_template(template_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_internal(current)
    template = await db.get(QuotationTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Quotation template not found")
    return await template_response(db, template)


@router.get("/quotations", response_model=QuotationPage)
async def list_quotations(
    search: str | None = None, status: str | None = None, account_id: str | None = None,
    subscription_id: str | None = None, from_date: str | None = None, to_date: str | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    require_internal(current)
    stmt = (select(Quotation).join(Account, Account.id == Quotation.account_id)
            .outerjoin(Customer, Customer.account_id == Quotation.account_id))
    if search and search.strip():
        stmt = stmt.where(or_(Quotation.number.ilike(f"%{search.strip()}%"),
                              Customer.name.ilike(f"%{search.strip()}%"),
                              Account.email.ilike(f"%{search.strip()}%")))
    if status:
        if status not in {"ISSUED", "ACCEPTED", "EXPIRED", "CANCELLED"}:
            raise HTTPException(status_code=422, detail="Unsupported quotation status")
        if status == "EXPIRED":
            stmt = stmt.where(or_(
                Quotation.status == "EXPIRED",
                (Quotation.status == "ISSUED")
                & (Quotation.valid_until < datetime.now(BUSINESS_TZ).date()),
            ))
        elif status == "ISSUED":
            stmt = stmt.where(
                Quotation.status == "ISSUED",
                Quotation.valid_until >= datetime.now(BUSINESS_TZ).date(),
            )
        else:
            stmt = stmt.where(Quotation.status == status)
    if account_id:
        stmt = stmt.where(Quotation.account_id == account_id)
    if subscription_id:
        stmt = stmt.where(Quotation.subscription_id == subscription_id)
    if from_date:
        stmt = stmt.where(Quotation.issued_on >= from_date)
    if to_date:
        stmt = stmt.where(Quotation.issued_on <= to_date)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    quotes = (await db.scalars(stmt.order_by(Quotation.issued_on.desc(), Quotation.id)
                              .offset((page - 1) * page_size).limit(page_size))).all()
    return page_response([await quotation_response(db, q) for q in quotes], total, page, page_size)


@router.get("/quotations/{quotation_id}", response_model=QuotationDto)
async def get_quotation(quotation_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_internal(current)
    quotation = await db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return await quotation_response(db, quotation)


@router.post("/quotations", response_model=QuotationDto, status_code=201,
             dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def create_quotation(
    payload: CreateQuotation, current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    require_internal(current)
    await db.execute(text("BEGIN IMMEDIATE"))
    account = await db.get(Account, payload.account_id)
    customer = await db.scalar(select(Customer).where(Customer.account_id == payload.account_id))
    if account is None or account.role != Role.CUSTOMER or customer is None:
        raise HTTPException(status_code=404, detail="Customer account not found")
    template = await db.get(QuotationTemplate, payload.template_id) if payload.template_id else None
    if payload.template_id and (template is None or not template.active):
        raise HTTPException(status_code=422, detail="Active quotation template not found")
    plan_id = payload.plan_id or (template.plan_id if template else None)
    if plan_id is None or (template and plan_id != template.plan_id):
        raise HTTPException(status_code=422, detail="A matching plan or quotation template is required")
    plan = await db.get(Plan, plan_id)
    if plan is None or not plan.active:
        raise HTTPException(status_code=422, detail="Active plan not found")
    today = datetime.now(BUSINESS_TZ).date()
    if plan.currency != "INR" or plan.available_from > today or (
        plan.available_to is not None and plan.available_to < today
    ):
        raise HTTPException(status_code=422, detail="Plan is not currently available in INR")

    input_lines = payload.lines
    if template:
        template_lines = (await db.scalars(
            select(QuotationTemplateLine).where(QuotationTemplateLine.template_id == template.id)
        )).all()
        template_signature = sorted((l.product_id, l.variant_id, l.quantity, l.unit_price_minor) for l in template_lines)
        request_signature = sorted((l.source_product_id, l.variant_id, l.quantity, l.unit_price_minor) for l in input_lines)
        if template_signature != request_signature:
            raise HTTPException(status_code=422, detail="Quotation lines must match the selected template")

    subtotal = 0
    total_quantity = 0
    snapshots = []
    for line in input_lines:
        product, variant, line_total = await authoritative_line(db, line)
        if product.currency != "INR":
            raise HTTPException(status_code=422, detail="Only INR catalog prices are supported")
        subtotal += line_total
        total_quantity += line.quantity
        snapshots.append((line, product, variant, line_total))
    if total_quantity < plan.min_quantity:
        raise HTTPException(status_code=422, detail="Quotation does not meet the plan minimum quantity")
    valid_days = template.validity_days if template else payload.validity_days
    year = today.year
    previous_count = await db.scalar(
        select(func.count()).select_from(Quotation).where(Quotation.number.like(f"QT-{year}-%"))
    ) or 0
    quotation_number = f"QT-{year}-{previous_count + 1:04d}"
    subscription = Subscription(customer_id=customer.id, plan_id=plan.id, status="QUOTATION")
    db.add(subscription)
    await db.flush()
    quotation = Quotation(
        number=quotation_number, subscription_id=subscription.id, account_id=account.id,
        template_id=template.id if template else None, issued_on=today,
        valid_until=today + timedelta(days=valid_days), status="ISSUED",
        terms=payload.terms, subtotal_minor=subtotal, tax_minor=0, total_minor=subtotal,
        created_by=current["user"].id,
    )
    db.add(quotation)
    await db.flush()
    for line, product, variant, line_total in snapshots:
        db.add(QuotationLine(
            quotation_id=quotation.id, source_product_id=product.id, variant_id=variant.id if variant else None,
            product_name=product.name, variant_name=variant.name if variant else None,
            quantity=line.quantity, unit_price_minor=line.unit_price_minor, tax_rule_id=None,
            description=line.description, subtotal_minor=line_total,
        ))
    await db.commit()
    await db.refresh(quotation)
    return await quotation_response(db, quotation)


@router.post("/quotations/{quotation_id}/confirm", response_model=QuotationDto,
             dependencies=[Depends(verify_csrf), Depends(verify_origin)])
async def confirm_quotation(
    quotation_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    require_internal(current)
    await db.execute(text("BEGIN IMMEDIATE"))
    quotation = await db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quotation.status != "ISSUED":
        raise HTTPException(status_code=409, detail="Quotation is not awaiting confirmation")
    if quotation.valid_until < datetime.now(BUSINESS_TZ).date():
        quotation.status = "EXPIRED"
        await db.commit()
        raise HTTPException(status_code=422, detail="QUOTATION_EXPIRED")
    subscription = await db.get(Subscription, quotation.subscription_id)
    if subscription.status != "QUOTATION":
        raise HTTPException(status_code=409, detail="Linked subscription is not awaiting confirmation")
    quotation.status = "ACCEPTED"
    subscription.status = "CONFIRMED"
    await db.commit()
    return await quotation_response(db, quotation)
