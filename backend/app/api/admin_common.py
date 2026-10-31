from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import func, select


def merged_input(schema, instance, patch):
    """Validate all cross-field rules after applying a partial update."""
    changes = patch.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(400, "No fields provided to update")
    values = {name: getattr(instance, name) for name in schema.model_fields}
    try:
        return schema.model_validate({**values, **changes})
    except ValidationError as exc:
        raise RequestValidationError([
            {**error, "loc": ("body", *error["loc"])} for error in exc.errors()
        ]) from exc


async def page_rows(db, stmt, page, page_size):
    total = await db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = (await db.scalars(stmt.offset((page - 1) * page_size).limit(page_size))).all()
    return rows, {"total": total, "page": page, "page_size": page_size,
                  "has_next": page * page_size < total}
