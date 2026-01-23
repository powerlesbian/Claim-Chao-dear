import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { formatCurrency } from '../utils/dates';

interface ClaimStats {
  totalSubscriptions: number;
  totalUsers: number;
  totalMonthlyValue: number;
  byCategory: { category: string; count: number; totalAmount: number }[];
  byCurrency: { currency: string; count: number; totalAmount: number }[];
}

export default function ClaimsDashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<ClaimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllSubscriptions();
  }, []);

  const fetchAllSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubscriptions(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (subs: Subscription[]) => {
    const uniqueUsers = new Set(subs.map(sub => sub.user_id)).size;
    const activeSubs = subs.filter(sub => !sub.cancelled);

    const byCategory: { [key: string]: { count: number; totalAmount: number } } = {};
    const byCurrency: { [key: string]: { count: number; totalAmount: number } } = {};
    let totalMonthlyValue = 0;

    activeSubs.forEach(sub => {
      const monthlyAmount = getMonthlyAmount(sub.amount, sub.frequency);
      totalMonthlyValue += monthlyAmount;

      if (!byCategory[sub.category]) {
        byCategory[sub.category] = { count: 0, totalAmount: 0 };
      }
      byCategory[sub.category].count++;
      byCategory[sub.category].totalAmount += monthlyAmount;

      if (!byCurrency[sub.currency]) {
        byCurrency[sub.currency] = { count: 0, totalAmount: 0 };
      }
      byCurrency[sub.currency].count++;
      byCurrency[sub.currency].totalAmount += monthlyAmount;
    });

    setStats({
      totalSubscriptions: subs.length,
      totalUsers: uniqueUsers,
      totalMonthlyValue,
      byCategory: Object.entries(byCategory)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      byCurrency: Object.entries(byCurrency)
        .map(([currency, data]) => ({ currency, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
    });
  };

  const getMonthlyAmount = (amount: number, frequency: string): number => {
    switch (frequency) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * 4;
      case 'monthly':
        return amount;
      case 'yearly':
        return amount / 12;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">Loading claims dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Claims Dashboard</h2>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  <span className="text-sm font-medium text-blue-900">Total Claims</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.totalSubscriptions}</p>
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
                  <span className="text-sm font-medium text-purple-900">Monthly Value</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(stats.totalMonthlyValue, 'USD')}
                </p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-orange-600" size={20} />
                  <span className="text-sm font-medium text-orange-900">Active Claims</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {subscriptions.filter(s => !s.cancelled).length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">By Category</h3>
                <div className="space-y-2">
                  {stats.byCategory.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.category}</p>
                        <p className="text-sm text-gray-600">{item.count} claims</p>
                      </div>
                      <p className="font-bold text-gray-900">
                        {formatCurrency(item.totalAmount, 'USD')}/mo
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">By Currency</h3>
                <div className="space-y-2">
                  {stats.byCurrency.map((item) => (
                    <div
                      key={item.currency}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.currency}</p>
                        <p className="text-sm text-gray-600">{item.count} claims</p>
                      </div>
                      <p className="font-bold text-gray-900">
                        {formatCurrency(item.totalAmount, item.currency as any)}/mo
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Claims ({subscriptions.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.slice(0, 50).map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {sub.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatCurrency(sub.amount, sub.currency)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{sub.frequency}</td>
                  <td className="px-4 py-3">
                    {sub.cancelled ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(sub.createdAt).toLocaleDateString()}
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
