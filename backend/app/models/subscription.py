# backend/app/models/subscription.py
import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, func
from sqlalchemy.orm import relationship
from ..core.db import Base
from .plan import Plan
from .customer import Customer

class SubscriptionStatus(str):
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default=SubscriptionStatus.ACTIVE)

    customer = relationship("Customer", back_populates="subscriptions")
    plan = relationship("Plan")
    invoices = relationship("Invoice", back_populates="subscription")
