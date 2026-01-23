export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CurrencyType = 'HKD' | 'SGD' | 'USD';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyType;
  startDate: string;
  frequency: FrequencyType;
  cancelled: boolean;
  cancelledDate?: string;
  notes?: string;
  screenshot?: string;
  createdAt: string;
}

export interface UpcomingPayment {
  subscription: Subscription;
  nextPaymentDate: Date;
  daysUntil: number;
}
