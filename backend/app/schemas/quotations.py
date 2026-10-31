from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class QuotationLineInput(BaseModel):
    source_product_id: str
    variant_id: str | None = None
    quantity: int = Field(ge=1)
    unit_price_minor: int = Field(ge=0)
    tax_rule_id: str | None = None
    description: str | None = None


class CreateQuotation(BaseModel):
    account_id: str
    template_id: str | None = None
    plan_id: str | None = None
    validity_days: int = Field(default=30, ge=1, le=365)
    terms: str | None = None
    lines: list[QuotationLineInput] = Field(min_length=1)


class TemplateLineInput(BaseModel):
    product_id: str
    variant_id: str | None = None
    quantity: int = Field(ge=1)
    unit_price_minor: int | None = Field(default=None, ge=0)
    tax_rule_id: str | None = None


class CreateQuotationTemplate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    plan_id: str
    validity_days: int = Field(ge=1, le=365)
    active: bool = True
    lines: list[TemplateLineInput] = Field(min_length=1)


class QuotationLineDto(BaseModel):
    id: str
    quotation_id: str
    source_product_id: str
    product_name: str
    variant_id: str | None
    variant_name: str | None
    quantity: int
    unit_price_minor: int
    tax_rule_id: str | None
    description: str | None
    subtotal_minor: int


class QuotationSubscriptionDto(BaseModel):
    id: str
    code: str
    status: str
    plan_id: str
    plan_name: str
    account_id: str


class QuotationDto(BaseModel):
    id: str
    number: str
    subscription_id: str
    account_id: str
    customer_name: str
    customer_email: str
    template_id: str | None
    template_name: str | None
    issued_on: date
    valid_until: date
    status: Literal["ISSUED", "ACCEPTED", "EXPIRED", "CANCELLED"]
    terms: str | None
    subtotal_minor: int
    tax_minor: int
    total_minor: int
    created_by: str
    created_at: str | None
    lines: list[QuotationLineDto]
    subscription: QuotationSubscriptionDto


class TemplateLineDto(BaseModel):
    id: str
    template_id: str
    product_id: str
    product_name: str
    variant_id: str | None
    variant_name: str | None
    quantity: int
    unit_price_minor: int | None
    tax_rule_id: str | None


class QuotationTemplateDto(BaseModel):
    id: str
    name: str
    plan_id: str
    plan_name: str
    validity_days: int
    active: bool
    created_by: str
    created_at: str | None
    lines: list[TemplateLineDto]


class QuotationPage(BaseModel):
    items: list[QuotationDto]
    total: int
    page: int
    page_size: int
    has_next: bool


class TemplatePage(BaseModel):
    items: list[QuotationTemplateDto]
    total: int
    page: int
    page_size: int
    has_next: bool
