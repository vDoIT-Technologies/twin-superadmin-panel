import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The route you requested is not part of this starter app yet.</p>
      <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700" to="/">
        Return to overview
      </Link>
    </section>
  );
}
