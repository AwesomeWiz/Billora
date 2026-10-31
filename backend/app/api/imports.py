import csv
import io
from email import policy
from email.parser import BytesParser
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_db, verify_csrf, verify_origin
from app.core.permissions import require_role
from app.models.import_batch import ImportBatch
from app.models.product import Product

router = APIRouter(prefix="/imports", tags=["CSV Imports"])
admin_access = require_role("ADMIN")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]
PRODUCT_FIELDS = {"name", "type", "sales_price_minor", "cost_price_minor", "currency", "notes"}


class Mapping(BaseModel):
    csv_header: str
    target_field: str


class ImportMappingInput(BaseModel):
    import_id: str
    mappings: list[Mapping]


def parse_csv(content: str):
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames or len(reader.fieldnames) > 100:
        raise HTTPException(422, "CSV must include a header row")
    if len(set(reader.fieldnames)) != len(reader.fieldnames):
        raise HTTPException(422, "CSV headers must be unique")
    rows = list(reader)
    if len(rows) > 5000:
        raise HTTPException(413, "CSV is limited to 5,000 rows")
    return list(reader.fieldnames), rows


def validate_rows(headers, rows, mappings):
    mapping = {item.csv_header: item.target_field for item in mappings}
    if len(mapping) != len(mappings) or any(header not in headers for header in mapping):
        raise HTTPException(422, "Mappings must use distinct headers from the uploaded CSV")
    targets = list(mapping.values())
    if len(set(targets)) != len(targets) or set(targets) - PRODUCT_FIELDS:
        raise HTTPException(422, "Unsupported or duplicate target field")
    if not {"name", "sales_price_minor"} <= set(targets):
        raise HTTPException(422, "Product import requires name and sales_price_minor mappings")
    errors = []
    valid = []
    seen_names = set()
    for row_number, row in enumerate(rows, start=2):
        values = {target: (row.get(source) or "").strip() for source, target in mapping.items()}
        messages = []
        if not values.get("name"):
            messages.append(("name", "Name is required"))
        currency = values.get("currency", "INR").upper() or "INR"
        if currency != "INR":
            messages.append(("currency", "Only INR catalog imports are supported"))
        else:
            values["currency"] = currency
        try:
            price = int(values.get("sales_price_minor", ""))
            if price < 0:
                raise ValueError
        except ValueError:
            messages.append(("sales_price_minor", "Must be a nonnegative integer paise amount"))
        try:
            cost = int(values.get("cost_price_minor", "0") or "0")
            if cost < 0:
                raise ValueError
        except ValueError:
            messages.append(("cost_price_minor", "Must be a nonnegative integer paise amount"))
        key = values.get("name", "").casefold()
        if key and key in seen_names:
            messages.append(("name", "Duplicate product name in this file"))
        if key:
            seen_names.add(key)
        if messages:
            errors.extend({
                "row_number": row_number, "field": field, "message": message, "raw_data": row
            } for field, message in messages)
        else:
            values["sales_price_minor"] = price
            values["cost_price_minor"] = cost
            valid.append(values)
    return valid, errors


@router.post("/preview", dependencies=mutation_checks)
async def preview(request: Request, current=Depends(admin_access), db: AsyncSession = Depends(get_db)):
    body = await request.body()
    if len(body) > 2_000_000:
        raise HTTPException(413, "CSV upload is limited to 2 MB")
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("multipart/form-data"):
        raise HTTPException(415, "Expected multipart/form-data")
    message = BytesParser(policy=policy.default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + body
    )
    parts = {part.get_param("name", header="content-disposition"): part for part in message.iter_parts()}
    entity_part = parts.get("entity_type")
    file_part = parts.get("file")
    entity_type = entity_part.get_content().strip() if entity_part else None
    if entity_type != "products":
        raise HTTPException(422, "Only product CSV imports are supported; customer and subscription imports need dedicated validation")
    if file_part is None or file_part.get_filename() is None:
        raise HTTPException(422, "A CSV file is required")
    try:
        content = file_part.get_content()
        if isinstance(content, bytes):
            content = content.decode("utf-8-sig")
    except (UnicodeDecodeError, LookupError) as exc:
        raise HTTPException(422, "CSV must be UTF-8 encoded") from exc
    headers, rows = parse_csv(content)
    batch = ImportBatch(entity_type="products", csv_content=content, created_by=current["user"].id)
    db.add(batch)
    await db.commit()
    return {
        "import_id": batch.id, "total_rows": len(rows), "headers": headers,
        "sample_rows": rows[:5], "detected_entity_type": "products",
        "suggested_mappings": [{"csv_header": h, "target_field": h} for h in headers if h in PRODUCT_FIELDS],
    }


async def load_batch(import_id, user, db):
    batch = await db.get(ImportBatch, import_id)
    if batch is None or batch.created_by != user["user"].id:
        raise HTTPException(404, "Import batch not found")
    if batch.status != "PREVIEW":
        raise HTTPException(409, "Import batch has already been executed")
    headers, rows = parse_csv(batch.csv_content)
    return batch, headers, rows


@router.post("/validate", dependencies=mutation_checks)
async def validate(payload: ImportMappingInput, current=Depends(admin_access), db: AsyncSession = Depends(get_db)):
    batch, headers, rows = await load_batch(payload.import_id, current, db)
    valid, errors = validate_rows(headers, rows, payload.mappings)
    return {
        "valid_rows_count": len(valid), "invalid_rows_count": len(rows) - len(valid),
        "duplicate_rows_count": sum(1 for error in errors if error["message"].startswith("Duplicate")),
        "errors": errors,
    }


@router.post("", dependencies=mutation_checks)
async def execute(payload: ImportMappingInput, current=Depends(admin_access), db: AsyncSession = Depends(get_db)):
    batch, headers, rows = await load_batch(payload.import_id, current, db)
    valid, errors = validate_rows(headers, rows, payload.mappings)
    created = 0
    for values in valid:
        exists = await db.scalar(select(Product.id).where(Product.name == values["name"]))
        if exists:
            errors.append({
                "row_number": 0, "field": "name",
                "message": f"Product already exists: {values['name']}",
            })
            continue
        db.add(Product(
            name=values["name"], type=values.get("type") or "service",
            sales_price_minor=values["sales_price_minor"], cost_price_minor=values["cost_price_minor"],
            currency=values.get("currency") or "INR", notes=values.get("notes") or None, active=True,
        ))
        created += 1
    batch.status = "COMPLETED"
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "Product import conflicts with existing catalog data") from exc
    return {
        "import_id": batch.id, "status": "PARTIAL" if errors else "COMPLETED",
        "records_created": created, "records_skipped": len(rows) - len(valid),
        "records_failed": len(errors), "errors": errors,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
