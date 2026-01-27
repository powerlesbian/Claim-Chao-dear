import { useState, useEffect, useCallback } from 'react';
import { Subscription } from '../types';
import {
  loadSubscriptions,
  addSubscription,
  addSubscriptions,
  updateSubscription,
  deleteSubscription,
} from '../utils/storage';
import { checkLocalStorageData } from '../utils/localStorageRecovery';

interface UseSubscriptionsReturn {
  subscriptions: Subscription[];
  loading: boolean;
  hasLocalData: boolean;
  addOne: (data: Omit<Subscription, 'id' | 'createdAt'>) => Promise<Subscription | null>;
  addMany: (data: Omit<Subscription, 'id' | 'createdAt'>[]) => Promise<Subscription[]>;
  update: (id: string, data: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  toggleCancelled: (id: string, cancelled: boolean) => Promise<boolean>;
  reload: () => Promise<void>;
  setHasLocalData: (value: boolean) => void;
}

export const useSubscriptions = (userId: string | undefined): UseSubscriptionsReturn => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const loaded = await loadSubscriptions();
    setSubscriptions(loaded);
    setLoading(false);

    // Auto-detect if we should show recovery modal
    if (loaded.length === 0 && checkLocalStorageData()) {
      setHasLocalData(true);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      reload();
      setHasLocalData(checkLocalStorageData());
    }
  }, [userId, reload]);

  const addOne = useCallback(
    async (data: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription | null> => {
      const newSubscription = await addSubscription(data);
      if (newSubscription) {
        setSubscriptions((prev) => [newSubscription, ...prev]);
      }
      return newSubscription;
    },
    []
  );

  const addMany = useCallback(
    async (data: Omit<Subscription, 'id' | 'createdAt'>[]): Promise<Subscription[]> => {
      const newSubscriptions = await addSubscriptions(data);
      if (newSubscriptions.length > 0) {
        setSubscriptions((prev) => [...newSubscriptions, ...prev]);
      }
      return newSubscriptions;
    },
    []
  );

  const update = useCallback(
    async (
      id: string,
      data: Partial<Omit<Subscription, 'id' | 'createdAt'>>
    ): Promise<boolean> => {
      const success = await updateSubscription(id, data);
      if (success) {
        setSubscriptions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, ...data } : sub))
        );
      }
      return success;
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteSubscription(id);
    if (success) {
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
    }
    return success;
  }, []);

  const toggleCancelled = useCallback(
    async (id: string, cancelled: boolean): Promise<boolean> => {
      const updates = {
        cancelled,
        cancelledDate: cancelled ? new Date().toISOString() : undefined,
      };
      const success = await updateSubscription(id, updates);
      if (success) {
        setSubscriptions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
        );
      }
      return success;
    },
    []
  );

  return {
    subscriptions,
    loading,
    hasLocalData,
    addOne,
    addMany,
    update,
    remove,
    toggleCancelled,
    reload,
    setHasLocalData,
  };
};
