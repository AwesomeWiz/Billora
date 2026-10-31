from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    invoice_id: str
    amount_minor: int = Field(gt=0)
    method: str = Field(min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=1000)


class PaymentDto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    amount_minor: int
    method: str
    note: str | None
    recorded_by: str
    recorded_at: datetime
