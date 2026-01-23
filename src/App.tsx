import { useState, useEffect } from 'react';
import { Plus, Upload, DollarSign, Calendar, List } from 'lucide-react';
import { Subscription, CurrencyType } from './types';
import { loadSubscriptions, saveSubscriptions, updateSubscription, deleteSubscription } from './utils/storage';
import { getUpcomingPayments, formatCurrency } from './utils/dates';
import { convertCurrency, getDisplayCurrency, setDisplayCurrency } from './utils/currency';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionList from './components/SubscriptionList';
import UploadStatement from './components/UploadStatement';
import UpcomingPayments from './components/UpcomingPayments';
import ScreenshotModal from './components/ScreenshotModal';

type View = 'upcoming' | 'all';

function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [view, setView] = useState<View>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyType>(getDisplayCurrency());

  useEffect(() => {
    const loaded = loadSubscriptions();
    setSubscriptions(loaded);
  }, []);

  const handleCurrencyChange = (currency: CurrencyType) => {
    setDisplayCurrencyState(currency);
    setDisplayCurrency(currency);
  };

  const handleAddSubscription = (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSubscription: Subscription = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      screenshot: uploadedScreenshot || data.screenshot
    };

    const updated = [...subscriptions, newSubscription];
    setSubscriptions(updated);
    saveSubscriptions(updated);
    setShowForm(false);
    setEditingSubscription(null);
    setUploadedScreenshot(null);
  };

  const handleUpdateSubscription = (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!editingSubscription) return;

    const updated = subscriptions.map(sub =>
      sub.id === editingSubscription.id
        ? { ...sub, ...data, screenshot: uploadedScreenshot || data.screenshot }
        : sub
    );

    setSubscriptions(updated);
    saveSubscriptions(updated);
    updateSubscription(editingSubscription.id, data);
    setShowForm(false);
    setEditingSubscription(null);
    setUploadedScreenshot(null);
  };

  const handleDeleteSubscription = (id: string) => {
    const updated = subscriptions.filter(sub => sub.id !== id);
    setSubscriptions(updated);
    deleteSubscription(id);
  };

  const handleToggleCancelled = (id: string, cancelled: boolean) => {
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
    saveSubscriptions(updated);
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
  const upcomingPayments = getUpcomingPayments(subscriptions);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Subscription Tracker</h1>
              <p className="text-gray-600">Manage and track all your subscriptions in one place</p>
            </div>
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
                  {upcomingPayments.filter(p => p.daysUntil <= 7).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
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

        <div className="mb-6">
          {view === 'upcoming' ? (
            <UpcomingPayments payments={upcomingPayments} />
          ) : (
            <SubscriptionList
              subscriptions={subscriptions}
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
