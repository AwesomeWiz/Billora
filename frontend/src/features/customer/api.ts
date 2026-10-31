import { api } from '../../lib/api';
import { currency, identifier, parsePage, record, text } from './records';

export interface CustomerAccount { id: string; display_name: string; billing_email: string; billing_address?: string | null; currency: string }
/** Architecture §4.2, not the unfinished auth Account ORM shape. No email/name aliases are guessed. */
export function parseCustomer(value: unknown): CustomerAccount {
  const body = record(value);
  return { id: identifier(body.id), display_name: text(body.display_name), billing_email: text(body.billing_email), currency: currency(body.currency),
    billing_address: body.billing_address == null ? undefined : text(body.billing_address) };
}
export const customerApi = {
  async list(query: string, signal?: AbortSignal) { return parsePage(await api.get<unknown>(`/accounts?${query}`, { signal }), parseCustomer); },
  async detail(id: string, signal?: AbortSignal) { return parseCustomer(await api.get<unknown>(`/accounts/${identifier(id)}`, { signal })); },
};
