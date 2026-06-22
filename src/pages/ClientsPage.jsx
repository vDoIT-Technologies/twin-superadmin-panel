import { useEffect, useState } from 'react';
import { DataTable } from '../components/common/DataTable';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboardService';

const columns = [
  { key: 'name', label: 'Client' },
  { key: 'plan', label: 'Plan' },
  { key: 'status', label: 'Status' },
  { key: 'region', label: 'Region' },
  { key: 'twins', label: 'Twins' },
];

export function ClientsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    dashboardService.getClients().then(setRows);
  }, []);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        description="Track tenant footprint, plan mix, status, and regional coverage from one operational view."
      />
      <DataTable columns={columns} rows={rows} statusKey="status" />
    </section>
  );
}
