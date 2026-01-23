import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, DollarSign, TrendingUp, Calendar, Search, Trash2, Eye } from 'lucide-react';
import { formatCurrency, calculateNextPaymentDate } from '../utils/dates';
import ScreenshotModal from './ScreenshotModal';

interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  start_date: string;
  frequency: string;
  cancelled: boolean;
  cancelled_date?: string;
  notes?: string;
  screenshot?: string;
  created_at: string;
  updated_at: string;
}

interface UserWithSubscriptions {
  profile: Profile;
  subscriptions: Subscription[];
  totalMonthly: number;
  activeCount: number;
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserWithSubscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubscriptions: 0,
    totalMonthlyRevenue: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [profilesResult, subscriptionsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      const profiles = profilesResult.data || [];
      const subscriptions = subscriptionsResult.data || [];

      const usersWithSubs: UserWithSubscriptions[] = profiles.map(profile => {
        const userSubs = subscriptions.filter(sub => sub.user_id === profile.id);
        const activeSubs = userSubs.filter(sub => !sub.cancelled);

        const totalMonthly = activeSubs.reduce((sum, sub) => {
          let monthlyAmount = sub.amount;
          switch (sub.frequency) {
            case 'daily':
              monthlyAmount = sub.amount * 30;
              break;
            case 'weekly':
              monthlyAmount = sub.amount * 4;
              break;
            case 'yearly':
              monthlyAmount = sub.amount / 12;
              break;
            case 'one-off':
              monthlyAmount = 0;
              break;
          }
          return sum + monthlyAmount;
        }, 0);

        return {
          profile,
          subscriptions: userSubs,
          totalMonthly,
          activeCount: activeSubs.length,
        };
      });

      setUsers(usersWithSubs);

      const totalMonthly = usersWithSubs.reduce((sum, user) => sum + user.totalMonthly, 0);
      const activeCount = subscriptions.filter(sub => !sub.cancelled).length;

      setStats({
        totalUsers: profiles.length,
        totalSubscriptions: subscriptions.length,
        totalMonthlyRevenue: totalMonthly,
        activeSubscriptions: activeCount,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
      await loadAdminData();
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.subscriptions.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all users and subscriptions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubscriptions}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalMonthlyRevenue, 'HKD')}
                </p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by email or subscription name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {filteredUsers.map(user => (
            <div key={user.profile.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div
                className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 cursor-pointer hover:from-blue-100 hover:to-blue-200 transition-colors"
                onClick={() => setSelectedUser(selectedUser === user.profile.id ? null : user.profile.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 rounded-full p-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.profile.email}</h3>
                      <p className="text-sm text-gray-600">
                        {user.activeCount} active subscription{user.activeCount !== 1 ? 's' : ''} •
                        {formatCurrency(user.totalMonthly, 'HKD')}/month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{user.subscriptions.length}</p>
                    <p className="text-sm text-gray-600">Total Subs</p>
                  </div>
                </div>
              </div>

              {selectedUser === user.profile.id && user.subscriptions.length > 0 && (
                <div className="p-6 border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Frequency
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Payment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.subscriptions.map(sub => {
                          const nextPayment = !sub.cancelled ? calculateNextPaymentDate(sub.start_date, sub.frequency) : null;
                          return (
                            <tr key={sub.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{sub.name}</div>
                                {sub.notes && (
                                  <div className="text-xs text-gray-500">{sub.notes}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(sub.amount, sub.currency)}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 capitalize">{sub.frequency}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {nextPayment ? (
                                  <div className="text-sm text-gray-900">
                                    {nextPayment.toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {sub.cancelled ? (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Cancelled
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  {sub.screenshot && (
                                    <button
                                      onClick={() => setScreenshotUrl(sub.screenshot!)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="View Screenshot"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteSubscription(sub.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedUser === user.profile.id && user.subscriptions.length === 0 && (
                <div className="p-6 border-t border-gray-200 text-center text-gray-500">
                  No subscriptions yet
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found matching your search</p>
          </div>
        )}
      </div>

      {screenshotUrl && (
        <ScreenshotModal
          screenshot={screenshotUrl}
          onClose={() => setScreenshotUrl(null)}
        />
      )}
    </div>
  );
}
