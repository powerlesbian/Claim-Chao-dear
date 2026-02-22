import { useMemo } from 'react';
import { Plus, Upload, LogOut, FileUp, Shield, Settings, Users } from 'lucide-react';
import { Subscription, DEFAULT_TAGS } from './types';
import { formatCurrency } from './utils/dates';
import { exportToCSV } from './utils/csv';
import { useAuth } from './contexts/AuthContext';
import { useSubscriptions } from './hooks/useSubscriptions';
import { useAppState } from './hooks/useAppState';
import { useSubscriptionActions } from './hooks/useSubscriptionActions';
import { useTagManagement } from './hooks/useTagManagement';
import { useSelectionManagement } from './hooks/useSelectionManagement';
import { useSubscriptionFiltering } from './hooks/useSubscriptionFiltering';
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
import TeamSettings from './components/TeamSettings';
import { Database, Trash2, ArrowUpDown, Search, Download } from 'lucide-react';

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

  // App state
  const appState = useAppState();

  // Subscription actions
  const { handleDeleteSelected } = useSubscriptionActions(
    addOne,
    update,
    remove,
    reload,
    appState.setToast
  );

  // Tag management
  const { handleAddTag, handleTagDelete, handleTagRename } = useTagManagement(
    subscriptions,
    appState.customTags,
    appState.setCustomTags,
    appState.selectedTags,
    appState.setSelectedTags,
    reload,
    appState.setToast
  );

  // Selection management
  const { handleToggleSelect, handleSelectAll, selectedTotal } = useSelectionManagement(
    subscriptions,
    appState.selectedIds,
    appState.setSelectedIds,
    appState.displayCurrency
  );

  // Subscription filtering
  const {
    tagFilteredSubscriptions,
    activeSubscriptions,
    sortedSubscriptions,
    upcomingPayments,
    totalMonthly,
  } = useSubscriptionFiltering(
    subscriptions,
    appState.selectedTags,
    appState.searchQuery,
    appState.sortOption,
    appState.displayCurrency
  );

  // Available tags
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>(DEFAULT_TAGS);
    subscriptions.forEach((sub) => {
      sub.tags?.forEach((tag) => tagsSet.add(tag));
    });
    appState.customTags.forEach((tag) => tagsSet.add(tag));
    return Array.from(tagsSet).sort();
  }, [subscriptions, appState.customTags]);

  // Handlers
  const handleEdit = (subscription: Subscription) => {
    appState.setEditingSubscription(subscription);
    appState.setShowForm(true);
  };

  const handleUploadComplete = (screenshot: string) => {
    appState.setUploadedScreenshot(screenshot);
    appState.setShowUpload(false);
    appState.setShowForm(true);
  };

  const handleCSVImport = async (imported: Omit<Subscription, 'id' | 'createdAt'>[]) => {
    const result = await addMany(imported);
    if (result.length > 0) {
      appState.setShowCSVImport(false);
      appState.setToast(`Imported ${result.length} transaction${result.length > 1 ? 's' : ''}! View in "All Payments" tab.`);
    }
  };

  const handleRecovery = async (recovered: Omit<Subscription, 'id' | 'createdAt'>[]) => {
    const result = await addMany(recovered);
    if (result.length > 0) {
      appState.setShowRecovery(false);
      setHasLocalData(false);
    }
  };

  const handleAddSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    const subscriptionData = {
      ...data,
      screenshot: appState.uploadedScreenshot || data.screenshot,
    };
    const result = await addOne(subscriptionData);
    if (result) {
      appState.setShowForm(false);
      appState.setEditingSubscription(null);
      appState.setUploadedScreenshot(null);
    }
  };

  const handleUpdateSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!appState.editingSubscription) return;
    const updatedData = {
      ...data,
      screenshot: appState.uploadedScreenshot || data.screenshot,
    };
    const success = await update(appState.editingSubscription.id, updatedData);
    if (success) {
      appState.setShowForm(false);
      appState.setEditingSubscription(null);
      appState.setUploadedScreenshot(null);
    }
  };

  const handleDeleteSelectedClick = async () => {
    await handleDeleteSelected(appState.selectedIds, () => {
      appState.setSelectedIds(new Set());
      appState.setShowDeleteConfirm(false);
    });
  };

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

  // Admin view
  if (appState.view === 'admin' && isAdmin) {
    return (
      <div>
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => appState.setView('upcoming')}
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

  // Main app view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Welcome, {user?.email?.split('@')[0] || user?.email}! 👋
              </h1>
              <p className="text-gray-600">Track your payments and claims to fix leaks from the taps</p>
            </div>
            <HeaderActions
              displayCurrency={appState.displayCurrency}
              onCurrencyChange={appState.handleCurrencyChange}
              isAdmin={isAdmin}
              onAdminClick={() => appState.setView('admin')}
              onSettingsClick={() => appState.setShowSettings(true)}
              onTeamSettingsClick={() => appState.setShowTeamSettings(true)}
              onSignOut={signOut}
              currentTeamName="Personal" // TODO: Get from context
            />
          </div>
        </header>

        {/* Tag Filter */}
        <TagFilter
          availableTags={availableTags}
          selectedTags={appState.selectedTags}
          onTagsChange={appState.setSelectedTags}
          onAddTag={handleAddTag}
        />

        {/* Stats */}
        <StatsCards
          totalMonthly={totalMonthly}
          activeCount={activeSubscriptions.length}
          dueThisWeek={upcomingPayments.filter((p) => p.daysUntil <= 7).length}
          displayCurrency={appState.displayCurrency}
        />

        {/* Dashboard Cards */}
        <DashboardCards
          subscriptions={tagFilteredSubscriptions}
          displayCurrency={appState.displayCurrency}
        />

        {/* Local Data Recovery Banner */}
        {hasLocalData && (
          <LocalDataBanner onRecover={() => appState.setShowRecovery(true)} />
        )}

        {/* View Tabs & Sort */}
        <ViewControls
          view={appState.view}
          onViewChange={appState.setView}
          sortOption={appState.sortOption}
          onSortChange={appState.handleSortChange}
          searchQuery={appState.searchQuery}
          onSearchChange={appState.setSearchQuery}
          onExport={() => exportToCSV(subscriptions)}
          selectedCount={appState.selectedIds.size}
          totalCount={sortedSubscriptions.length}
          onSelectAll={handleSelectAll}
        />

        {/* Content */}
        <div className="mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading payments...</div>
            </div>
          ) : appState.view === 'upcoming' ? (
            <UpcomingPayments payments={upcomingPayments} />
          ) : (
            <SubscriptionList
              subscriptions={sortedSubscriptions}
              duplicateIds={new Set()}
              selectedIds={appState.selectedIds}
              onToggleSelect={handleToggleSelect}
              onEdit={handleEdit}
              onDelete={remove}
              onToggleCancelled={toggleCancelled}
              onViewScreenshot={appState.setViewingScreenshot}
            />
          )}
        </div>

        {/* Action Buttons */}
        <ActionBar
          onUpload={() => appState.setShowUpload(true)}
          onCSVImport={() => appState.setShowCSVImport(true)}
          onAdd={() => {
            appState.setEditingSubscription(null);
            appState.setUploadedScreenshot(null);
            appState.setShowForm(true);
          }}
        />

        {/* FAQ */}
        <FAQ isVisible={appState.showFAQ} onToggle={() => appState.setShowFAQ(!appState.showFAQ)} />
      </div>

      {/* Modals */}
      {appState.showSettings && (
        <SettingsModal
          onClose={() => appState.setShowSettings(false)}
          availableTags={availableTags}
          onTagDelete={handleTagDelete}
          onTagRename={handleTagRename}
          onTagAdd={handleAddTag}
        />
      )}

      {appState.showForm && (
        <SubscriptionForm
          onSubmit={appState.editingSubscription ? handleUpdateSubscription : handleAddSubscription}
          onCancel={() => {
            appState.setShowForm(false);
            appState.setEditingSubscription(null);
            appState.setUploadedScreenshot(null);
          }}
          initialData={appState.editingSubscription || undefined}
          availableTags={availableTags}
        />
      )}

      {appState.showTeamSettings && (
        <TeamSettings onClose={() => appState.setShowTeamSettings(false)} />
      )}

      {appState.showUpload && (
        <UploadStatement
          onUpload={handleUploadComplete}
          onCancel={() => appState.setShowUpload(false)}
          onImportSubscriptions={handleCSVImport}
        />
      )}

      {appState.viewingScreenshot && (
        <ScreenshotModal
          screenshot={appState.viewingScreenshot}
          onClose={() => appState.setViewingScreenshot(null)}
        />
      )}

      {appState.showCSVImport && (
        <CSVImport onImport={handleCSVImport} onCancel={() => appState.setShowCSVImport(false)} />
      )}

      {appState.showRecovery && (
        <LocalStorageRecovery onRecover={handleRecovery} onCancel={() => appState.setShowRecovery(false)} />
      )}

      {/* Selection Bar */}
      {appState.selectedIds.size > 0 && (
        <SelectionBar
          selectedCount={appState.selectedIds.size}
          selectedTotal={selectedTotal}
          displayCurrency={appState.displayCurrency}
          totalCount={sortedSubscriptions.length}
          onSelectAll={handleSelectAll}
          onDelete={() => appState.setShowDeleteConfirm(true)}
          onClear={() => appState.setSelectedIds(new Set())}
        />
      )}

      {/* Delete Confirmation Modal */}
      {appState.showDeleteConfirm && (
        <DeleteConfirmationModal
          count={appState.selectedIds.size}
          onConfirm={handleDeleteSelectedClick}
          onCancel={() => appState.setShowDeleteConfirm(false)}
        />
      )}

      {appState.toast && <Toast message={appState.toast} onClose={() => appState.setToast(null)} />}
    </div>
  );
}

