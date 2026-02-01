import { Subscription, CurrencyType } from '../types';
import { convertCurrency } from './currency';

/**
 * Calculate the monthly equivalent value of a subscription
 */
export const getMonthlyValue = (
  subscription: Subscription,
  displayCurrency: CurrencyType
): number => {
  let monthlyAmount: number;

  switch (subscription.frequency) {
    case 'daily':
      monthlyAmount = subscription.amount * 30;
      break;
    case 'weekly':
      monthlyAmount = subscription.amount * 4;
      break;
    case 'yearly':
      monthlyAmount = subscription.amount / 12;
      break;
    case 'one-off':
      // Count one-off subscriptions at their full amount, regardless of month
      monthlyAmount = subscription.amount;
      break;
    case 'monthly':
    default:
      monthlyAmount = subscription.amount;
  }

  return convertCurrency(monthlyAmount, subscription.currency, displayCurrency);
};

/**
 * Calculate total monthly cost of all active subscriptions
 */
export const calculateTotalMonthly = (
  subscriptions: Subscription[],
  displayCurrency: CurrencyType
): number => {
  const activeSubscriptions = subscriptions.filter((sub) => !sub.cancelled);
  
  return activeSubscriptions.reduce((total, sub) => {
    return total + getMonthlyValue(sub, displayCurrency);
  }, 0);
};
