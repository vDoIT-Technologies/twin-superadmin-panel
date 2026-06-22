import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ClientsPage } from '../pages/ClientsPage';
import { FinancialPage } from '../pages/FinancialPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OverviewPage } from '../pages/OverviewPage';
import { ServicesPage } from '../pages/ServicesPage';
import { TwinsPage } from '../pages/TwinsPage';
import { UsersPage } from '../pages/UsersPage';
import { UsagePage } from '../pages/UsagePage';
import { TelemetryPage } from '../pages/TelemetryPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'twins', element: <TwinsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'financial', element: <FinancialPage /> },
      { path: 'usage', element: <UsagePage /> },
      { path: 'telemetry', element: <TelemetryPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
