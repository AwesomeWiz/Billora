import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func

from app.core.db import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_payments_idempotency_key"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False, index=True)
    amount_minor = Column(Integer, nullable=False)
    method = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    recorded_by = Column(String, ForeignKey("users.id"), nullable=False)
    idempotency_key = Column(String, nullable=False)
    request_hash = Column(String, nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
