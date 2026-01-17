import { FrequencyType, Subscription, UpcomingPayment } from '../types';

export const calculateNextPaymentDate = (startDate: string, frequency: FrequencyType): Date => {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(start);

  while (next < today) {
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  }

  return next;
};

export const getDaysUntil = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getUpcomingPayments = (subscriptions: Subscription[]): UpcomingPayment[] => {
  const activeSubscriptions = subscriptions.filter(sub => !sub.cancelled);

  return activeSubscriptions
    .map(subscription => {
      const nextPaymentDate = calculateNextPaymentDate(subscription.startDate, subscription.frequency);
      const daysUntil = getDaysUntil(nextPaymentDate);

      return {
        subscription,
        nextPaymentDate,
        daysUntil
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatCurrency = (amount: number, currency: 'HKD' | 'SGD' | 'USD' = 'HKD'): string => {
  const localeMap = {
    HKD: 'en-HK',
    SGD: 'en-SG',
    USD: 'en-US'
  };

  return new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency
  }).format(amount);
};
