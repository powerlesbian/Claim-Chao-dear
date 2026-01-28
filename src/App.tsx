import { useState, useMemo } from 'react';
import { Plus, Upload, LogOut, FileUp, Search, Download, Shield, Database, ArrowUpDown, Settings, Users } from 'lucide-react';
import { Subscription, CurrencyType, SortOption, DEFAULT_TAGS } from './types';
import { getSortPreference, setSortPreference } from './utils/storage';
import { formatCurrency } from './utils/dates';
import { getUpcomingPayments } from './utils/dates';
import { getDisplayCurrency, setDisplayCurrency } from './utils/currency';
import { convertCurrency } from './utils/currency';
import { calculateTotalMonthly } from './utils/calculations';
import { detectDuplicates } from './utils/duplicateDetection';
import { filterSubscriptions, sortSubscriptions } from './utils/filters';
import { exportToCSV } from './utils/csv';
import { useAuth } from './contexts/AuthContext';
import { useSubscriptions } from './hooks/useSubscriptions';
import Toast from './components/Toast';
import Auth from './components/Auth';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionList from './components/SubscriptionList';
import UploadStatement from './components/UploadStatement';
import UpcomingPayments from './components/UpcomingPayments';
import ScreenshotModal from './components/ScreenshotModal';
import CSVImport from './components/CSVImport';
import LocalStorageRecovery from './components/LocalStorageRecovery';
import { AdminPanel } from './components/AdminPanel';
import StatsCards from './components/StatsCards';
import DashboardCards from './components/DashboardCards';
import TagFilter from './components/TagFilter';
import FAQ from './components/FAQ';
import SettingsModal from './components/SettingsModal';
import { supabase } from './lib/supabase';
import { useTeam } from './contexts/TeamContext';
import TeamSettings from './components/TeamSettings';


type View = 'upcoming' | 'all' | 'admin';

function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const {
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
  } = useSubscriptions(user?.id);
  const { currentTeam, teams } = useTeam();

  // UI State
  const [view, setView] = useState<View>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
// Tag filtering state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
//team settings modal
const [showTeamSettings, setShowTeamSettings] = useState(false);

  // Preferences
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyType>(getDisplayCurrency());
  const [sortOption, setSortOptionState] = useState<SortOption>(getSortPreference());
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all available tags from subscriptions + defaults + custom
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>(DEFAULT_TAGS);
    subscriptions.forEach((sub) => {
      sub.tags?.forEach((tag) => tagsSet.add(tag));
    });
    customTags.forEach((tag) => tagsSet.add(tag));
    return Array.from(tagsSet).sort();
  }, [subscriptions, customTags]);

  // Handlers
  // Add toggle handler
const handleToggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

  const handleCurrencyChange = (currency: CurrencyType) => {
    setDisplayCurrencyState(currency);
    setDisplayCurrency(currency);
  };
  const handleAddTag = (tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag]);
    }
  };
const handleTagDelete = async (tag: string) => {
  // Remove from custom tags
  setCustomTags(customTags.filter(t => t !== tag));
  
  // Remove from selected tags
  setSelectedTags(selectedTags.filter(t => t !== tag));
  
  // Find all subscriptions with this tag and update them
  const subsWithTag = subscriptions.filter(s => s.tags?.includes(tag));
  
  for (const sub of subsWithTag) {
    const newTags = sub.tags?.filter(t => t !== tag) || [];
    // Ensure at least one tag remains
    const finalTags = newTags.length > 0 ? newTags : ['Personal'];
    
    await supabase
      .from('subscriptions')
      .update({ tags: finalTags })
      .eq('id', sub.id);
  }
  
  // Refresh subscriptions without page reload
  await reload();
};

