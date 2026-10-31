"""Shared validation primitives for the assigned admin catalog APIs."""
from typing import Annotated, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

MAX_SAFE_INTEGER = 9_007_199_254_740_991
Minor = Annotated[int, Field(strict=True, ge=0, le=MAX_SAFE_INTEGER)]
SignedMinor = Annotated[int, Field(strict=True, ge=-MAX_SAFE_INTEGER, le=MAX_SAFE_INTEGER)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Currency = Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]


class AdminInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
