import { useEffect, useState } from 'react';
import { DataTable } from '../components/common/DataTable';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboardService';

const columns = [
  { key: 'name', label: 'Service' },
  { key: 'uptime', label: 'Uptime' },
  { key: 'latency', label: 'Latency' },
  { key: 'status', label: 'Status' },
];

export function ServicesPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    dashboardService.getServices().then(setRows);
  }, []);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Infrastructure"
        title="Services"
        description="Track service uptime, latency, and runtime health across the platform stack."
      />
      <DataTable columns={columns} rows={rows} statusKey="status" />
    </section>
  );
}
