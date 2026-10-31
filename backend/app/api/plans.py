# backend/app/api/plans.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..core.db import AsyncSessionLocal
from ..core.permissions import require_role
from ..models.plan import Plan
from ..schemas.plan import PlanCreate, PlanUpdate, PlanOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/plans", tags=["Plans"])

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        yield db

@router.post("/", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(user, "ADMIN", "STAFF")
    plan = Plan(**payload.dict())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return PlanOut.from_orm(plan)

@router.get("/", response_model=List[PlanOut])
async def list_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Plan).offset(skip).limit(limit)
    result = await db.execute(stmt)
    plans = result.scalars().all()
    return [PlanOut.from_orm(p) for p in plans]

@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanOut.from_orm(plan)

@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: str,
    payload: PlanUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(user, "ADMIN", "STAFF")
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.commit()
    await db.refresh(plan)
    return PlanOut.from_orm(plan)
