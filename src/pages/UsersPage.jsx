import { useEffect, useState } from 'react';
import { DataTable } from '../components/common/DataTable';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboardService';

const columns = [
  { key: 'name', label: 'User' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
];

export function UsersPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    dashboardService.getUsers().then(setRows);
  }, []);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Access"
        title="Users"
        description="Review operators, roles, and account status across the superadmin surface."
      />
      <DataTable columns={columns} rows={rows} statusKey="status" />
    </section>
  );
}
