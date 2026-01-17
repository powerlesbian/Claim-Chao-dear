import { useState, useEffect } from 'react';
import { Plus, Upload, DollarSign, Calendar, List, ArrowUpDown, LogOut, FileUp, HelpCircle } from 'lucide-react';
import { Subscription, CurrencyType, SortOption } from './types';
import { loadSubscriptions, addSubscription, addSubscriptions, updateSubscription, deleteSubscription, getSortPreference, setSortPreference } from './utils/storage';
import { getUpcomingPayments, formatCurrency } from './utils/dates';
import { convertCurrency, getDisplayCurrency, setDisplayCurrency } from './utils/currency';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionList from './components/SubscriptionList';
import UploadStatement from './components/UploadStatement';
import UpcomingPayments from './components/UpcomingPayments';
import ScreenshotModal from './components/ScreenshotModal';
import CSVImport from './components/CSVImport';

type View = 'upcoming' | 'all';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyType>(getDisplayCurrency());
  const [sortOption, setSortOptionState] = useState<SortOption>(getSortPreference());
  const [showFAQ, setShowFAQ] = useState(false);

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

  const handleCSVImport = async (importedSubscriptions: Omit<Subscription, 'id' | 'createdAt'>[]) => {
    const newSubscriptions = await addSubscriptions(importedSubscriptions);

    if (newSubscriptions.length > 0) {
      setSubscriptions([...newSubscriptions, ...subscriptions]);
      setShowCSVImport(false);
    }
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
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Claim Chao-dear</h1>
              <p className="text-gray-600">Track your subscriptions and claims to fix leaks from the taps</p>
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
          <div className="max-w-4xl mx-auto flex gap-3 flex-wrap">
            <button
              onClick={() => setShowUpload(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium md:flex-none md:px-6"
            >
              <Upload size={20} />
              <span className="hidden sm:inline">Upload Statement</span>
              <span className="sm:hidden">Statement</span>
            </button>
            <button
              onClick={() => setShowCSVImport(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium md:flex-none md:px-6"
            >
              <FileUp size={20} />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">CSV</span>
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
              <span className="hidden sm:inline">Add Subscription</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="mt-8 mb-20 md:mb-8">
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            <HelpCircle size={20} />
            <span>{showFAQ ? 'Hide FAQ' : 'Show FAQ'}</span>
          </button>

          {showFAQ && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What can I track with this app?</h3>
                <p className="text-sm text-gray-700">
                  Track all your recurring subscriptions including streaming services, software licenses, memberships, and any other recurring payments. View upcoming payments and manage your subscription costs across different currencies.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What currencies are supported?</h3>
                <p className="text-sm text-gray-700">
                  Currently supports HKD (Hong Kong Dollar), SGD (Singapore Dollar), and USD (US Dollar). You can set a primary display currency to see total costs converted. Exchange rates: 1 USD = 7.8 HKD = 1.35 SGD.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I import subscriptions via CSV?</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Click the "Import CSV" button. Your CSV file must have these columns in this exact order:
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                  Name,Amount,Currency,Frequency,Start Date,Next Payment
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Example:</strong>
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                  Netflix,119.00,HKD,Monthly,2026-01-01,2026-02-01
                </div>
                <ul className="text-sm text-gray-700 mt-2 space-y-1">
                  <li><strong>Frequency:</strong> Daily, Weekly, Monthly, or Yearly (case-insensitive)</li>
                  <li><strong>Currency:</strong> HKD, SGD, or USD</li>
                  <li><strong>Dates:</strong> Format as YYYY-MM-DD</li>
                  <li><strong>Note:</strong> The "Next Payment" column is required in the CSV but the app calculates payment dates automatically based on start date and frequency</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How are payment dates calculated?</h3>
                <p className="text-sm text-gray-700">
                  The app automatically calculates your next payment date based on the subscription's start date and billing frequency. You don't need to manually update payment dates.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I upload bank statements?</h3>
                <p className="text-sm text-gray-700">
                  Yes, use the "Upload Statement" button to upload a screenshot or photo of your bank/credit card statement. The app stores the image with your subscription for reference.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-sm text-gray-700">
                  Yes, all data is stored securely in a database with row-level security. Only you can access your subscription data. Your password is encrypted and never stored in plain text.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What are the app's limitations?</h3>
                <p className="text-sm text-gray-700">
                  Currently, the app:
                </p>
                <ul className="text-sm text-gray-700 mt-1 list-disc list-inside space-y-1">
                  <li>Supports 3 currencies only (HKD, SGD, USD)</li>
                  <li>Uses fixed exchange rates for conversions</li>
                  <li>Stores screenshots as base64 data (may impact performance with many large images)</li>
                  <li>Does not send payment reminders or notifications</li>
                  <li>Cannot automatically sync with your bank accounts</li>
                </ul>
              </div>
            </div>
          )}
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

      {showCSVImport && (
        <CSVImport
          onImport={handleCSVImport}
          onCancel={() => setShowCSVImport(false)}
        />
      )}
    </div>
  );
}

export default App;
