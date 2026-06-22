import { useEffect, useState } from 'react';
import { DataTable } from '../components/common/DataTable';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboardService';

const columns = [
  { key: 'name', label: 'Twin' },
  { key: 'client', label: 'Client' },
  { key: 'health', label: 'Health' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'lastSync', label: 'Last sync' },
];

export function TwinsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    dashboardService.getTwins().then(setRows);
  }, []);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Assets"
        title="Twins"
        description="Monitor health, alert load, and data freshness for the deployed twin fleet."
      />
      <DataTable columns={columns} rows={rows} statusKey="health" />
    </section>
  );
}
