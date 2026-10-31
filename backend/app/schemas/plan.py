from datetime import date, datetime
from typing import Literal, Optional
from pydantic import ConfigDict, Field, model_validator
from .admin_common import AdminInput, Minor, Name, Currency, Page

BillingInterval = Literal["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]


class PlanBase(AdminInput):
    name: Name
    base_fee_minor: Minor = 0
    currency: Currency = "INR"
    bill_plan_base_fee: bool = False
    billing_interval: BillingInterval = "MONTHLY"
    min_quantity: int = Field(default=1, ge=1, le=9007199254740991, strict=True)
    available_from: date
    available_to: Optional[date] = None
    auto_close: bool = True
    can_pause: bool = True
    can_renew: bool = True
    can_close_early: bool = True
    active: bool = True

    @model_validator(mode="after")
    def validate_availability(self):
        if self.available_to is not None and self.available_to < self.available_from:
            raise ValueError("available_to must be on or after available_from")
        return self


class PlanCreate(PlanBase):
    pass


class PlanUpdate(AdminInput):
    name: Name | None = None
    base_fee_minor: Minor | None = None
    currency: Currency | None = None
    bill_plan_base_fee: Optional[bool] = None
    billing_interval: Optional[BillingInterval] = None
    min_quantity: Optional[int] = Field(default=None, ge=1, le=9007199254740991, strict=True)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close: Optional[bool] = None
    can_pause: Optional[bool] = None
    can_renew: Optional[bool] = None
    can_close_early: Optional[bool] = None
    active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_availability(self):
        start = self.available_from
        end = self.available_to
        if start is not None and end is not None and end < start:
            raise ValueError("available_to must be on or after available_from")
        return self


class PlanOut(PlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


PlanPage = Page[PlanOut]
