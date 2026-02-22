import { DollarSign, List, Calendar } from 'lucide-react';
import { CurrencyType } from '../types';
import { formatCurrency } from '../utils/dates';

interface StatsCardsProps {
  totalMonthly: number;
  activeCount: number;
  dueThisWeek: number;
  displayCurrency: CurrencyType;
}

export default function StatsCards({
  totalMonthly,
  activeCount,
  dueThisWeek,
  displayCurrency,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <StatCard
        icon={<DollarSign className="text-blue-600" size={24} />}
        iconBg="bg-blue-100"
        label="Monthly Total"
        value={formatCurrency(totalMonthly, displayCurrency)}
      />

      <StatCard
        icon={<List className="text-green-600" size={24} />}
        iconBg="bg-green-100"
        label="Active"
        value={activeCount.toString()}
      />

      <StatCard
        icon={<Calendar className="text-orange-600" size={24} />}
        iconBg="bg-orange-100"
        label="Due This Week"
        value={dueThisWeek.toString()}
      />
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
