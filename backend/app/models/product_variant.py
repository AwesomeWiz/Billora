# backend/app/models/product_variant.py
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from ..core.db import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Odoo"
    price_adjust_minor = Column(Integer, nullable=False)  # +₹560 => 56000
    notes = Column(Text, nullable=True)
