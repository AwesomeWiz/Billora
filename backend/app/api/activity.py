from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_csrf, verify_origin
from app.api.billing_reads import get_db
from app.core.permissions import require_role
from app.models.activity import ActivityEvent, UserNotification
from app.models.account import Role
from app.models.customer import Customer
from app.models.subscription import Subscription
from app.models.user import User

router = APIRouter(tags=["Activity and notifications"])
internal_access = require_role("ADMIN", "STAFF")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]


@router.get("/events")
async def list_events(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    stmt = select(ActivityEvent)
    if current["account"].role == Role.CUSTOMER:
        stmt = stmt.where(ActivityEvent.account_id == current["account"].id)
    elif current["account"].role not in (Role.ADMIN, Role.STAFF):
        raise HTTPException(403, "Insufficient permissions")
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.scalars(stmt.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id)
                            .offset((page - 1) * page_size).limit(page_size))).all()
    return {
        "items": [{
            "id": row.id, "event_type": row.event_type, "entity_type": row.entity_type,
            "entity_id": row.entity_id, "actor_id": row.actor_id, "actor_kind": row.actor_kind,
            "account_id": row.account_id, "summary": row.summary,
            "created_at": row.created_at.isoformat(),
        } for row in rows],
        "total": total, "page": page, "page_size": page_size,
        "has_next": page * page_size < total,
    }


@router.get("/notifications")
async def list_notifications(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    category: str | None = None, unread_only: bool = False,
    current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    stmt = select(UserNotification).where(UserNotification.user_id == current["user"].id)
    if category:
        stmt = stmt.where(UserNotification.category == category)
    if unread_only:
        stmt = stmt.where(UserNotification.is_read.is_(False))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    unread_count = await db.scalar(select(func.count()).select_from(UserNotification).where(
        UserNotification.user_id == current["user"].id, UserNotification.is_read.is_(False)
    )) or 0
    rows = (await db.scalars(stmt.order_by(UserNotification.created_at.desc(), UserNotification.id)
                            .offset((page - 1) * page_size).limit(page_size))).all()
    return {
        "items": [{
            "id": row.id, "created_at": row.created_at.isoformat(), "category": row.category,
            "title": row.title, "message": row.message, "is_read": row.is_read,
            "read_at": row.read_at.isoformat() if row.read_at else None,
            "entity_type": row.entity_type, "entity_id": row.entity_id,
        } for row in rows],
        "total": total, "unread_count": unread_count, "page": page, "page_size": page_size,
        "has_next": page * page_size < total,
    }


@router.post("/notifications/{notification_id}/read", dependencies=mutation_checks)
async def mark_notification_read(
    notification_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(select(UserNotification).where(
        UserNotification.id == notification_id, UserNotification.user_id == current["user"].id
    ))
    if row is None:
        raise HTTPException(404, "Notification not found")
    row.is_read = True
    row.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"detail": "Notification marked as read"}


@router.post("/notifications/read-all", dependencies=mutation_checks)
async def mark_all_notifications_read(current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(UserNotification).where(
        UserNotification.user_id == current["user"].id, UserNotification.is_read.is_(False)
    ))).all()
    now = datetime.now(timezone.utc)
    for row in rows:
        row.is_read = True
        row.read_at = now
    await db.commit()
    return {"updated": len(rows)}


@router.post("/notifications/renewals/run", dependencies=mutation_checks)
async def run_renewal_notifications(
    current=Depends(internal_access), db: AsyncSession = Depends(get_db),
):
    business_tz = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(business_tz).date()
    targets = {today + timedelta(days=days): days for days in (1, 3, 7)}
    rows = (await db.execute(
        select(Subscription, Customer)
        .join(Customer, Subscription.customer_id == Customer.id)
        .where(Subscription.status == "ACTIVE", Subscription.end_date.is_not(None))
    )).all()
    created = 0
    for subscription, customer in rows:
        if subscription.end_date.date() not in targets:
            continue
        days = targets[subscription.end_date.date()]
        users = (await db.scalars(select(User).where(User.account_id == customer.account_id))).all()
        for user in users:
            key = f"SUBSCRIPTION_ENDING:{subscription.id}:{days}"
            exists = await db.scalar(select(UserNotification.id).where(
                UserNotification.user_id == user.id, UserNotification.dedupe_key == key
            ))
            if exists:
                continue
            db.add(UserNotification(
                user_id=user.id, dedupe_key=key, category="SUBSCRIPTION",
                title="Subscription ending soon",
                message=f"Your subscription is scheduled to end in {days} day(s).",
                entity_type="subscription", entity_id=subscription.id,
            ))
            created += 1
    await db.commit()
    return {"created": created, "delivery_state": "PREVIEW_ONLY"}
