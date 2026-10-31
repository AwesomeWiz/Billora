export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) { super(message); this.name = 'ApiError'; }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseError(status: number, data: unknown): ApiError {
  const body = isRecord(data) ? data : {};
  const defaults: Record<number, string> = {
    401: 'Your session has ended. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource or API endpoint is unavailable.',
    409: 'This record changed or the action is no longer allowed. Refresh before trying again.',
    422: 'Check the information you entered and try again.',
    429: 'Too many requests. Please wait before trying again.',
  };
  // Never surface unexpected server tracebacks, proxy HTML, or raw validation inputs.
  const message = status < 500 && typeof body.message === 'string'
    ? body.message : defaults[status] ?? 'The service could not complete this request. Please try again.';
  return new ApiError(status, typeof body.code === 'string' ? body.code : `HTTP_${status}`,
    message, body.details ?? body.detail, typeof body.request_id === 'string' ? body.request_id : undefined);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Caller must reuse this key when reconciling/retrying the same financial operation. */
  idempotencyKey?: string;
}

export function createApiClient({ fetcher = (...args: Parameters<typeof fetch>) => globalThis.fetch(...args), timeoutMs = 15_000 } = {}) {
  let csrfToken: string | null = null;
  const unauthorizedListeners = new Set<() => void>();

  async function request<T>(path: string, { method = 'GET', body, signal, idempotencyKey }: RequestOptions = {}): Promise<T> {
    const resolved = new URL(`/api${path}`, 'https://billora.invalid');
    if (!path.startsWith('/') || path.startsWith('//') || !resolved.pathname.startsWith('/api/') || path.includes('#')) {
      throw new ApiError(0, 'UNSAFE_PATH', 'API requests must use a relative /api resource path.');
    }
    const mutation = method !== 'GET';
    if (mutation && !csrfToken) {
      throw new ApiError(0, 'CSRF_UNAVAILABLE', 'A secure request token is unavailable. Reconnect to the authentication service and try again.');
    }
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (mutation) headers.set('X-CSRF-Token', csrfToken!);
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal?.reason);
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener('abort', abortFromCaller, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetcher(`/api${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal,
      });
      if (response.status === 401) {
        csrfToken = null;
        unauthorizedListeners.forEach(listener => listener());
      }
      // The anonymous CSRF bootstrap policy still needs backend-owner agreement.
      // Accept this explicit header if supplied; never invent a token or bypass CSRF.
      const issuedCsrf = response.headers.get('X-CSRF-Token');
      if (issuedCsrf?.trim()) csrfToken = issuedCsrf;
      const contentType = response.headers.get('Content-Type') ?? '';
      let data: unknown;
      if (response.status !== 204 && contentType.includes('application/json')) {
        try { data = await response.json(); }
        catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'The service returned an unreadable response.'); }
      }
      if (!response.ok) throw responseError(response.status, data);
      if (response.status !== 204 && data === undefined) {
        throw new ApiError(response.status, 'INVALID_RESPONSE', 'The API returned an unexpected response. Check the backend connection.');
      }
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError(0, 'TIMEOUT', mutation
        ? 'The response timed out and the result could not be confirmed. Refresh before submitting again.'
        : 'The service took too long to respond. Please try again.');
      if (signal?.aborted || controller.signal.aborted) throw new ApiError(0, 'ABORTED', 'Request cancelled.');
      throw new ApiError(0, 'NETWORK_ERROR', mutation
        ? 'The connection was interrupted and the result could not be confirmed. Refresh before submitting again.'
        : 'Unable to reach the service. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, options),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'POST', body }),
    setCsrfToken: (token: string | null) => { csrfToken = token; },
    hasCsrfToken: () => Boolean(csrfToken),
    onUnauthorized: (listener: () => void) => {
      unauthorizedListeners.add(listener);
      return () => { unauthorizedListeners.delete(listener); };
    },
  };
}

export const api = createApiClient();

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
