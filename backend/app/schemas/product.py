
# backend/app/schemas/product.py

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class ProductBase(BaseModel):
    name: str
    type: str
    sales_price_minor: int = Field(..., gt=0)
    cost_price_minor: int = Field(..., gt=0)
    currency: str = "INR"
    notes: Optional[str] = None
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    sales_price_minor: Optional[int] = Field(default=None, gt=0)
    cost_price_minor: Optional[int] = Field(default=None, gt=0)
    currency: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


class VariantBase(BaseModel):
    name: str
    price_adjust_minor: int = Field(..., gt=0)
    notes: Optional[str] = None
class VariantCreate(VariantBase):
    product_id: str

class VariantOut(VariantBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str



