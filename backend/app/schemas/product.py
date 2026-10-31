from datetime import datetime
from pydantic import ConfigDict
from .admin_common import AdminInput, Name, Minor, SignedMinor, Currency, Page


class ProductBase(AdminInput):
    name: Name
    # Retain legacy type strings; new frontend uses SOFTWARE/SERVICE/HARDWARE/OTHER.
    type: Name
    sales_price_minor: Minor
    cost_price_minor: Minor
    currency: Currency = "INR"
    notes: str | None = None
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(AdminInput):
    name: Name | None = None
    type: Name | None = None
    sales_price_minor: Minor | None = None
    cost_price_minor: Minor | None = None
    currency: Currency | None = None
    notes: str | None = None
    active: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime
    variant_count: int = 0


ProductPage = Page[ProductOut]


class VariantCreate(AdminInput):
    """Legacy route input retained for existing callers."""
    product_id: str
    name: Name
    price_adjust_minor: SignedMinor
    notes: str | None = None


class NestedVariantCreate(AdminInput):
    attribute_name: Name
    attribute_value: Name
    price_delta_minor: SignedMinor
    active: bool = True


class VariantUpdate(AdminInput):
    attribute_name: Name | None = None
    attribute_value: Name | None = None
    price_delta_minor: SignedMinor | None = None
    active: bool | None = None


class NestedVariantOut(NestedVariantCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str
    created_at: datetime


class VariantOut(NestedVariantOut):
    name: str
    price_adjust_minor: int
    notes: str | None = None
