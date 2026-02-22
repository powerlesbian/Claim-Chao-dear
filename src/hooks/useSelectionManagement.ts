import { useMemo } from 'react';
import { Subscription, CurrencyType } from '../types';
import { convertCurrency } from '../utils/currency';

export function useSelectionManagement(
  subscriptions: Subscription[],
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
  displayCurrency: CurrencyType
) {
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === subscriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subscriptions.map(s => s.id)));
    }
  };

  const selectedTotal = useMemo(() => {
    return subscriptions
      .filter(s => selectedIds.has(s.id))
      .reduce((sum, s) => sum + convertCurrency(s.amount, s.currency, displayCurrency), 0);
  }, [subscriptions, selectedIds, displayCurrency]);

  return {
    handleToggleSelect,
    handleSelectAll,
    selectedTotal,
  };
}
