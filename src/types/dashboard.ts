export type MetricTone = 'brand' | 'blue' | 'teal' | 'amber' | 'red';
export type Trend = 'positive' | 'negative' | 'neutral';

export type DashboardMetric = {
  label: string;
  value: number;
  valueText?: string;
  tone: MetricTone;
  detail: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
};

export type RecentSale = {
  id: string;
  customer: string;
  time: string;
  amount: number;
  status: 'Pagada' | 'Pendiente';
  initials: string;
};
