from datetime import date
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class AccountDto(BaseModel):
    id: str
    display_name: str
    billing_email: str
    billing_address: str | None = None
    currency: str = "INR"


class RecordPage(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class SubscriptionDto(BaseModel):
    id: str
    number: str
    account_id: str
    plan_id: str
    status: Literal["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"]
    currency: str
    billing_interval: str | None = None
    recurring_amount_minor: int | None = None
    start_date: date | None = None
    expiry_date: date | None = None
    next_billing_date: date | None = None


class InvoiceAccountDto(BaseModel):
    id: str
    display_name: str
    billing_email: str


class InvoiceDto(BaseModel):
    id: str
    number: str
    billing_account_id: str
    issued_on: date
    due_on: date
    status: Literal["DRAFT", "CONFIRMED", "PAID", "CANCELLED"]
    currency: str
    total_minor: int
    paid_minor: int
    balance_minor: int
    payment_status: Literal["UNPAID", "PARTIALLY_PAID", "PAID"]
    billing_account: InvoiceAccountDto


class DashboardDto(BaseModel):
    active_subscription_count: int
    next_renewal_date: date | None
    outstanding_balance_minor: int
    currency: str
    recent_invoices: list[InvoiceDto]
