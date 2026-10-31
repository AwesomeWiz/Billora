# backend/app/models/product_variant.py
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean, DateTime, func
from sqlalchemy.orm import synonym
from ..core.db import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Odoo"
    price_adjust_minor = Column(Integer, nullable=False)  # +₹560 => 56000
    notes = Column(Text, nullable=True)
    # Reuse legacy storage so existing integrations see the same price/name.
    attribute_value = synonym("name")
    price_delta_minor = synonym("price_adjust_minor")
    attribute_name = Column(String, nullable=False, default="variant", server_default="variant")
    active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, default=func.now(), server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)
