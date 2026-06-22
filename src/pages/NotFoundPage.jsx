import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="empty-state">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The route you requested is not part of this starter app yet.</p>
      <Link className="button-link" to="/">
        Return to overview
      </Link>
    </section>
  );
}
