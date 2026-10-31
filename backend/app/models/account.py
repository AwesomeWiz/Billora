# backend/app/models/account.py
import uuid
from sqlalchemy import Column, String, Enum, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from ..core.db import Base
from enum import Enum as PyEnum

class Role(str, PyEnum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    CUSTOMER = "CUSTOMER"

class Account(Base):
    __tablename__ = "accounts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(Enum(Role), nullable=False, default=Role.CUSTOMER)
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="account")
    customer = relationship("Customer", back_populates="account", uselist=False)
