import { Calendar, Bell } from 'lucide-react';
import { UpcomingPayment } from '../types';
import { formatCurrency, formatDate } from '../utils/dates';

interface UpcomingPaymentsProps {
  payments: UpcomingPayment[];
}

export default function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-500">No upcoming payments</p>
        <p className="text-gray-400 text-sm mt-1">Add active subscriptions to see reminders</p>
      </div>
    );
  }

  const today = payments.filter(p => p.daysUntil === 0);
  const upcoming = payments.filter(p => p.daysUntil > 0 && p.daysUntil <= 7);
  const later = payments.filter(p => p.daysUntil > 7);

  return (
    <div className="space-y-4">
      {today.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="text-red-600" size={20} />
            <h4 className="font-semibold text-red-900">Due Today</h4>
          </div>
          <div className="space-y-2">
            {today.map(payment => (
              <PaymentCard key={payment.subscription.id} payment={payment} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-orange-600" size={20} />
            <h4 className="font-semibold text-orange-900">This Week</h4>
          </div>
          <div className="space-y-2">
            {upcoming.map(payment => (
              <PaymentCard key={payment.subscription.id} payment={payment} />
            ))}
          </div>
        </div>
      )}

      {later.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-gray-600" size={20} />
            <h4 className="font-semibold text-gray-900">Later</h4>
          </div>
          <div className="space-y-2">
            {later.slice(0, 5).map(payment => (
              <PaymentCard key={payment.subscription.id} payment={payment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentCard({ payment }: { payment: UpcomingPayment }) {
  const getDaysText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{payment.subscription.name}</p>
        <p className="text-sm text-gray-600">{formatDate(payment.nextPaymentDate)}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">{formatCurrency(payment.subscription.amount, payment.subscription.currency)}</p>
        <p className="text-sm text-gray-600">{getDaysText(payment.daysUntil)}</p>
      </div>
    </div>
  );
}
