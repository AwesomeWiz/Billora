import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, func
from ..core.db import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    base_fee_minor = Column(Integer, nullable=False, default=0)
    currency = Column(String, nullable=False, default="INR")
    bill_plan_base_fee = Column(Boolean, nullable=False, default=False)
    billing_interval = Column(String, nullable=False, default="MONTHLY", index=True)
    min_quantity = Column(Integer, nullable=False, default=1)
    available_from = Column(Date, nullable=False)
    available_to = Column(Date, nullable=True)
    auto_close = Column(Boolean, nullable=False, default=True)
    can_pause = Column(Boolean, nullable=False, default=True)
    can_renew = Column(Boolean, nullable=False, default=True)
    can_close_early = Column(Boolean, nullable=False, default=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now(), server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), server_default=func.now(), onupdate=func.now())
