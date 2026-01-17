import { useState, useEffect } from 'react';
import { Plus, Upload, DollarSign, Calendar, List, ArrowUpDown, LogOut } from 'lucide-react';
import { Subscription, CurrencyType, SortOption } from './types';
import { loadSubscriptions, addSubscription, updateSubscription, deleteSubscription, getSortPreference, setSortPreference } from './utils/storage';
import { getUpcomingPayments, formatCurrency } from './utils/dates';
import { convertCurrency, getDisplayCurrency, setDisplayCurrency } from './utils/currency';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionList from './components/SubscriptionList';
import UploadStatement from './components/UploadStatement';
import UpcomingPayments from './components/UpcomingPayments';
import ScreenshotModal from './components/ScreenshotModal';

type View = 'upcoming' | 'all';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyType>(getDisplayCurrency());
  const [sortOption, setSortOptionState] = useState<SortOption>(getSortPreference());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadSubscriptions();
    setSubscriptions(loaded);
    setLoading(false);
  };

  const handleCurrencyChange = (currency: CurrencyType) => {
    setDisplayCurrencyState(currency);
    setDisplayCurrency(currency);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOptionState(sort);
    setSortPreference(sort);
  };

  const getMonthlyValue = (subscription: Subscription): number => {
    let monthlyAmount = subscription.amount;
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
    }
    return convertCurrency(monthlyAmount, subscription.currency, displayCurrency);
  };

  const sortSubscriptions = (subs: Subscription[]): Subscription[] => {
    const sorted = [...subs];
    switch (sortOption) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'value-high':
        return sorted.sort((a, b) => getMonthlyValue(b) - getMonthlyValue(a));
      case 'value-low':
        return sorted.sort((a, b) => getMonthlyValue(a) - getMonthlyValue(b));
      default:
        return sorted;
    }
  };

  const handleAddSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const subscriptionData = {
      ...data,
      screenshot: uploadedScreenshot || data.screenshot
    };

    const newSubscription = await addSubscription(subscriptionData);

    if (newSubscription) {
      setSubscriptions([newSubscription, ...subscriptions]);
      setShowForm(false);
      setEditingSubscription(null);
      setUploadedScreenshot(null);
    }
  };

  const handleUpdateSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!editingSubscription) return;

    const updatedData = {
      ...data,
      screenshot: uploadedScreenshot || data.screenshot
    };

    const success = await updateSubscription(editingSubscription.id, updatedData);

    if (success) {
      const updated = subscriptions.map(sub =>
        sub.id === editingSubscription.id
          ? { ...sub, ...updatedData }
          : sub
      );
      setSubscriptions(updated);
      setShowForm(false);
      setEditingSubscription(null);
      setUploadedScreenshot(null);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    const success = await deleteSubscription(id);

    if (success) {
      const updated = subscriptions.filter(sub => sub.id !== id);
      setSubscriptions(updated);
    }
  };

  const handleToggleCancelled = async (id: string, cancelled: boolean) => {
    const success = await updateSubscription(id, {
      cancelled,
      cancelledDate: cancelled ? new Date().toISOString() : undefined
    });

    if (success) {
      const updated = subscriptions.map(sub =>
        sub.id === id
          ? {
              ...sub,
              cancelled,
              cancelledDate: cancelled ? new Date().toISOString() : undefined
            }
          : sub
      );
      setSubscriptions(updated);
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleUploadComplete = (screenshot: string) => {
    setUploadedScreenshot(screenshot);
    setShowUpload(false);
    setShowForm(true);
  };

  const activeSubscriptions = subscriptions.filter(sub => !sub.cancelled);
  const sortedSubscriptions = sortSubscriptions(subscriptions);
  const sortedUpcomingPayments = getUpcomingPayments(sortedSubscriptions);

  const totalMonthly = activeSubscriptions.reduce((total, sub) => {
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
    }

    const convertedAmount = convertCurrency(monthlyAmount, sub.currency, displayCurrency);
    return total + convertedAmount;
  }, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Subscription Tracker</h1>
              <p className="text-gray-600">Manage and track all your subscriptions in one place</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="displayCurrency" className="text-sm text-gray-600 whitespace-nowrap">
                  Display in:
                </label>
                <select
                  id="displayCurrency"
                  value={displayCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value as CurrencyType)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                >
                  <option value="HKD">HKD</option>
                  <option value="SGD">SGD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Monthly Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalMonthly, displayCurrency)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <List className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeSubscriptions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Due This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sortedUpcomingPayments.filter(p => p.daysUntil <= 7).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setView('upcoming')}
              className={`px-4 py-2 font-medium transition-colors ${
                view === 'upcoming'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming Payments
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                view === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Subscriptions
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} className="text-gray-600" />
            <label htmlFor="sortOption" className="text-sm text-gray-600 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sortOption"
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            >
              <option value="alphabetical">A-Z</option>
              <option value="value-high">Highest Value</option>
              <option value="value-low">Lowest Value</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading subscriptions...</div>
            </div>
          ) : view === 'upcoming' ? (
            <UpcomingPayments payments={sortedUpcomingPayments} />
          ) : (
            <SubscriptionList
              subscriptions={sortedSubscriptions}
              onEdit={handleEdit}
              onDelete={handleDeleteSubscription}
              onToggleCancelled={handleToggleCancelled}
              onViewScreenshot={setViewingScreenshot}
            />
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:relative md:shadow-none md:border-0 md:bg-transparent md:p-0">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium md:flex-none md:px-6"
            >
              <Upload size={20} />
              <span>Upload Statement</span>
            </button>
            <button
              onClick={() => {
                setEditingSubscription(null);
                setUploadedScreenshot(null);
                setShowForm(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium md:flex-none md:px-6"
            >
              <Plus size={20} />
              <span>Add Subscription</span>
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <SubscriptionForm
          onSubmit={editingSubscription ? handleUpdateSubscription : handleAddSubscription}
          onCancel={() => {
            setShowForm(false);
            setEditingSubscription(null);
            setUploadedScreenshot(null);
          }}
          initialData={editingSubscription || undefined}
        />
      )}

      {showUpload && (
        <UploadStatement
          onUpload={handleUploadComplete}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {viewingScreenshot && (
        <ScreenshotModal
          screenshot={viewingScreenshot}
          onClose={() => setViewingScreenshot(null)}
        />
      )}
    </div>
  );
}

export default App;
