import pytest


@pytest.mark.asyncio
async def test_application_health_docs_and_actual_openapi(clients):
    client = clients['ANONYMOUS']
    assert (await client.get('/api/health')).json() == {'status': 'ok'}
    assert (await client.get('/api/docs')).status_code == 200
    paths = (await client.get('/api/openapi.json')).json()['paths']
    for path, methods in {
        '/api/discounts': ['get', 'post'], '/api/discounts/{discount_id}': ['get', 'patch'],
        '/api/products': ['get', 'post'], '/api/products/{product_id}': ['get', 'patch'],
        '/api/products/{product_id}/variants': ['get', 'post'],
        '/api/products/{product_id}/variants/{variant_id}': ['patch', 'delete'],
        '/api/plans': ['get', 'post'], '/api/plans/{plan_id}': ['get', 'patch'],
    }.items():
        assert set(methods).issubset(paths[path])