// Sub-components
function HeaderActions({
  displayCurrency,
  onCurrencyChange,
  isAdmin,
  onAdminClick,
  onSettingsClick,
  onTeamSettingsClick,
  onSignOut,
  currentTeamName,
}: {
  displayCurrency: any;
  onCurrencyChange: (currency: any) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onSettingsClick: () => void;
  onTeamSettingsClick: () => void;
  onSignOut: () => void;
  currentTeamName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <CurrencySelect value={displayCurrency} onChange={onCurrencyChange} />
      {isAdmin && (
        <button
          onClick={onAdminClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          title="Admin Panel"
        >
          <Shield size={18} />
        </button>
      )}
      <button
        onClick={onSettingsClick}
        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Settings"
      >
        <Settings size={18} />
      </button>
      <button
        onClick={onSignOut}
        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Sign out"
      >
        <LogOut size={18} />
      </button>
      <button
        onClick={onTeamSettingsClick}
        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Team Settings"
      >
        <Users size={18} />
        <span className="hidden sm:inline text-sm">{currentTeamName}</span>
      </button>
    </div>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: any;
  onChange: (currency: any) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="displayCurrency" className="text-sm text-gray-600 whitespace-nowrap">
        Display in:
      </label>
      <select
        id="displayCurrency"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  onViewChange,
  sortOption,
  onSortChange,
  searchQuery,
  onSearchChange,
  onExport,
  selectedCount,
  totalCount,
  onSelectAll,
}: {
  view: 'upcoming' | 'all' | 'admin';
  onViewChange: (view: 'upcoming' | 'all' | 'admin') => void;
  sortOption: any;
  onSortChange: (sort: any) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => onViewChange('upcoming')}
            className={`px-4 py-2 font-medium transition-colors ${
              view === 'upcoming'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming Payments
          </button>
          <button
            onClick={() => onViewChange('all')}
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
            onChange={(e) => onSortChange(e.target.value)}
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

          {totalCount > 0 && (
            <button
              onClick={onSelectAll}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCount === totalCount
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {selectedCount === totalCount ? '✓ All Selected' : `Select All (${totalCount})`}
            </button>
          )}

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


function SelectionBar({
  selectedCount,
  selectedTotal,
  displayCurrency,
  totalCount,
  onSelectAll,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  selectedTotal: number;
  displayCurrency: any;
  totalCount: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50">
      <span className="font-medium">{selectedCount} selected</span>
      <span className="text-xl font-bold">{formatCurrency(selectedTotal, displayCurrency)}</span>
      <button
        onClick={onSelectAll}
        className="ml-2 px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 text-sm"
      >
        {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
      </button>
      <button
        onClick={onDelete}
        className="ml-2 px-3 py-1 bg-red-500 rounded-full hover:bg-red-600 text-sm flex items-center gap-2"
      >
        <Trash2 size={16} />
        Delete
      </button>
      <button
        onClick={onClear}
        className="ml-2 px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 text-sm"
      >
        Clear
      </button>
    </div>
  );
}

function DeleteConfirmationModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Selected Payments?</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete {count} payment{count !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Delete {count}
          </button>
        </div>
      </div>
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
