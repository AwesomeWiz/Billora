import pytest
from app.core.db import AsyncSessionLocal
from app.models.discount import Discount

BASE = {"name": "Test discount", "kind": "PERCENT", "percent_bps": 1500, "scope": "SUBSCRIPTION"}


@pytest.mark.asyncio
async def test_discount_crud_and_filters(clients):
    admin = clients["ADMIN"]
    product = (await admin.post('/api/products', json={"name": "Test product", "type": "SOFTWARE", "sales_price_minor": 1000, "cost_price_minor": 500})).json()
    rule = await admin.post('/api/discounts', json={**BASE, "scope": "PRODUCT", "product_id": product["id"], "starts_on": "2026-10-31", "ends_on": "2026-11-30", "max_uses": 5})
    assert rule.status_code == 201, rule.text
    data = rule.json()
    assert data['uses_count'] == 0 and data['product_name'] == 'Test product'
    assert data['created_at'] and data['updated_at']
    assert (await clients['STAFF'].get('/api/discounts/' + data['id'])).json() == data
    result = (await admin.get('/api/discounts?search=TEST&kind=PERCENT&scope=PRODUCT&active=true&page_size=1')).json()
    assert result['total'] == 1 and result['items'][0]['id'] == data['id'] and result['has_next'] is False
    patched = await admin.patch('/api/discounts/' + data['id'], json={"active": False, "priority": 4})
    assert patched.status_code == 200 and patched.json()['active'] is False
    assert (await admin.get('/api/discounts?active=true')).json()['total'] == 0
    assert (await admin.get('/api/discounts/missing')).status_code == 404
    assert (await admin.patch('/api/discounts/missing', json={"active": False})).status_code == 404


@pytest.mark.asyncio
async def test_discount_pagination_and_usage_preservation(clients):
    admin = clients['ADMIN']
    ids = []
    for i in range(3):
        response = await admin.post('/api/discounts', json={**BASE, 'name': f'Page {i}'})
        ids.append(response.json()['id'])
    first = (await admin.get('/api/discounts?page_size=2')).json()
    second = (await admin.get('/api/discounts?page_size=2&page=2')).json()
    assert first['total'] == second['total'] == 3
    assert first['has_next'] and not second['has_next']
    assert {x['id'] for x in first['items'] + second['items']} == set(ids)
    async with AsyncSessionLocal() as db:
        rule = await db.get(Discount, ids[0])
        rule.uses_count = 2
        await db.commit()
    assert (await admin.patch('/api/discounts/' + ids[0], json={'max_uses': 1})).status_code == 409
    updated = await admin.patch('/api/discounts/' + ids[0], json={'name': 'Changed'})
    assert updated.json()['uses_count'] == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('patch', [
    {'kind': 'FIXED'}, {'value_minor': 1}, {'percent_bps': 10001}, {'percent_bps': -1},
    {'percent_bps': 1.5}, {'percent_bps': True}, {'percent_bps': '100'},
    {'uses_count': 1}, {'min_quantity': -1}, {'max_uses': -1}, {'name': '  '},
    {'scope': 'PRODUCT'}, {'product_id': 'no-product'},
    {'starts_on': '2026-12-01', 'ends_on': '2026-11-01'},
])
async def test_discount_invalid_create(clients, patch):
    assert (await clients['ADMIN'].post('/api/discounts', json={**BASE, **patch})).status_code == 422


@pytest.mark.asyncio
async def test_discount_merged_patch_validation_and_nulls(clients):
    admin = clients['ADMIN']
    rule = (await admin.post('/api/discounts', json={**BASE, 'starts_on': '2026-10-31', 'ends_on': '2026-12-01'})).json()
    url = '/api/discounts/' + rule['id']
    for patch in [{'starts_on': '2027-01-01'}, {'percent_bps': None}, {'name': None}, {'kind': 'FIXED'}, {'uses_count': 0}]:
        assert (await admin.patch(url, json=patch)).status_code == 422
    assert (await admin.patch(url, json={})).status_code == 400
    updated = await admin.patch(url, json={'kind': 'FIXED', 'percent_bps': None, 'value_minor': 0, 'ends_on': None})
    assert updated.status_code == 200, updated.text
    assert updated.json()['value_minor'] == 0 and updated.json()['ends_on'] is None


@pytest.mark.asyncio
async def test_discount_authorization_and_csrf_origin(clients):
    admin = clients['ADMIN']
    rule = (await admin.post('/api/discounts', json=BASE)).json()
    url = '/api/discounts/' + rule['id']
    for role in ['STAFF', 'CUSTOMER']:
        assert (await clients[role].post('/api/discounts', json=BASE)).status_code == 403
        assert (await clients[role].patch(url, json={'active': False})).status_code == 403
    for role, code in [('CUSTOMER', 403), ('ANONYMOUS', 401)]:
        assert (await clients[role].get('/api/discounts')).status_code == code
        assert (await clients[role].get(url)).status_code == code
    for headers in [{'X-CSRF-Token': ''}, {'X-CSRF-Token': 'wrong'}, {'Origin': ''}, {'Origin': 'https://evil.invalid'}]:
        assert (await admin.post('/api/discounts', json=BASE, headers=headers)).status_code == 403
        assert (await admin.patch(url, json={'active': False}, headers=headers)).status_code == 403
    del admin.headers['X-CSRF-Token']
    assert (await admin.post('/api/discounts', json=BASE)).status_code == 422
    assert (await admin.patch(url, json={'active': False})).status_code == 422


@pytest.mark.asyncio
async def test_discount_reference_switch_and_validation_boundaries(clients):
    admin = clients['ADMIN']
    product = (await admin.post('/api/products', json={'name': 'Referenced', 'type': 'SOFTWARE', 'sales_price_minor': 0, 'cost_price_minor': 0})).json()
    response = await admin.post('/api/discounts', json={'name': 'Fixed', 'kind': 'FIXED', 'value_minor': 0, 'scope': 'PRODUCT', 'product_id': product['id'], 'max_uses': 0, 'starts_on': '2026-10-31T10:30:00Z'})
    assert response.status_code == 201, response.text
    url = '/api/discounts/' + response.json()['id']
    assert response.json()['starts_on'] == '2026-10-31'
    assert (await admin.patch(url, json={'scope': 'SUBSCRIPTION'})).status_code == 422
    assert (await admin.patch(url, json={'product_id': 'missing'})).status_code == 422
    moved = await admin.patch(url, json={'scope': 'SUBSCRIPTION', 'product_id': None})
    assert moved.status_code == 200 and moved.json()['product_name'] is None
    for query in ['page=0', 'page_size=101', 'kind=INVALID', 'scope=INVALID']:
        assert (await admin.get('/api/discounts?' + query)).status_code == 422
    for value in [-1, 0.5, True, '100', 9007199254740992]:
        assert (await admin.patch(url, json={'value_minor': value})).status_code == 422
    assert (await admin.patch(url, json={'kind': 'PERCENT', 'value_minor': None, 'percent_bps': 10000})).status_code == 200
