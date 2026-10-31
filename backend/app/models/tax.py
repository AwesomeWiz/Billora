import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String, func

from app.core.db import Base


class TaxRule(Base):
    __tablename__ = "tax_rules"
    __table_args__ = (
        CheckConstraint("rate_bps >= 0 AND rate_bps <= 10000"),
        CheckConstraint("(scope = 'GLOBAL' AND product_id IS NULL) OR (scope = 'PRODUCT' AND product_id IS NOT NULL)"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    rate_bps = Column(Integer, nullable=False)
    scope = Column(String, nullable=False, default="GLOBAL")
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
