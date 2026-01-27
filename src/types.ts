export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-off';
export type CurrencyType = 'HKD' | 'SGD' | 'USD';
export type SortOption = 'alphabetical' | 'value-high' | 'value-low' | 'recent';
export type UserRole = 'admin' | 'user';

// Predefined tags
export const DEFAULT_TAGS = ['Personal', 'Business'] as const;

export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
}

export interface UserRoleData {
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: CurrencyType;
  startDate: string;
  frequency: FrequencyType;
  category: string;
  tags: string[];  // NEW
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
