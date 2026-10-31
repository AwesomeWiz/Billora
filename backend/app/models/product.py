# backend/app/models/product.py
import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, func
from ..core.db import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g. "software"
    sales_price_minor = Column(Integer, nullable=False)   # price in paise
    cost_price_minor = Column(Integer, nullable=False)
    currency = Column(String, default="INR")
    notes = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)
