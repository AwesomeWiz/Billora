import uuid
from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String, func
from app.core.db import Base


class Discount(Base):
    __tablename__ = "discount_rules"
    __table_args__ = (
        CheckConstraint("(kind = 'FIXED' AND value_minor >= 0 AND value_minor IS NOT NULL AND percent_bps IS NULL) OR (kind = 'PERCENT' AND percent_bps BETWEEN 0 AND 10000 AND percent_bps IS NOT NULL AND value_minor IS NULL)"),
        CheckConstraint("(scope = 'PRODUCT' AND product_id IS NOT NULL) OR (scope = 'SUBSCRIPTION' AND product_id IS NULL)"),
        CheckConstraint("uses_count >= 0"),
        CheckConstraint("max_uses IS NULL OR max_uses >= uses_count"),
        CheckConstraint("min_quantity IS NULL OR min_quantity >= 0"),
        CheckConstraint("min_purchase_minor IS NULL OR min_purchase_minor >= 0"),
        CheckConstraint("starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on"),
    )
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    kind = Column(String, nullable=False)
    value_minor = Column(Integer)
    percent_bps = Column(Integer)
    min_quantity = Column(Integer)
    min_purchase_minor = Column(Integer)
    starts_on = Column(Date)
    ends_on = Column(Date)
    max_uses = Column(Integer)
    uses_count = Column(Integer, nullable=False, default=0, server_default="0")
    scope = Column(String, nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="RESTRICT"))
    priority = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
