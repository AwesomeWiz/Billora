from sqlalchemy import Boolean, Column, Integer, String

from app.core.db import Base


class GstSettings(Base):
    __tablename__ = "gst_settings"

    id = Column(Integer, primary_key=True, default=1)
    gstin = Column(String(15), nullable=True)
    legal_business_name = Column(String(200), nullable=True)
    registered_state_code = Column(String(2), nullable=True)
    composition_scheme = Column(Boolean, nullable=False, default=False)
    e_invoicing_enabled = Column(Boolean, nullable=False, default=False)
    reverse_charge_applicable = Column(Boolean, nullable=False, default=False)
