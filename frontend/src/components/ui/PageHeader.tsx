import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PageHeader({ title, description, action, breadcrumbs }: {
  title: string; description?: string; action?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return <header className="page-header">
    <div>
      {breadcrumbs && <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{breadcrumbs.map((item, index) =>
        <li key={index}>{item.href ? <Link to={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>}
      <h1>{title}</h1>{description && <p className="muted">{description}</p>}
    </div>{action && <div className="page-actions">{action}</div>}
  </header>;
}
