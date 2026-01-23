import { Subscription, SortOption } from '../types';
import { supabase } from '../lib/supabase';

const SORT_KEY = 'subscription-tracker-sort';

interface DbSubscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  start_date: string;
  frequency: string;
  cancelled: boolean;
  cancelled_date: string | null;
  notes: string | null;
  screenshot: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToSubscription = (db: DbSubscription): Subscription => ({
  id: db.id,
  name: db.name,
  amount: db.amount,
  currency: db.currency as any,
  startDate: db.start_date,
  frequency: db.frequency as any,
  cancelled: db.cancelled,
  cancelledDate: db.cancelled_date || undefined,
  notes: db.notes || undefined,
  screenshot: db.screenshot || undefined,
  createdAt: db.created_at,
});

const mapSubscriptionToDb = (sub: Omit<Subscription, 'id' | 'createdAt'> & { id?: string }) => ({
  name: sub.name,
  amount: sub.amount,
  currency: sub.currency,
  start_date: sub.startDate,
  frequency: sub.frequency,
  cancelled: sub.cancelled,
  cancelled_date: sub.cancelledDate || null,
  notes: sub.notes || null,
  screenshot: sub.screenshot || null,
});

export const loadSubscriptions = async (): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading subscriptions:', error);
    return [];
  }

  return (data || []).map(mapDbToSubscription);
};

export const addSubscription = async (subscription: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription | null> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      ...mapSubscriptionToDb(subscription),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding subscription:', error);
    return null;
  }

  return mapDbToSubscription(data);
};

export const updateSubscription = async (id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>): Promise<boolean> => {
  const { error } = await supabase
    .from('subscriptions')
    .update(mapSubscriptionToDb({ ...updates, id } as any))
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription:', error);
    return false;
  }

  return true;
};

export const deleteSubscription = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting subscription:', error);
    return false;
  }

  return true;
};

export const getSortPreference = (): SortOption => {
  const stored = localStorage.getItem(SORT_KEY);
  if (stored && (stored === 'alphabetical' || stored === 'value-high' || stored === 'value-low')) {
    return stored as SortOption;
  }
  return 'alphabetical';
};

export const setSortPreference = (sort: SortOption): void => {
  localStorage.setItem(SORT_KEY, sort);
};

export const addSubscriptions = async (subscriptions: Omit<Subscription, 'id' | 'createdAt'>[]): Promise<Subscription[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user');
    return [];
  }

  const subscriptionsToInsert = subscriptions.map(sub => ({
    ...mapSubscriptionToDb(sub),
    user_id: user.id,
  }));

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscriptionsToInsert)
    .select();

  if (error) {
    console.error('Error adding subscriptions:', error);
    return [];
  }

  return (data || []).map(mapDbToSubscription);
};
