# backend/app/models/invoice.py
import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Boolean, func
from sqlalchemy.orm import relationship
from ..core.db import Base
from .subscription import Subscription

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=False)
    paid = Column(Boolean, default=False)

    subscription = relationship("Subscription", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")
