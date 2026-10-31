import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, func

from app.core.db import Base


class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    validity_days = Column(Integer, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    variant_id = Column(String, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price_minor = Column(Integer, nullable=True)
    tax_rule_id = Column(String, nullable=True)


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    number = Column(String, nullable=False, unique=True, index=True)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=False, unique=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    template_id = Column(String, ForeignKey("quotation_templates.id"), nullable=True)
    issued_on = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="ISSUED")
    terms = Column(Text, nullable=True)
    subtotal_minor = Column(Integer, nullable=False)
    tax_minor = Column(Integer, nullable=False)
    total_minor = Column(Integer, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    source_product_id = Column(String, nullable=False)
    variant_id = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    variant_name = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price_minor = Column(Integer, nullable=False)
    tax_rule_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    subtotal_minor = Column(Integer, nullable=False)
