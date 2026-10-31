from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import Session
from datetime import date
from app.core.admin_schema import initialize_admin_schema
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.plan import Plan


def test_additive_migration_preserves_legacy_records_and_is_repeatable(tmp_path):
    engine = create_engine('sqlite:///' + (tmp_path / 'legacy.db').as_posix())
    with engine.begin() as conn:
        conn.exec_driver_sql('CREATE TABLE products (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, type VARCHAR NOT NULL, sales_price_minor INTEGER NOT NULL, cost_price_minor INTEGER NOT NULL, currency VARCHAR, notes TEXT, active BOOLEAN)')
        conn.exec_driver_sql("INSERT INTO products VALUES ('old-product', 'Legacy product', 'software', 150000, 80000, 'INR', 'Preserved', 1)")
        conn.exec_driver_sql('CREATE TABLE product_variants (id VARCHAR PRIMARY KEY, product_id VARCHAR NOT NULL REFERENCES products(id), name VARCHAR NOT NULL, price_adjust_minor INTEGER NOT NULL, notes TEXT)')
        conn.exec_driver_sql("INSERT INTO product_variants VALUES ('old-variant', 'old-product', 'Odoo', 56000, 'Preserved variant')")
        conn.exec_driver_sql('CREATE TABLE plans (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL UNIQUE, base_fee_minor INTEGER NOT NULL, currency VARCHAR NOT NULL, bill_plan_base_fee BOOLEAN NOT NULL, billing_interval VARCHAR NOT NULL, min_quantity INTEGER NOT NULL, available_from DATE NOT NULL, available_to DATE, auto_close BOOLEAN NOT NULL, can_pause BOOLEAN NOT NULL, can_renew BOOLEAN NOT NULL, can_close_early BOOLEAN NOT NULL, active BOOLEAN NOT NULL)')
        conn.exec_driver_sql("INSERT INTO plans VALUES ('old-plan', 'Legacy plan', 10000, 'INR', 1, 'MONTHLY', 2, '2026-10-31', NULL, 1, 0, 1, 0, 1)")
        conn.exec_driver_sql('CREATE TABLE teammate_sentinel (id INTEGER PRIMARY KEY, value TEXT)')
        conn.exec_driver_sql("INSERT INTO teammate_sentinel VALUES (1, 'untouched')")
    for _ in range(2):
        with engine.begin() as conn:
            initialize_admin_schema(conn)
    with engine.connect() as conn:
        product = conn.execute(text("SELECT * FROM products WHERE id = 'old-product'")).mappings().one()
        variant = conn.execute(text("SELECT * FROM product_variants WHERE id = 'old-variant'")).mappings().one()
        assert product['sales_price_minor'] == 150000 and product['notes'] == 'Preserved'
        assert variant['name'] == 'Odoo' and variant['price_adjust_minor'] == 56000
        assert variant['attribute_name'] == 'variant' and variant['active'] == 1 and variant['deleted_at'] is None
        assert product['created_at'] and variant['created_at']
        assert 'discount_rules' in inspect(conn).get_table_names()
        plan = conn.execute(text("SELECT * FROM plans WHERE id = 'old-plan'")).mappings().one()
        assert plan['base_fee_minor'] == 10000 and plan['min_quantity'] == 2 and plan['can_pause'] == 0
        assert conn.exec_driver_sql('SELECT value FROM teammate_sentinel').scalar() == 'untouched'
        assert conn.exec_driver_sql('PRAGMA integrity_check').scalar() == 'ok'
    # Added SQLite columns cannot use CURRENT_TIMESTAMP as ALTER defaults.
    # Verify ORM inserts populate timestamps on a migrated database as well.
    with Session(engine) as session:
        product = Product(name='New', type='SOFTWARE', sales_price_minor=0, cost_price_minor=0)
        plan = Plan(name='New plan', available_from=date(2026, 10, 31))
        session.add_all([product, plan])
        session.flush()
        variant = ProductVariant(product_id=product.id, attribute_name='size', attribute_value='New', price_delta_minor=0)
        session.add(variant)
        session.commit()
        assert product.created_at and product.updated_at and plan.created_at and variant.created_at
    engine.dispose()
