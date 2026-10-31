import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func

from app.core.db import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String, nullable=False)
    csv_content = Column(Text, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String, nullable=False, default="PREVIEW")
