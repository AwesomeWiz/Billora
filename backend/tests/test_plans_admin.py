import pytest

BASE = {'name': 'Monthly', 'base_fee_minor': 0, 'available_from': '2026-10-31', 'billing_interval': 'MONTHLY', 'bill_plan_base_fee': False}


@pytest.mark.asyncio
async def test_plan_contract_search_filters_and_pagination(clients):
    admin = clients['ADMIN']
    ids = []
    for i, interval in enumerate(['MONTHLY', 'MONTHLY', 'YEARLY']):
        response = await admin.post('/api/plans', json={**BASE, 'name': f'Plan {i}', 'billing_interval': interval, 'active': i < 2})
        assert response.status_code == 201, response.text
        assert response.json()['created_at'] and response.json()['min_quantity'] == 1
        ids.append(response.json()['id'])
    data = (await clients['STAFF'].get('/api/plans?search=PLAN&billing_interval=MONTHLY&active=true&page_size=1')).json()
    assert data['total'] == 2 and data['has_next'] and len(data['items']) == 1
    next_page = (await admin.get('/api/plans?search=PLAN&billing_interval=MONTHLY&active=true&page_size=1&page=2')).json()
    assert next_page['total'] == 2 and not next_page['has_next']
    assert data['items'][0]['id'] != next_page['items'][0]['id']
    assert (await admin.get('/api/plans?active=false')).json()['total'] == 1
    assert (await admin.get('/api/plans?search=missing')).json()['items'] == []
    assert (await admin.get('/api/plans/?skip=1&limit=1')).status_code == 200
    url = '/api/plans/' + ids[0]
    response = await admin.patch(url, json={'base_fee_minor': 10000, 'can_pause': False})
    assert response.status_code == 200 and response.json()['base_fee_minor'] == 10000 and not response.json()['can_pause']
    assert (await clients['STAFF'].get(url)).json() == response.json()
    assert (await admin.get('/api/plans/missing')).status_code == 404
    assert (await admin.patch('/api/plans/missing', json={'active': False})).status_code == 404


@pytest.mark.asyncio
async def test_plan_validation_merged_patch_and_conflict(clients):
    admin = clients['ADMIN']
    response = await admin.post('/api/plans', json={**BASE, 'available_to': '2026-12-01'})
    url = '/api/plans/' + response.json()['id']
    assert (await admin.post('/api/plans', json=BASE)).status_code == 409
    for patch in [{'available_from': '2027-01-01'}, {'available_from': None}, {'name': None}, {'base_fee_minor': 1.5}, {'base_fee_minor': True}, {'min_quantity': 0}, {'billing_interval': 'INVALID'}, {'active': None}]:
        assert (await admin.patch(url, json=patch)).status_code == 422
    assert (await admin.patch(url, json={})).status_code == 400
    assert (await admin.patch(url, json={'available_to': None})).status_code == 200
    for query in ['page=0', 'page_size=101', 'billing_interval=INVALID']:
        assert (await admin.get('/api/plans?' + query)).status_code == 422


@pytest.mark.asyncio
async def test_plan_security_preserved(clients):
    admin = clients['ADMIN']
    response = await admin.post('/api/plans', json=BASE)
    url = '/api/plans/' + response.json()['id']
    for role in ['STAFF', 'CUSTOMER']:
        assert (await clients[role].post('/api/plans', json=BASE)).status_code == 403
        assert (await clients[role].patch(url, json={'active': False})).status_code == 403
    for method, path, data in [('POST', '/api/plans', BASE), ('POST', '/api/plans/', BASE), ('PATCH', url, {'active': False})]:
        for headers in [{'X-CSRF-Token': ''}, {'X-CSRF-Token': 'bad'}, {'Origin': ''}, {'Origin': 'https://evil.invalid'}]:
            assert (await admin.request(method, path, json=data, headers=headers)).status_code == 403
        token = admin.headers.pop('X-CSRF-Token')
        assert (await admin.request(method, path, json=data)).status_code == 422
        admin.headers['X-CSRF-Token'] = token
    for path in ['/api/plans', '/api/plans/', url]:
        # Existing Plans API explicitly permits public catalog reads.
        assert (await clients['CUSTOMER'].get(path)).status_code == 200
        assert (await clients['ANONYMOUS'].get(path)).status_code == 200
