import { Link } from 'react-router-dom';

export function Brand({ to = '/' }: { to?: string }) {
  return <Link className="brand" to={to} aria-label="Billora home">
    <span className="brand-mark" aria-hidden="true">b<span /></span>
    <span>billora<span className="brand-period">.</span></span>
  </Link>;
}
