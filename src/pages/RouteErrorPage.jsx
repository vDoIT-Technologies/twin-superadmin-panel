import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';
import { isChunkLoadError } from '../utils/chunkReload';

export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  console.error(error);

  const isStaleBuild = isChunkLoadError(error);
  const title = isStaleBuild ? 'A new version is available' : 'Something went wrong';
  const message = isStaleBuild
    ? 'This page was updated since you opened the app. Reload to get the latest version.'
    : 'This page failed to load. Reload to try again, or go back to the overview.';

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" to="/">
          Return to overview
        </Link>
      </div>
    </section>
  );
}
