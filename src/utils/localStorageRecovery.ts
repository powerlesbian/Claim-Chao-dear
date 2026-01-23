import { Subscription } from '../types';

const STORAGE_KEY = 'subscription-tracker-data';

interface LegacySubscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  startDate: string;
  frequency: string;
  cancelled: boolean;
  cancelledDate?: string;
  notes?: string;
  screenshot?: string;
  createdAt: string;
}

export const checkLocalStorageData = (): boolean => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return !!data;
  } catch (error) {
    console.error('Error checking localStorage:', error);
    return false;
  }
};

export const getLocalStorageSubscriptions = (): Subscription[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data) as LegacySubscription[];
    return parsed;
  } catch (error) {
    console.error('Error reading localStorage:', error);
    return [];
  }
};

export const clearLocalStorageData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export const getLocalStorageDataSize = (): string => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return '0 KB';

    const bytes = new Blob([data]).size;
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch (error) {
    console.error('Error calculating data size:', error);
    return 'Unknown';
  }
};
