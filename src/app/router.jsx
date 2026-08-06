import { lazy, Suspense } from 'react';
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { HomeAuthPage } from '../pages/HomeAuthPage';
import { LoginOtpPage } from '../pages/LoginOtpPage';
import { NotFoundPage } from '../pages/NotFoundPage';

const OverviewPage = lazy(() => import('../pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ClientsPage = lazy(() => import('../pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const TwinsPage = lazy(() => import('../pages/TwinsPage').then((module) => ({ default: module.TwinsPage })));
const UsersPage = lazy(() => import('../pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const ServicesPage = lazy(() => import('../pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const VaultPage = lazy(() => import('../pages/VaultPage').then((module) => ({ default: module.VaultPage })));
const FinancialPage = lazy(() => import('../pages/FinancialPage').then((module) => ({ default: module.FinancialPage })));
const UsagePage = lazy(() => import('../pages/UsagePage').then((module) => ({ default: module.UsagePage })));
const TelemetryPage = lazy(() => import('../pages/TelemetryPage').then((module) => ({ default: module.TelemetryPage })));
const ClientDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.ClientDetailPage })));
const TwinDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.TwinDetailPage })));
const UserDetailPage = lazy(() => import('../pages/EntityDetailPages').then((module) => ({ default: module.UserDetailPage })));

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite">Loading page...</div>;
}

function renderLazyPage(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function LegacyAppRedirect() {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/app/, '') || '/';
  return <Navigate to={nextPath} replace />;
}

function AuthScreenMessage({ message }) {
  return (
    <section className="auth-loading-screen">
      <div className="auth-loading-card">
        <span className="auth-pill">Twin SuperAdmin</span>
        <p>{message}</p>
      </div>
    </section>
  );
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthScreenMessage message="Signing you in..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
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
          { index: true, element: renderLazyPage(<OverviewPage />) },
          { path: 'profile', element: renderLazyPage(<ProfilePage />) },
          { path: 'clients', element: renderLazyPage(<ClientsPage />) },
          { path: 'clients/:clientId', element: renderLazyPage(<ClientDetailPage />) },
          { path: 'twins', element: renderLazyPage(<TwinsPage />) },
          { path: 'twins/:twinId', element: renderLazyPage(<TwinDetailPage />) },
          { path: 'users', element: renderLazyPage(<UsersPage />) },
          { path: 'users/:userId', element: renderLazyPage(<UserDetailPage />) },
          { path: 'services', element: renderLazyPage(<ServicesPage />) },
          { path: 'vault', element: renderLazyPage(<VaultPage />) },
          { path: 'financial', element: renderLazyPage(<FinancialPage />) },
          { path: 'usage', element: renderLazyPage(<UsagePage />) },
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
