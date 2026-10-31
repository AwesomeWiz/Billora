from datetime import date, datetime
from typing import Annotated, Literal
from pydantic import ConfigDict, Field, field_validator, model_validator
from .admin_common import AdminInput, Minor, Name, Page

Kind = Literal["FIXED", "PERCENT"]
Scope = Literal["PRODUCT", "SUBSCRIPTION"]
Bps = Annotated[int, Field(strict=True, ge=0, le=10000)]
Priority = Annotated[int, Field(strict=True, ge=-2147483648, le=2147483647)]


class DiscountDates(AdminInput):
    starts_on: date | None = None
    ends_on: date | None = None

    @field_validator("starts_on", "ends_on", mode="before")
    @classmethod
    def iso_dates(cls, value):
        if isinstance(value, str) and "T" in value:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        return value


class DiscountCreate(DiscountDates):
    name: Name
    kind: Kind
    value_minor: Minor | None = None
    percent_bps: Bps | None = None
    min_quantity: Minor | None = None
    min_purchase_minor: Minor | None = None
    max_uses: Minor | None = None
    scope: Scope
    product_id: str | None = None
    priority: Priority = 0
    active: bool = True

    @model_validator(mode="after")
    def rules(self):
        if self.kind == "FIXED" and (self.value_minor is None or self.percent_bps is not None):
            raise ValueError("FIXED requires value_minor and no percent_bps")
        if self.kind == "PERCENT" and (self.percent_bps is None or self.value_minor is not None):
            raise ValueError("PERCENT requires percent_bps and no value_minor")
        if self.scope == "PRODUCT" and not self.product_id:
            raise ValueError("PRODUCT requires product_id")
        if self.scope == "SUBSCRIPTION" and self.product_id is not None:
            raise ValueError("SUBSCRIPTION cannot have product_id")
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("ends_on must be on or after starts_on")
        return self


class DiscountUpdate(DiscountDates):
    name: Name | None = None
    kind: Kind | None = None
    value_minor: Minor | None = None
    percent_bps: Bps | None = None
    min_quantity: Minor | None = None
    min_purchase_minor: Minor | None = None
    max_uses: Minor | None = None
    scope: Scope | None = None
    product_id: str | None = None
    priority: Priority | None = None
    active: bool | None = None


class DiscountOut(DiscountCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    uses_count: int
    product_name: str | None = None
    created_at: datetime
    updated_at: datetime


DiscountPage = Page[DiscountOut]
