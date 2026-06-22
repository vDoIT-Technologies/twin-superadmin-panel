export const dashboardMetrics = [
  { label: 'Active clients', value: 128, change: '+12%', tone: 'good' },
  { label: 'Digital twins', value: 412, change: '+8%', tone: 'good' },
  { label: 'Incidents open', value: 14, change: '-3%', tone: 'warn' },
  { label: 'Monthly revenue', value: 184250, change: '+17%', tone: 'good' },
];

export const clients = [
  { id: 'cl-100', name: 'Apex Manufacturing', plan: 'Enterprise', status: 'active', region: 'North America', twins: 54 },
  { id: 'cl-101', name: 'Nova Grid', plan: 'Growth', status: 'active', region: 'Europe', twins: 28 },
  { id: 'cl-102', name: 'Delta Health', plan: 'Enterprise', status: 'trial', region: 'Asia Pacific', twins: 18 },
  { id: 'cl-103', name: 'Orbital Logistics', plan: 'Scale', status: 'active', region: 'Middle East', twins: 36 },
];

export const twins = [
  { id: 'tw-201', name: 'Factory Line A', client: 'Apex Manufacturing', health: 'healthy', alerts: 2, lastSync: '5 min ago' },
  { id: 'tw-202', name: 'Wind Farm Cluster 7', client: 'Nova Grid', health: 'watch', alerts: 5, lastSync: '12 min ago' },
  { id: 'tw-203', name: 'Cold Chain Hub', client: 'Orbital Logistics', health: 'healthy', alerts: 1, lastSync: '2 min ago' },
  { id: 'tw-204', name: 'Critical Care Pod', client: 'Delta Health', health: 'risk', alerts: 9, lastSync: '18 min ago' },
];

export const users = [
  { id: 'us-301', name: 'Mia Alvarez', role: 'Superadmin', email: 'mia@twinprotocol.dev', status: 'active' },
  { id: 'us-302', name: 'Jordan Lee', role: 'Client admin', email: 'jordan@apex.io', status: 'active' },
  { id: 'us-303', name: 'Priya Nair', role: 'Finance ops', email: 'priya@novagrid.com', status: 'pending' },
  { id: 'us-304', name: 'Ravi Menon', role: 'Support lead', email: 'ravi@deltahealth.org', status: 'active' },
];

export const services = [
  { id: 'sv-401', name: 'Ingestion API', uptime: '99.98%', latency: '182 ms', status: 'healthy' },
  { id: 'sv-402', name: 'Inference pipeline', uptime: '99.74%', latency: '428 ms', status: 'watch' },
  { id: 'sv-403', name: 'Billing engine', uptime: '99.93%', latency: '205 ms', status: 'healthy' },
  { id: 'sv-404', name: 'Alert dispatcher', uptime: '98.91%', latency: '640 ms', status: 'risk' },
];

export const financialSummary = [
  { label: 'MRR', value: 184250 },
  { label: 'ARR', value: 2211000 },
  { label: 'Collection rate', value: 97.2, suffix: '%' },
  { label: 'Outstanding invoices', value: 23 },
];
