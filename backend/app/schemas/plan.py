from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

BillingInterval = Literal["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]


class PlanBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    base_fee_minor: int = Field(default=0, ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    bill_plan_base_fee: bool = False
    billing_interval: BillingInterval = "MONTHLY"
    min_quantity: int = Field(default=1, ge=1)
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


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    base_fee_minor: Optional[int] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    bill_plan_base_fee: Optional[bool] = None
    billing_interval: Optional[BillingInterval] = None
    min_quantity: Optional[int] = Field(default=None, ge=1)
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
