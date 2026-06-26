import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { ClientsPage } from '../pages/ClientsPage';
import { ClientDetailPage, TwinDetailPage, UserDetailPage } from '../pages/EntityDetailPages';
import { FinancialPage } from '../pages/FinancialPage';
import { HomeAuthPage } from '../pages/HomeAuthPage';
import { LoginOtpPage } from '../pages/LoginOtpPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OverviewPage } from '../pages/OverviewPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ServicesPage } from '../pages/ServicesPage';
import { TwinsPage } from '../pages/TwinsPage';
import { UsersPage } from '../pages/UsersPage';
import { UsagePage } from '../pages/UsagePage';
import { TelemetryPage } from '../pages/TelemetryPage';
import { VaultPage } from '../pages/VaultPage';

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
          { index: true, element: <OverviewPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'clients/:clientId', element: <ClientDetailPage /> },
          { path: 'twins', element: <TwinsPage /> },
          { path: 'twins/:twinId', element: <TwinDetailPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/:userId', element: <UserDetailPage /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'vault', element: <VaultPage /> },
          { path: 'financial', element: <FinancialPage /> },
          { path: 'usage', element: <UsagePage /> },
          { path: 'telemetry', element: <TelemetryPage /> },
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
