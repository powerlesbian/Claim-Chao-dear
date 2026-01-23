import { Subscription } from '../types';

const STORAGE_KEY = 'subscription-tracker-data';

export const saveSubscriptions = (subscriptions: Subscription[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
};

export const loadSubscriptions = (): Subscription[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const subscriptions = JSON.parse(data);
    return subscriptions.map((sub: any) => ({
      ...sub,
      currency: sub.currency || 'HKD'
    }));
  } catch {
    return [];
  }
};

export const addSubscription = (subscription: Subscription): void => {
  const subscriptions = loadSubscriptions();
  subscriptions.push(subscription);
  saveSubscriptions(subscriptions);
};

export const updateSubscription = (id: string, updates: Partial<Subscription>): void => {
  const subscriptions = loadSubscriptions();
  const index = subscriptions.findIndex(sub => sub.id === id);
  if (index !== -1) {
    subscriptions[index] = { ...subscriptions[index], ...updates };
    saveSubscriptions(subscriptions);
  }
};

export const deleteSubscription = (id: string): void => {
  const subscriptions = loadSubscriptions();
  const filtered = subscriptions.filter(sub => sub.id !== id);
  saveSubscriptions(filtered);
};
