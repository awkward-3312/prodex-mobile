import type { DashboardMetric, RecentSale, Trend } from '../types/dashboard';

export const todaySales: {
  amount: number;
  percentageChange: number;
  comparisonLabel: string;
  trend: Trend;
} = {
  amount: 8420.5,
  percentageChange: 12.5,
  comparisonLabel: 'vs ayer',
  trend: 'positive',
};

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Ventas del mes', value: 286940.2, tone: 'blue', detail: '+8.4% vs. mes anterior', icon: 'bar-chart-outline' },
  { label: 'Utilidad', value: 82460.45, tone: 'teal', detail: 'Margen del 28.7%', icon: 'wallet-outline' },
  { label: 'Por cobrar', value: 34680, tone: 'amber', detail: '14 facturas pendientes', icon: 'time-outline' },
  { label: 'Bajo inventario', value: 8, tone: 'red', detail: 'productos críticos', icon: 'cube-outline', valueText: '8' },
];

export const recentSales: RecentSale[] = [
  { id: 'sale-1', customer: 'Café La Estación', time: '10:42 a. m.', amount: 2480, status: 'Pagada', initials: 'CE' },
  { id: 'sale-2', customer: 'Pulpería La 15', time: '10:18 a. m.', amount: 895.5, status: 'Pagada', initials: 'PL' },
  { id: 'sale-3', customer: 'Hotel Mirador', time: '9:56 a. m.', amount: 6270, status: 'Pendiente', initials: 'HM' },
  { id: 'sale-4', customer: 'Constructora Norte', time: '9:24 a. m.', amount: 1450.25, status: 'Pagada', initials: 'CN' },
];
