import pytest

from app.models.account import Role


@pytest.mark.asyncio
async def test_product_csv_import_is_staged_validated_and_persisted(clients):
    admin = clients[Role.ADMIN.value]
    boundary = "billora-boundary"
    csv_content = "name,type,sales_price_minor,cost_price_minor,currency\nImported Widget,service,12500,3000,INR\n"
    parts = [
        (f"--{boundary}\r\nContent-Disposition: form-data; name=\"entity_type\"\r\n\r\nproducts\r\n").encode(),
        (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"products.csv\"\r\n"
            "Content-Type: text/csv\r\n\r\n"
        ).encode(),
        csv_content.encode(),
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    preview = await admin.post(
        "/api/imports/preview",
        content=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    assert preview.status_code == 200, preview.text
    import_id = preview.json()["import_id"]
    mappings = [
        {"csv_header": field, "target_field": field}
        for field in ("name", "type", "sales_price_minor", "cost_price_minor", "currency")
    ]
    validated = await admin.post(
        "/api/imports/validate", json={"import_id": import_id, "mappings": mappings}
    )
    assert validated.status_code == 200, validated.text
    assert validated.json()["valid_rows_count"] == 1
    executed = await admin.post(
        "/api/imports", json={"import_id": import_id, "mappings": mappings}
    )
    assert executed.status_code == 200, executed.text
    assert executed.json()["records_created"] == 1
    assert (await admin.post(
        "/api/imports", json={"import_id": import_id, "mappings": mappings}
    )).status_code == 409
