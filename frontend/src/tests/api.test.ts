import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../lib/api';

const json = (data: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', ...headers },
});

afterEach(() => vi.useRealTimers());

describe('API transport and mutation safety', () => {
  it('sends cookie credentials and never stores session secrets', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ items: [] }));
    const client = createApiClient({ fetcher });
    await client.get('/accounts?page=1');
    expect(fetcher).toHaveBeenCalledWith('/api/accounts?page=1', expect.objectContaining({ credentials: 'include', cache: 'no-store', redirect: 'error' }));
  });

  it('fails closed before a mutation when CSRF is missing', async () => {
    const fetcher = vi.fn();
    await expect(createApiClient({ fetcher }).post('/auth/login', { email: 'a@example.test', password: 'secret' })).rejects.toMatchObject({ code: 'CSRF_UNAVAILABLE' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('includes CSRF and caller-owned idempotency key without retrying a failed payment', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = createApiClient({ fetcher });
    client.setCsrfToken('test-csrf');
    await expect(client.post('/payments', { amount_minor: 100 }, { idempotencyKey: 'operation-123' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const headers = fetcher.mock.calls[0][1].headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('test-csrf');
    expect(headers.get('Idempotency-Key')).toBe('operation-123');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidates session state on 401 while accepting an explicitly issued anonymous CSRF header', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ message: 'Sign in required' }, 401, { 'X-CSRF-Token': 'anonymous-csrf' }));
    const client = createApiClient({ fetcher });
    const unauthorized = vi.fn();
    client.setCsrfToken('old-csrf');
    client.onUnauthorized(unauthorized);
    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).toHaveBeenCalledOnce();
    expect(client.hasCsrfToken()).toBe(true);
  });

  it('clears CSRF after session expiry without a replacement', async () => {
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValue(json({}, 401)) });
    client.setCsrfToken('old');
    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(client.hasCsrfToken()).toBe(false);
  });

  it('normalizes structured and FastAPI validation errors', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ code: 'CONFLICT', message: 'Record changed', request_id: 'req-1' }, 409))
      .mockResolvedValueOnce(json({ detail: [{ loc: ['body', 'email'], msg: 'Invalid email' }] }, 422));
    const client = createApiClient({ fetcher });
    await expect(client.get('/accounts')).rejects.toMatchObject({ status: 409, code: 'CONFLICT', message: 'Record changed', requestId: 'req-1' });
    await expect(client.get('/accounts')).rejects.toMatchObject({ status: 422, message: 'Check the information you entered and try again.' });
  });

  it.each([[401, 'Invalid credentials'], [409, 'Email already registered']])('preserves the verified FastAPI HTTP %s detail message', async (status, message) => {
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValue(json({ detail: message }, status as number)) });
    await expect(client.get('/auth/me')).rejects.toMatchObject({ status, message });
  });

  it('removes submitted inputs and nested contexts from FastAPI validation errors', async () => {
    const detail = [{ loc: ['body', 'password'], msg: 'Password must contain upper, lower & special char', type: 'value_error', input: 'test-only-sensitive-input', ctx: { error: 'test-only-sensitive-input' } }];
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValue(json({ detail }, 422)) });
    const error = await client.get('/auth/me').catch(value => value);
    expect(error.details).toEqual([{ loc: ['body', 'password'], msg: detail[0].msg, type: 'value_error' }]);
    expect(JSON.stringify(error)).not.toContain('test-only-sensitive-input');
  });

  it('does not retain raw FastAPI server trace details', async () => {
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValue(json({ detail: 'Internal traceback', details: { sql: 'Internal SQL' } }, 500)) });
    const error = await client.get('/auth/me').catch(value => value);
    expect(error.message).not.toContain('traceback');
    expect(error.details).toBeUndefined();
  });

  it('does not expose server internals or accept proxy HTML as a successful API result', async () => {
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValueOnce(json({ message: 'SQL internal traceback' }, 500))
      .mockResolvedValueOnce(new Response('<html>Vite fallback</html>', { headers: { 'Content-Type': 'text/html' } })) });
    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 500, message: 'The service could not complete this request. Please try again.' });
    await expect(client.get('/auth/me')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('supports no-content success and malformed JSON errors', async () => {
    const client = createApiClient({ fetcher: vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('{', { headers: { 'Content-Type': 'application/json' } })) });
    client.setCsrfToken('csrf');
    await expect(client.post('/auth/logout')).resolves.toBeUndefined();
    await expect(client.get('/auth/me')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it.each(['https://evil.test', '//evil.test', '/../auth', '/%2e%2e/auth'])('rejects unsafe path %s', async path => {
    const fetcher = vi.fn();
    await expect(createApiClient({ fetcher }).get(path)).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('honors caller cancellation and distinguishes it from a deadline', async () => {
    const fetcher = vi.fn().mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const controller = new AbortController();
    const client = createApiClient({ fetcher });
    const promise = client.get('/accounts', { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
    controller.abort();
    await assertion;
    vi.useFakeTimers();
    const timeoutClient = createApiClient({ fetcher, timeoutMs: 50 });
    const timedRequest = timeoutClient.get('/accounts');
    const timeoutAssertion = expect(timedRequest).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(51);
    await timeoutAssertion;
  });
});
