# backend/app/core/clock.py

from datetime import datetime, timezone, timedelta

def utc_now() -> datetime:
    """Return the current UTC datetime (with tzinfo)."""
    return datetime.now(timezone.utc)

def india_business_date() -> datetime:
    """Return the current date in Asia/Kolkata timezone (no time part)."""
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).date()
