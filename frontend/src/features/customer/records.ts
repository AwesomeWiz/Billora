import { useCallback, useEffect, useState } from 'react';
import { ApiError, isRecord } from '../../lib/api';

/** Architecture §7.1. Keep this adapter local until shared contracts are published. */
export interface RecordPage<T> { items: T[]; total: number; page: number; page_size: number; has_next: boolean }
export function invalidRecord(): never {
  throw new ApiError(0, 'UNSUPPORTED_CONTRACT', 'The service returned data this view cannot read yet. Please contact the integration owner.');
}
export function record(value: unknown): Record<string, unknown> { return isRecord(value) ? value : invalidRecord(); }
export function text(value: unknown): string { return typeof value === 'string' && value.trim() ? value : invalidRecord(); }
export function identifier(value: unknown): string {
  const id = text(value);
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : invalidRecord();
}
export function minor(value: unknown): number { return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : invalidRecord(); }
export function currency(value: unknown): string {
  if (value === undefined) return 'INR';
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : invalidRecord();
}
export function date(value: unknown): string {
  const candidate = text(value);
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : invalidRecord();
}
export function parsePage<T>(value: unknown, parse: (item: unknown) => T): RecordPage<T> {
  const body = record(value);
  if (!Array.isArray(body.items) || !Number.isSafeInteger(body.total) || (body.total as number) < 0 ||
    !Number.isSafeInteger(body.page) || (body.page as number) < 1 || !Number.isSafeInteger(body.page_size) ||
    (body.page_size as number) < 1 || (body.page_size as number) > 100 || typeof body.has_next !== 'boolean' ||
    body.items.length > (body.page_size as number) || body.items.length > (body.total as number)) return invalidRecord();
  const items = body.items.map(parse);
  return { items, total: body.total as number, page: body.page as number, page_size: body.page_size as number, has_next: body.has_next };
}
export function pageNumber(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
export function pageSize(value: string | null): number { return ['20', '25', '50'].includes(value ?? '') ? Number(value) : 20; }

type Resource<T> = { key: string; status: 'loading' } | { key: string; status: 'ready'; data: T } | { key: string; status: 'error'; error: unknown };
/** Ignore stale reads even if a transport fails to honor cancellation. Never retain another record's data. */
export function useRecordResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ key, status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setResource({ key, status: 'loading' });
    void load(controller.signal).then(data => {
      if (!controller.signal.aborted) setResource({ key, status: 'ready', data });
    }).catch(error => {
      if (!controller.signal.aborted) setResource({ key, status: 'error', error });
    });
    return () => controller.abort();
  }, [key, load, version]);
  return { resource: resource.key === key ? resource : { key, status: 'loading' as const }, reload };
}
