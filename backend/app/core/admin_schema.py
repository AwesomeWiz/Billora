"""Idempotent additive SQLite catalog migration; no row deletion/table rebuild.

Legacy timestamp values were never recorded. Their backfill is the migration
time, not a reconstructed creation date. Existing names/prices remain unchanged.
"""
from sqlalchemy import inspect
from app.core.db import Base


def initialize_admin_schema(connection):
    if connection.dialect.name == "sqlite":
        connection.exec_driver_sql("BEGIN IMMEDIATE")
    Base.metadata.create_all(connection)
    additions = {
        "products": {"created_at": "DATETIME", "updated_at": "DATETIME"},
        "plans": {"created_at": "DATETIME", "updated_at": "DATETIME"},
        "product_variants": {"attribute_name": "VARCHAR NOT NULL DEFAULT 'variant'",
                             "active": "BOOLEAN NOT NULL DEFAULT 1", "created_at": "DATETIME",
                             "deleted_at": "DATETIME"},
        "invoices": {"status": "VARCHAR NOT NULL DEFAULT 'CONFIRMED'"},
        "subscriptions": {"next_billing_date": "DATE"},
    }
    for table, columns in additions.items():
        present = {column["name"] for column in inspect(connection).get_columns(table)}
        for name, definition in columns.items():
            if name not in present:
                connection.exec_driver_sql(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}')
        for name in ("created_at", "updated_at"):
            if name in columns:
                connection.exec_driver_sql(f'UPDATE "{table}" SET "{name}" = CURRENT_TIMESTAMP WHERE "{name}" IS NULL')
