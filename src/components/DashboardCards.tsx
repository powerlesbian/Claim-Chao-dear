import { TrendingUp, Repeat, CreditCard, Tag } from 'lucide-react';
import { Subscription, CurrencyType } from '../types';
import { formatCurrency } from '../utils/dates';
import { getMonthlyValue } from '../utils/calculations';
import { convertCurrency } from '../utils/currency';

interface DashboardCardsProps {
  subscriptions: Subscription[];
  displayCurrency: CurrencyType;
}

export default function DashboardCards({ subscriptions, displayCurrency }: DashboardCardsProps) {
  const activeSubscriptions = subscriptions.filter(s => !s.cancelled);
  
  // Helper to get value in display currency (handles one-off correctly)
  const getValue = (sub: Subscription): number => {
    const converted = convertCurrency(sub.amount, sub.currency, displayCurrency);
    return converted;
  };

  // Calculate top category (include all transactions)
  const categoryTotals = new Map<string, number>();
  activeSubscriptions.forEach(sub => {
    const category = sub.category || 'Other';
    const current = categoryTotals.get(category) || 0;
    categoryTotals.set(category, current + getValue(sub));
  });
  
  const topCategory = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])[0];

  // Calculate biggest payee (include all transactions)
  const payeeTotals = new Map<string, number>();
  activeSubscriptions.forEach(sub => {
    const current = payeeTotals.get(sub.name) || 0;
    payeeTotals.set(sub.name, current + getValue(sub));
  });
  
  const topPayee = Array.from(payeeTotals.entries())
    .sort((a, b) => b[1] - a[1])[0];

  // Recurring total (monthly equivalent)
  const recurringTotal = activeSubscriptions
    .filter(s => s.frequency !== 'one-off')
    .reduce((sum, sub) => sum + getMonthlyValue(sub, displayCurrency), 0);

  // One-off this month (with currency conversion)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const oneOffThisMonth = activeSubscriptions
    .filter(s => {
      if (s.frequency !== 'one-off') return false;
      const startDate = new Date(s.startDate);
      return startDate.getMonth() === currentMonth && 
             startDate.getFullYear() === currentYear;
    })
    .reduce((sum, sub) => sum + getValue(sub), 0);

  // Debug logging (remove after fixing)
  console.log('Dashboard Debug:', {
    total: activeSubscriptions.length,
    recurring: activeSubscriptions.filter(s => s.frequency !== 'one-off').length,
    oneOff: activeSubscriptions.filter(s => s.frequency === 'one-off').length,
    oneOffThisMonthCount: activeSubscriptions.filter(s => {
      if (s.frequency !== 'one-off') return false;
      const startDate = new Date(s.startDate);
      return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
    }).length,
    topCategory,
    topPayee,
    recurringTotal,
    oneOffThisMonth,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <DashboardCard
        icon={<Tag className="text-purple-600" size={20} />}
        iconBg="bg-purple-100"
        label="Top Category"
        value={topCategory ? topCategory[0] : 'N/A'}
        subValue={topCategory ? formatCurrency(topCategory[1], displayCurrency) : ''}
      />
      
      <DashboardCard
        icon={<TrendingUp className="text-red-600" size={20} />}
        iconBg="bg-red-100"
        label="Biggest Payee"
        value={topPayee ? (topPayee[0].length > 12 ? topPayee[0].slice(0, 12) + '...' : topPayee[0]) : 'N/A'}
        subValue={topPayee ? formatCurrency(topPayee[1], displayCurrency) : ''}
      />
      
      <DashboardCard
        icon={<Repeat className="text-blue-600" size={20} />}
        iconBg="bg-blue-100"
        label="Recurring"
        value={formatCurrency(recurringTotal, displayCurrency)}
        subValue="per month"
      />
      
      <DashboardCard
        icon={<CreditCard className="text-green-600" size={20} />}
        iconBg="bg-green-100"
        label="One-off"
        value={formatCurrency(oneOffThisMonth, displayCurrency)}
        subValue="this month"
      />
    </div>
  );
}

function DashboardCard({
  icon,
  iconBg,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`p-2 ${iconBg} rounded-lg flex-shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
          {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}
