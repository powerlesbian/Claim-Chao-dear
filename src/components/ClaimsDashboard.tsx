import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { formatCurrency } from '../utils/dates';

interface ExpenseStats {
  totalExpenses: number;
  totalUsers: number;
  totalMonthlyExpenditure: number;
  newExpensesLast30Days: number;
  byCategory: { category: string; count: number; totalAmount: number }[];
  byCurrency: { currency: string; count: number; totalAmount: number }[];
}

const DISPLAY_CURRENCY = 'HKD';

export default function ClaimsDashboard() {
  const [expenses, setExpenses] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (expenseError) throw expenseError;

      // Count non-admin users from user_roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .neq('role', 'admin');

      if (rolesError) throw rolesError;

      const totalUsers = userRolesData?.length || 0;

      setExpenses(expenseData || []);
      calculateStats(expenseData || [], totalUsers);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (expenses: Subscription[], totalUsers: number) => {
    // Calculate new expenses in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newExpensesLast30Days = expenses.filter(
      (exp) => new Date(exp.createdAt) > thirtyDaysAgo && !exp.cancelled
    ).length;

    const byCategory: { [key: string]: { count: number; totalAmount: number } } = {};
    const byCurrency: { [key: string]: { count: number; totalAmount: number } } = {};
    let totalMonthlyExpenditure = 0;

    // Only count non-cancelled expenses
    const activeExpenses = expenses.filter((exp) => !exp.cancelled);

    // First, collect ALL unique categories (even if they have 0 active expenses)
    const allCategories = new Set<string>();
    expenses.forEach((exp) => {
      const category = exp.category || 'Uncategorized';
      allCategories.add(category);
    });

    // Initialize all categories with 0 values
    allCategories.forEach((category) => {
      byCategory[category] = { count: 0, totalAmount: 0 };
    });

    // Then populate with active expenses only
    activeExpenses.forEach((exp) => {
      const monthlyAmount = getMonthlyAmount(exp.amount, exp.frequency);
      totalMonthlyExpenditure += monthlyAmount;

      const category = exp.category || 'Uncategorized';
      byCategory[category].count++;
      byCategory[category].totalAmount += monthlyAmount;

      if (!byCurrency[exp.currency]) {
        byCurrency[exp.currency] = { count: 0, totalAmount: 0 };
      }
      byCurrency[exp.currency].count++;
      byCurrency[exp.currency].totalAmount += monthlyAmount;
    });

    setStats({
      totalExpenses: activeExpenses.length,
      totalUsers,
      totalMonthlyExpenditure,
      newExpensesLast30Days,
      byCategory: Object.entries(byCategory)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      byCurrency: Object.entries(byCurrency)
        .map(([currency, data]) => ({ currency, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
    });
  };

  const getMonthlyAmount = (amount: number, frequency: string): number => {
    switch (frequency?.toLowerCase()) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * 4.33;
      case 'monthly':
        return amount;
      case 'yearly':
        return amount / 12;
      case 'one-off':
        return 0;
      default:
        return 0;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Expense Dashboard</h2>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  <span className="text-sm font-medium text-blue-900">Active Expenses</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.totalExpenses}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-green-600" size={20} />
                  <span className="text-sm font-medium text-green-900">Total Users</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.totalUsers}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-purple-600" size={20} />
                  <span className="text-sm font-medium text-purple-900">Monthly Expenditure</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(stats.totalMonthlyExpenditure, DISPLAY_CURRENCY)}
                </p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-orange-600" size={20} />
                  <span className="text-sm font-medium text-orange-900">New (30 days)</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.newExpensesLast30Days}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">By Category</h3>
                <div className="space-y-2">
                  {stats.byCategory.length > 0 ? (
                    stats.byCategory.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.category}</p>
                          <p className="text-sm text-gray-600">{item.count} expense{item.count !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(item.totalAmount, DISPLAY_CURRENCY)}/mo
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No expenses yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">By Currency</h3>
                <div className="space-y-2">
                  {stats.byCurrency.length > 0 ? (
                    stats.byCurrency.map((item) => (
                      <div
                        key={item.currency}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.currency}</p>
                          <p className="text-sm text-gray-600">{item.count} expense{item.count !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(item.totalAmount, item.currency as any)}/mo
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No expenses yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Expenses ({expenses.filter((e) => !e.cancelled).length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses
                .filter((e) => !e.cancelled)
                .slice(0, 50)
                .map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{expense.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {expense.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{expense.frequency}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(expense.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
