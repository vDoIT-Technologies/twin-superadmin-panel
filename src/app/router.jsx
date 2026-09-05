import { lazy, Suspense } from 'react';
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { HomeAuthPage } from '../pages/HomeAuthPage';
import { LoginOtpPage } from '../pages/LoginOtpPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { canAccessPath } from '../utils/productAccess';

const OverviewPage = lazy(() => import('../pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ClientsPage = lazy(() => import('../pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const TwinsPage = lazy(() => import('../pages/TwinsPage').then((module) => ({ default: module.TwinsPage })));
const UsersPage = lazy(() => import('../pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const ServicesPage = lazy(() => import('../pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const VaultPage = lazy(() => import('../pages/VaultPage').then((module) => ({ default: module.VaultPage })));
const PlansPage = lazy(() => import('../pages/PlansPage').then((module) => ({ default: module.PlansPage })));
const FinancialPage = lazy(() => import('../pages/FinancialPage').then((module) => ({ default: module.FinancialPage })));
const UsagePage = lazy(() => import('../pages/UsagePage').then((module) => ({ default: module.UsagePage })));
const TelemetryPage = lazy(() => import('../pages/TelemetryPage').then((module) => ({ default: module.TelemetryPage })));
const ClientDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.ClientDetailPage })));
const TwinDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.TwinDetailPage })));
const UserDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.UserDetailPage })));

function RouteFallback() {
  return <div className="flex min-h-[300px] items-center justify-center p-8 text-sm font-semibold text-slate-400" role="status" aria-live="polite">Loading page...</div>;
}

function renderLazyPage(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function LegacyAppRedirect() {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/app/, '') || '/';
  return <Navigate to={nextPath} replace />;
}

function AuthScreenMessage({ message, title = 'SuperAdmin' }) {
  return (
    <section className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_36%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_55%,#eef2ff_100%)] p-6">
      <div className="w-full max-w-[420px] rounded-3xl border border-slate-400/25 bg-white/90 p-7 text-center shadow-2xl backdrop-blur-md">
        <span className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-indigo-600/10 bg-white/80 px-3.5 text-xs font-bold text-indigo-600 shadow-sm">{title}</span>
        <p className="mt-3.5 text-sm text-slate-600">{message}</p>
      </div>
    </section>
  );
}

function RequireAuth() {
  const { adminProduct, isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    const productName = adminProduct === 'vault' ? 'Vault' : 'Twin';
    return (
      <AuthScreenMessage
        title={isLoggingOut ? `${productName} SuperAdmin` : 'SuperAdmin'}
        message={isLoggingOut ? 'Signing out...' : 'Signing you in...'}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function ProductRoute({ children }) {
  const { adminProduct } = useAuth();
  const location = useLocation();

  if (!canAccessPath(adminProduct, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ProductOverview() {
  return renderLazyPage(<OverviewPage />);
}

function RedirectIfAuthenticated() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <HomeAuthPage />;
}

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        errorElement: <NotFoundPage />,
        children: [
          { index: true, element: <ProductOverview /> },
          { path: 'profile', element: renderLazyPage(<ProfilePage />) },
          { path: 'clients', element: renderLazyPage(<ClientsPage />) },
          { path: 'clients/:clientId', element: renderLazyPage(<ClientDetailPage />) },
          { path: 'twins', element: <ProductRoute>{renderLazyPage(<TwinsPage />)}</ProductRoute> },
          { path: 'twins/:twinId', element: <ProductRoute>{renderLazyPage(<TwinDetailPage />)}</ProductRoute> },
          { path: 'users', element: renderLazyPage(<UsersPage />) },
          { path: 'users/:userId', element: renderLazyPage(<UserDetailPage />) },
          { path: 'services', element: renderLazyPage(<ServicesPage />) },
          { path: 'vault', element: <ProductRoute>{renderLazyPage(<VaultPage />)}</ProductRoute> },
          { path: 'plans', element: <ProductRoute>{renderLazyPage(<PlansPage />)}</ProductRoute> },
          { path: 'financial', element: <ProductRoute>{renderLazyPage(<FinancialPage />)}</ProductRoute> },
          { path: 'usage', element: <ProductRoute>{renderLazyPage(<UsagePage />)}</ProductRoute> },
          { path: 'telemetry', element: renderLazyPage(<TelemetryPage />) },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <RedirectIfAuthenticated />,
  },
  {
    path: '/login/verify-otp',
    element: <LoginOtpPage />,
  },
  { path: '/app/*', element: <LegacyAppRedirect /> },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
