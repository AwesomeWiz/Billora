from pydantic import BaseModel, ConfigDict, Field

from app.models.account import Role


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: Role
    name: str | None = None


class AccountUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