const handleTagRename = async (oldTag: string, newTag: string) => {
  // Update custom tags
  setCustomTags(customTags.map(t => t === oldTag ? newTag : t));
  
  // Update selected tags
  setSelectedTags(selectedTags.map(t => t === oldTag ? newTag : t));
  
  // Find all subscriptions with this tag and update them
  const subsWithTag = subscriptions.filter(s => s.tags?.includes(oldTag));
  
  for (const sub of subsWithTag) {
    const newTags = sub.tags?.map(t => t === oldTag ? newTag : t) || [newTag];
    
    await supabase
      .from('subscriptions')
      .update({ tags: newTags })
      .eq('id', sub.id);
  }
  // Refresh subscriptions without page reload
  await reload();
};

  const handleSortChange = (sort: SortOption) => {
    setSortOptionState(sort);
    setSortPreference(sort);
  };

  const handleAddSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const subscriptionData = {
      ...data,
      screenshot: uploadedScreenshot || data.screenshot,
    };
    const result = await addOne(subscriptionData);
    if (result) {
      setShowForm(false);
      setEditingSubscription(null);
      setUploadedScreenshot(null);
    }
  };

  const handleUpdateSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!editingSubscription) return;
    const updatedData = {
      ...data,
      screenshot: uploadedScreenshot || data.screenshot,
    };
    const success = await update(editingSubscription.id, updatedData);
    if (success) {
      setShowForm(false);
      setEditingSubscription(null);
      setUploadedScreenshot(null);
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

  const handleCSVImport = async (imported: Omit<Subscription, 'id' | 'createdAt'>[]) => {
    const result = await addMany(imported);
    if (result.length > 0) {
      setShowCSVImport(false);
      setToast(`Imported ${result.length} transaction${result.length > 1 ? 's' : ''}! View in "All Payments" tab.`);
    }
  };

  const handleRecovery = async (recovered: Omit<Subscription, 'id' | 'createdAt'>[]) => {
    const result = await addMany(recovered);
    if (result.length > 0) {
      setShowRecovery(false);
      setHasLocalData(false);
    }
  };

  // Filter subscriptions by selected tags
  // Calculate selected total (add near other useMemo calculations)
const selectedTotal = useMemo(() => {
  return subscriptions
    .filter(s => selectedIds.has(s.id))
    .reduce((sum, s) => sum + convertCurrency(s.amount, s.currency, displayCurrency), 0);
}, [subscriptions, selectedIds, displayCurrency]);
  const tagFilteredSubscriptions = useMemo(() => {
    if (selectedTags.length === 0) {
      return subscriptions; // No filter = show all
    }
    return subscriptions.filter((sub) => {
      const subTags = sub.tags || ['Personal'];
      return subTags.some((tag) => selectedTags.includes(tag));
    });
  }, [subscriptions, selectedTags]);

  // Computed values (now based on tag-filtered subscriptions)
  const activeSubscriptions = tagFilteredSubscriptions.filter((sub) => !sub.cancelled);
  const filteredSubscriptions = filterSubscriptions(tagFilteredSubscriptions, searchQuery);
  const sortedSubscriptions = sortSubscriptions(filteredSubscriptions, sortOption, displayCurrency);
  const upcomingPayments = getUpcomingPayments(sortedSubscriptions);
  const duplicateIds = detectDuplicates(tagFilteredSubscriptions, displayCurrency);
  const totalMonthly = calculateTotalMonthly(tagFilteredSubscriptions, displayCurrency);

  // Loading states
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

  if (view === 'admin' && isAdmin) {
    return (
      <div>
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setView('upcoming')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to App
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <AdminPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Claim Chowder</h1>
              <p className="text-gray-600">Track your payments and claims to fix leaks from the taps</p>
            </div>
            <div className="flex items-center gap-3">
              <CurrencySelect value={displayCurrency} onChange={handleCurrencyChange} />
              {isAdmin && (
                <button
                  onClick={() => setView('admin')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={18} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
              <button
                onClick={() => setShowTeamSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Team Settings"
              >
                <Users size={18} />
                <span className="hidden sm:inline text-sm">{currentTeam?.name || 'Personal'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tag Filter */}
        <TagFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          onAddTag={handleAddTag}
        />

        {/* Stats */}
        <StatsCards
          totalMonthly={totalMonthly}
          activeCount={activeSubscriptions.length}
          dueThisWeek={upcomingPayments.filter((p) => p.daysUntil <= 7).length}
          displayCurrency={displayCurrency}
        />

        {/* Dashboard Cards */}
        <DashboardCards
          subscriptions={tagFilteredSubscriptions}
          displayCurrency={displayCurrency}
        />

        {/* Local Data Recovery Banner */}
        {hasLocalData && (
          <LocalDataBanner onRecover={() => setShowRecovery(true)} />
        )}

        {/* View Tabs & Sort */}
        <ViewControls
          view={view}
          setView={setView}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onExport={() => exportToCSV(subscriptions)}
        />

        {/* Content */}
        <div className="mb-6">
          {duplicateIds.size > 0 && view === 'all' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Potential duplicates detected!</strong> {duplicateIds.size} payment(s) highlighted in yellow may be duplicates.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading payments...</div>
            </div>
          ) : view === 'upcoming' ? (
            <UpcomingPayments payments={upcomingPayments} />
          ) : (
            <SubscriptionList
              subscriptions={sortedSubscriptions}
              duplicateIds={duplicateIds}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onEdit={handleEdit}
              onDelete={remove}
              onToggleCancelled={toggleCancelled}
              onViewScreenshot={setViewingScreenshot}
            />
          )}
        </div>

        {/* Action Buttons */}
        <ActionBar
          onUpload={() => setShowUpload(true)}
          onCSVImport={() => setShowCSVImport(true)}
          onAdd={() => {
            setEditingSubscription(null);
            setUploadedScreenshot(null);
            setShowForm(true);
          }}
        />

        {/* FAQ */}
        <FAQ isVisible={showFAQ} onToggle={() => setShowFAQ(!showFAQ)} />
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          availableTags={availableTags}
          onTagDelete={handleTagDelete}
          onTagRename={handleTagRename}
          onTagAdd={handleAddTag}
        />
      )}
      {showForm && (
        <SubscriptionForm
          onSubmit={editingSubscription ? handleUpdateSubscription : handleAddSubscription}
          onCancel={() => {
            setShowForm(false);
            setEditingSubscription(null);
            setUploadedScreenshot(null);
          }}
          initialData={editingSubscription || undefined}
          availableTags={availableTags}
        />
      )}
      {showTeamSettings && (
        <TeamSettings onClose={() => setShowTeamSettings(false)} />
      )}
      {showUpload && (
        <UploadStatement
          onUpload={handleUploadComplete}
          onCancel={() => setShowUpload(false)}
          onImportSubscriptions={handleCSVImport}
        />
      )}

      {viewingScreenshot && (
        <ScreenshotModal
          screenshot={viewingScreenshot}
          onClose={() => setViewingScreenshot(null)}
        />
      )}

      {showCSVImport && (
        <CSVImport onImport={handleCSVImport} onCancel={() => setShowCSVImport(false)} />
      )}

      {showRecovery && (
        <LocalStorageRecovery onRecover={handleRecovery} onCancel={() => setShowRecovery(false)} />
      )}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50">
          <span className="font-medium">{selectedIds.size} selected</span>
          <span className="text-xl font-bold">{formatCurrency(selectedTotal, displayCurrency)}</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-2 px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 text-sm"
          >
            Clear
          </button>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Small inline components to keep App.tsx clean

function CurrencySelect({
  value,
  onChange,
}: {
  value: CurrencyType;
  onChange: (currency: CurrencyType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="displayCurrency" className="text-sm text-gray-600 whitespace-nowrap">
        Display in:
      </label>
      <select
        id="displayCurrency"
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyType)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
      >
        <option value="HKD">HKD</option>
        <option value="SGD">SGD</option>
        <option value="USD">USD</option>
      </select>
    </div>
  );
}

function LocalDataBanner({ onRecover }: { onRecover: () => void }) {
  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium mb-1">Local data detected!</p>
            <p className="text-sm text-blue-800">
              You have subscription data stored in your browser from before the Supabase migration.
            </p>
          </div>
        </div>
        <button
          onClick={onRecover}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Recover Data
        </button>
      </div>
    </div>
  );
}

function ViewControls({
  view,
  setView,
  sortOption,
  onSortChange,
  searchQuery,
  onSearchChange,
  onExport,
}: {
  view: View;
  setView: (view: View) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
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
            All Payments
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
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="recent">Recently Added</option>
            <option value="alphabetical">A-Z</option>
            <option value="value-high">Highest Value</option>
            <option value="value-low">Lowest Value</option>
          </select>
        </div>
      </div>

      {view === 'all' && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search payments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ActionBar({
  onUpload,
  onCSVImport,
  onAdd,
}: {
  onUpload: () => void;
  onCSVImport: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:relative md:shadow-none md:border-0 md:bg-transparent md:p-0">
      <div className="max-w-4xl mx-auto flex gap-3 flex-wrap">
        <button
          onClick={onUpload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium md:flex-none md:px-6"
        >
          <Upload size={20} />
          <span className="hidden sm:inline">Upload Statement</span>
          <span className="sm:hidden">Statement</span>
        </button>
        <button
          onClick={onCSVImport}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium md:flex-none md:px-6"
        >
          <FileUp size={20} />
          <span className="hidden sm:inline">Import CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
        <button
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium md:flex-none md:px-6"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add Payment</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </div>
  );
}

export default App;
