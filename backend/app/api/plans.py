# backend/app/api/plans.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from ..core.db import AsyncSessionLocal
from ..core.permissions import require_role
from ..models.plan import Plan
from ..schemas.plan import PlanCreate, PlanUpdate, PlanOut, PlanPage, BillingInterval
from app.api.auth import verify_csrf, verify_origin
from app.api.admin_common import merged_input, page_rows

router = APIRouter(prefix="/plans", tags=["Plans"])

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        yield db


async def save_plan(db, plan):
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "A plan with this name already exists or conflicts with current data") from exc
    await db.refresh(plan)
    return PlanOut.model_validate(plan)


@router.get("", response_model=PlanPage)
async def paginated_plans(
    search: str | None = None, billing_interval: BillingInterval | None = None,
    active: bool | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Plan)
    if search and search.strip():
        stmt = stmt.where(Plan.name.icontains(search.strip(), autoescape=True))
    if billing_interval:
        stmt = stmt.where(Plan.billing_interval == billing_interval)
    if active is not None:
        stmt = stmt.where(Plan.active == active)
    rows, meta = await page_rows(db, stmt.order_by(Plan.created_at, Plan.id), page, page_size)
    return {"items": [PlanOut.model_validate(row) for row in rows], **meta}

@router.post(
    "",
    response_model=PlanOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)],
)
@router.post(
    "/",
    response_model=PlanOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)],
    include_in_schema=False,
)
async def create_plan(
    payload: PlanCreate,
    user=Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    plan = Plan(**payload.model_dump())
    db.add(plan)
    return await save_plan(db, plan)

@router.get("/", response_model=List[PlanOut], include_in_schema=False)
async def list_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Plan).order_by(Plan.id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    plans = result.scalars().all()
    return [PlanOut.model_validate(p) for p in plans]

@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanOut.model_validate(plan)

@router.patch(
    "/{plan_id}",
    response_model=PlanOut,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)],
)
async def update_plan(
    plan_id: str,
    payload: PlanUpdate,
    user=Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    validated = merged_input(PlanCreate, plan, payload)
    for field in payload.model_fields_set:
        setattr(plan, field, getattr(validated, field))
    return await save_plan(db, plan)
