import pytest
from app.core.db import AsyncSessionLocal
from app.models.product_variant import ProductVariant

PRODUCT = {'name': 'Helpdesk', 'type': 'SOFTWARE', 'sales_price_minor': 150000, 'cost_price_minor': 0, 'currency': 'INR'}
VARIANT = {'attribute_name': 'brand', 'attribute_value': 'Odoo', 'price_delta_minor': 56000, 'active': True}


async def create_product(client, **fields):
    response = await client.post('/api/products', json={**PRODUCT, **fields})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_product_crud_pagination_search_and_filters(clients):
    admin = clients['ADMIN']
    records = [await create_product(admin, name='A Software'), await create_product(admin, name='B Software'),
               await create_product(admin, name='C Hardware', type='HARDWARE', active=False)]
    first = (await admin.get('/api/products?page_size=2')).json()
    second = (await admin.get('/api/products?page=2&page_size=2')).json()
    assert first['total'] == second['total'] == 3
    assert first['has_next'] is True and second['has_next'] is False
    assert {x['id'] for x in first['items'] + second['items']} == {x['id'] for x in records}
    data = (await clients['STAFF'].get('/api/products?search=software&type=SOFTWARE&active=true')).json()
    assert data['total'] == 2
    assert all(x['created_at'] and x['variant_count'] == 0 for x in data['items'])
    assert (await admin.get('/api/products?search=%25')).json()['total'] == 0
    assert (await admin.get('/api/products?active=false')).json()['total'] == 1
    url = '/api/products/' + records[0]['id']
    changed = await admin.patch(url, json={'sales_price_minor': 0, 'notes': 'Updated', 'active': False})
    assert changed.status_code == 200 and changed.json()['sales_price_minor'] == 0
    assert (await admin.get(url)).json() == changed.json()
    assert (await admin.patch(url, json={'name': None})).status_code == 422
    assert (await admin.patch(url, json={})).status_code == 400
    legacy = await admin.get('/api/products/?skip=1&limit=1')
    assert legacy.status_code == 200 and len(legacy.json()) == 1


@pytest.mark.asyncio
async def test_every_variant_operation_and_ownership(clients):
    admin = clients['ADMIN']
    product = await create_product(admin)
    other = await create_product(admin, name='Other')
    base = '/api/products/' + product['id'] + '/variants'
    other_base = '/api/products/' + other['id'] + '/variants'
    assert (await admin.get(base)).json() == []
    response = await admin.post(base, json=VARIANT)
    assert response.status_code == 201, response.text
    variant = response.json()
    assert variant['product_id'] == product['id'] and variant['price_delta_minor'] == 56000
    assert variant['attribute_value'] == 'Odoo' and variant['created_at']
    assert (await clients['STAFF'].get(base)).json() == [variant]
    assert (await admin.get('/api/products/' + product['id'])).json()['variant_count'] == 1
    url = base + '/' + variant['id']
    for method in ['PATCH', 'DELETE']:
        kwargs = {'json': {'active': False}} if method == 'PATCH' else {}
        assert (await admin.request(method, other_base + '/' + variant['id'], **kwargs)).status_code == 404
    updated = await admin.patch(url, json={'price_delta_minor': -50000, 'active': False})
    assert updated.status_code == 200 and updated.json()['price_delta_minor'] == -50000
    assert (await admin.patch(url, json={'price_delta_minor': -150001})).status_code == 422
    assert (await admin.patch('/api/products/' + product['id'], json={'sales_price_minor': 1})).status_code == 422
    assert (await admin.patch(url, json={'attribute_value': None})).status_code == 422
    legacy = (await admin.get('/api/products/variants/' + variant['id'])).json()
    assert legacy['name'] == 'Odoo' and legacy['price_adjust_minor'] == -50000
    deleted = await admin.delete(url)
    assert deleted.status_code == 204 and deleted.content == b''
    assert (await admin.get(base)).json() == []
    assert (await admin.get('/api/products/variants/' + variant['id'])).status_code == 404
    assert (await admin.patch(url, json={'active': True})).status_code == 404
    assert (await admin.delete(url)).status_code == 404
    async with AsyncSessionLocal() as db:
        stored = await db.get(ProductVariant, variant['id'])
        assert stored is not None and stored.deleted_at is not None and stored.price_adjust_minor == -50000
    legacy_created = await admin.post('/api/products/variants', json={'product_id': product['id'], 'name': 'Legacy', 'price_adjust_minor': 0})
    assert legacy_created.status_code == 201 and legacy_created.json()['attribute_value'] == 'Legacy'


@pytest.mark.asyncio
@pytest.mark.parametrize('value', [-1, 1.5, True, '100', 9007199254740992])
async def test_product_strict_money(clients, value):
    for field in ['sales_price_minor', 'cost_price_minor']:
        assert (await clients['ADMIN'].post('/api/products', json={**PRODUCT, field: value})).status_code == 422


@pytest.mark.asyncio
async def test_catalog_mutation_security_every_route(clients):
    admin = clients['ADMIN']
    product = await create_product(admin)
    base = '/api/products/' + product['id']
    variant = (await admin.post(base + '/variants', json=VARIANT)).json()
    variant_url = base + '/variants/' + variant['id']
    operations = [
        ('POST', '/api/products', PRODUCT), ('PATCH', base, {'active': False}),
        ('POST', base + '/variants', VARIANT), ('PATCH', variant_url, {'active': False}),
        ('DELETE', variant_url, None), ('POST', '/api/products/variants', {'product_id': product['id'], 'name': 'Old', 'price_adjust_minor': 1}),
    ]
    for method, url, payload in operations:
        kwargs = {'json': payload} if payload is not None else {}
        for role in ['STAFF', 'CUSTOMER']:
            assert (await clients[role].request(method, url, **kwargs)).status_code == 403
        for headers in [{'X-CSRF-Token': ''}, {'X-CSRF-Token': 'wrong'}, {'Origin': ''}, {'Origin': 'https://evil.invalid'}]:
            assert (await admin.request(method, url, headers=headers, **kwargs)).status_code == 403
        token = admin.headers.pop('X-CSRF-Token')
        assert (await admin.request(method, url, **kwargs)).status_code == 422
        admin.headers['X-CSRF-Token'] = token
    for url in ['/api/products', '/api/products/', base, base + '/variants', '/api/products/variants/' + variant['id']]:
        assert (await clients['CUSTOMER'].get(url)).status_code == 403
        assert (await clients['ANONYMOUS'].get(url)).status_code == 401
        assert (await clients['STAFF'].get(url)).status_code == 200


@pytest.mark.asyncio
async def test_catalog_validation_and_missing_records(clients):
    admin = clients['ADMIN']
    assert (await admin.get('/api/products/missing')).status_code == 404
    assert (await admin.patch('/api/products/missing', json={'active': False})).status_code == 404
    assert (await admin.get('/api/products/missing/variants')).status_code == 404
    assert (await admin.post('/api/products/missing/variants', json=VARIANT)).status_code == 404
    assert (await admin.get('/api/products?page=0')).status_code == 422
    assert (await admin.get('/api/products?page_size=101')).status_code == 422
    product = await create_product(admin)
    for value in [1.2, True, '56000', -150001]:
        assert (await admin.post('/api/products/' + product['id'] + '/variants', json={**VARIANT, 'price_delta_minor': value})).status_code == 422
