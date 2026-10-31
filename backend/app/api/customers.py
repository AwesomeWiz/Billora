from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_csrf, verify_origin
from app.core.db import AsyncSessionLocal
from app.models.account import Role
from app.models.customer import Customer
from app.schemas.account import AccountResponse, AccountUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


async def get_customer_profile(current_user: dict, db: AsyncSession) -> Customer | None:
    account = current_user["account"]
    if account.role != Role.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customer account required")
    return await db.scalar(select(Customer).where(Customer.account_id == account.id))


@router.get("/me", response_model=AccountResponse)
async def read_own_account(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    customer = await get_customer_profile(current_user, db)
    account = current_user["account"]
    return AccountResponse(
        id=account.id,
        email=account.email,
        role=account.role,
        name=customer.name if customer else None,
    )


@router.put(
    "/me",
    response_model=AccountResponse,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)],
)
async def update_own_account(
    payload: AccountUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    customer = await get_customer_profile(current_user, db)
    account = current_user["account"]
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    if customer is None:
        customer = Customer(account_id=account.id, name=name)
        db.add(customer)
    else:
        customer.name = name
    await db.commit()
    await db.refresh(customer)
    return AccountResponse(id=account.id, email=account.email, role=account.role, name=customer.name)
