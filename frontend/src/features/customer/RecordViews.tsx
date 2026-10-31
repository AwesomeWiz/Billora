import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, EmptyState, ErrorState, Input, LoadingSkeleton, Select } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import type { RecordPage } from './records';
import './records.css';

export function RecordError({ error, retry }: { error: unknown; retry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  return <ErrorState title={status === 403 ? 'You do not have access' : status === 404 ? 'Record or service unavailable' : 'Unable to load records'}
    description={status === 404 ? 'This record may be unavailable, or its API has not been connected yet.' : errorMessage(error)} permission={status === 403} onRetry={status === 403 ? undefined : retry} />;
}

export function RecordTable({ caption, columns, children }: { caption: string; columns: string[]; children: ReactNode }) {
  return <div className="record-table-scroll" tabIndex={0} role="region" aria-label={`${caption} table; scroll horizontally for more columns`}>
    <table className="record-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{children}</tbody></table>
  </div>;
}

export function SearchRecords({ search, label, onSearch, children }: { search: string; label: string; onSearch: (value: string) => void; children?: ReactNode }) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  function submit(event: FormEvent) { event.preventDefault(); onSearch(draft.trim()); }
  return <form className="record-filters" role="search" aria-label={label} onSubmit={submit}>
    <Input label={label} type="search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={200} placeholder="Search by name or reference" />
    {children}<Button type="submit" variant="secondary">Search</Button>
  </form>;
}

export function Pagination({ data, onPage, onSize }: { data: RecordPage<unknown>; onPage: (page: number) => void; onSize: (size: string) => void }) {
  return <nav className="record-pagination" aria-label="Pagination">
    <p className="muted" role="status">Page {data.page} · {data.total.toLocaleString('en-IN')} records total</p>
    <Select label="Rows per page" value={String(data.page_size)} onChange={event => onSize(event.target.value)}>
      {[20, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
    </Select>
    <div className="record-inline"><Button variant="secondary" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</Button><Button variant="secondary" disabled={!data.has_next} onClick={() => onPage(data.page + 1)}>Next</Button></div>
  </nav>;
}

export function RecordsLoading({ label }: { label: string }) { return <div className="record-padding"><LoadingSkeleton lines={5} label={label} /></div>; }
export function UnavailableSection({ title, description }: { title: string; description: string }) {
  return <section className="card"><div className="card-header"><h2>{title}</h2></div><EmptyState title={`${title} unavailable`} description={description} /></section>;
}
