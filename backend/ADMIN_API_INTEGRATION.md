# Assigned admin backend completion

Scope: Discounts, Products/Variants, Plans contract alignment. Based on main `6e3a450`; teammate auth, customer profile, subscription, invoice, payment, tax and quotation logic is preserved. No frontend module was changed.

## Routes and permissions

| Resource | Methods and paths | Read | Write |
| --- | --- | --- | --- |
| Discounts | GET/POST `/api/discounts`; GET/PATCH `/api/discounts/{discount_id}` | ADMIN/STAFF | ADMIN |
| Products | GET/POST `/api/products`; GET/PATCH `/api/products/{product_id}` | ADMIN/STAFF | ADMIN |
| Variants | GET/POST `/api/products/{product_id}/variants`; PATCH/DELETE `/api/products/{product_id}/variants/{variant_id}` | ADMIN/STAFF | ADMIN |
| Legacy variants | POST `/api/products/variants`; GET `/api/products/variants/{variant_id}` | ADMIN/STAFF | ADMIN |
| Plans | GET/POST `/api/plans`; GET/PATCH `/api/plans/{plan_id}` | Public catalog, preserving the latest Plans dependency note | ADMIN |

All writes use the existing cookie-session role dependency plus `verify_csrf` and `verify_origin`. Only the existing trusted `http://localhost:5173` Origin is accepted; no alternative token/role mechanism was introduced. Missing header returns 422, invalid/missing CSRF cookie or untrusted/missing Origin returns 403. CUSTOMER cannot read internal discounts or cost-bearing product/variant resources, and cannot mutate any assigned resource. STAFF reads remain read-only. Public Plans reads intentionally retain the already documented behavior.

Canonical collection paths work without redirect and return `{items,total,page,page_size,has_next}`. Defaults: page 1, page_size 20; max page_size 100. Search is literal, case-insensitive name matching; filters are discounts kind/scope/active, products type/active, plans billing_interval/active. Ordering includes ID for stable pagination. Legacy slash GET products/plans retain the prior array and skip/limit format for compatibility; existing slash POST Plans is retained with identical security.

## Financial and update rules

- Monetary inputs are strict integer minor units within JavaScript's safe-integer range; floats, booleans and numeric strings are rejected. Product prices and plan base fees may be zero. Discount values and usage limits are nonnegative. Discount basis points are 0..10000.
- Variant deltas are signed integers, following the actual frontend types, form and architecture. The older Products dependency note says all amounts nonnegative; that sentence conflicts with the implemented signed-variant form. Resolved base plus delta must remain nonnegative and safe. No billing calculations or invoice repricing occur here.
- PATCH validates the merged record before changing fields, including date order, discount kind/value and scope/product rules. Required fields cannot be cleared with null. Nullable dates/notes/references may be cleared as appropriate. Empty PATCH returns 400.
- Discount `uses_count`, IDs and timestamps are not writable; unknown input fields are rejected. Product references are verified. Lowering max_uses below recorded usage returns 409 and a database constraint guards the invariant. Redemption/invoice accounting remains Adithya's responsibility.
- Duplicate Plan names return 409. Existing plan policies and base-fee billing flag are retained.

## Non-destructive schema compatibility

Startup registers the Discount model via its router and retains existing teammate model imports. `initialize_admin_schema` creates missing tables and only adds catalog columns. SQLite migration takes an immediate write lock and is idempotent. No existing table is rebuilt, no IDs/prices/notes are replaced, and no application records are seeded.

Variants keep their original `name` and `price_adjust_minor` columns. ORM synonyms expose `attribute_value` and `price_delta_minor`, so old/new callers read the same data. The missing legacy attribute label becomes `variant`; admins can refine it. Added fields are attribute_name, active, created_at and deleted_at. DELETE returns 204 and tombstones the row; subsequent list/detail/update calls omit/reject it, retaining historical IDs and values for references. This is deliberate preservation, not a hard deletion.

Products and Plans gain created_at/updated_at. Old rows had no recorded timestamps; their backfill is migration time, not a claimed historical date. New ORM writes populate timestamps even on migrated SQLite tables. Tests verify old product/variant/plan values and an unrelated table survive, migration repeatability, database integrity and post-migration inserts.

The existing development database was not used for test writes. Pytest sets an isolated temporary SQLite URL before application import and verifies the engine points there before schema setup/cleanup. Test actors/records live only there and log in through the actual auth endpoints; permissions and CSRF are not overridden. The development database was open by another process, so no offline migration/backup was attempted on it. On deployment, preserve a normal SQLite backup before first startup; do not manually drop/recreate tables.

## Integration handoff

- Abiya's Products and Plans pages still expose configuration controls to STAFF in some flows; the backend now rejects product/variant writes consistently with PRD ADMIN-only configuration. Coordinate read-only controls with Abiya. Do not weaken API authorization to accommodate UI controls.
- The frontend discount form currently requires positive max_uses/min_quantity when entered; the requested backend accepts zero as nonnegative. This is a UI restriction, not a fabricated API value.
- Existing auth now returns User.id on this main baseline; its regression test passes. Earlier portal/P0 notes describing the missing ID are historical. This task does not enable customer billing endpoints or change their ownership policy.
- Tax and Quotation Template routers remain teammate-owned. Add them independently to main.py, preserving Discounts and existing router/model registration. No tax/quotation payloads or success states were invented.
- This is a feature branch; it must be reviewed/merged before main runs these APIs. No merge to main is performed.

## Validation results

- Backend: `.venv/Scripts/python.exe -m pytest -v -p no:cacheprovider --tb=short` — **42 passed**, including all existing auth/customer/security tests. The cache plugin was disabled because the pre-existing `.pytest_cache` is inaccessible; no cache permissions were changed. Five existing FastAPI/Pydantic deprecation warnings remain, plus pytest-asyncio's unset default-loop-scope advisory.
- Initial new-test execution had 18 fixture setup errors because email-validator rejects `.test` login addresses. The isolated fixture now uses `example.com`; final runs have no failures/errors. Application email validation was not weakened.
- Real application import/startup, `/api/health`, `/api/docs` and OpenAPI route methods are exercised through ASGI HTTP, without mocked routes or permission overrides. Writes are persisted in temporary SQLite and checked by subsequent reads and database assertions.
- Frontend: `npm.cmd run typecheck` passed; `npm.cmd test -- --reporter=dot` — **464 passed in 32 files**; `npm.cmd run build` passed with the existing large-bundle advisory. No frontend files or dependency manifests changed.

Changed files: `app/main.py`; `app/api/{admin_common,discounts,products,plans}.py`; `app/core/admin_schema.py`; `app/models/{discount,product,product_variant,plan}.py`; `app/schemas/{admin_common,discount,product,plan}.py`; `tests/conftest.py`; `tests/test_{discounts,products_admin,plans_admin,admin_schema,admin_integration}.py`; this integration note. All paths are relative to backend/.
