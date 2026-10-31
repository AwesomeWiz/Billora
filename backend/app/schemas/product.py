# backend/app/schemas/product.py
from pydantic import BaseModel, Field
from typing import Optional

class ProductBase(BaseModel):
    name: str
    type: str
    sales_price_minor: int = Field(..., gt=0)   # e.g. 150000 for ₹1,500
    cost_price_minor: int = Field(..., gt=0)
    currency: str = "INR"
    notes: Optional[str] = None
    active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: str

class VariantBase(BaseModel):
    name: str
    price_adjust_minor: int = Field(..., gt=0)   # e.g. 56000 for ₹560
    notes: Optional[str] = None

class VariantCreate(VariantBase):
    product_id: str

class VariantOut(VariantBase):
    id: str
    product_id: str
