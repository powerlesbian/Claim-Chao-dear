import { useState } from 'react';
import { Subscription, CurrencyType, SortOption } from '../types';
import { getSortPreference, setSortPreference } from '../utils/storage';
import { getDisplayCurrency, setDisplayCurrency } from '../utils/currency';

export function useAppState() {
  // UI State
  const [view, setView] = useState<'upcoming' | 'all' | 'admin'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Preferences
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyType>(getDisplayCurrency());
  const [sortOption, setSortOptionState] = useState<SortOption>(getSortPreference());
  const [searchQuery, setSearchQuery] = useState('');

  const handleCurrencyChange = (currency: CurrencyType) => {
    setDisplayCurrencyState(currency);
    setDisplayCurrency(currency);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOptionState(sort);
    setSortPreference(sort);
  };

  return {
    // View & UI
    view,
    setView,
    showForm,
    setShowForm,
    showUpload,
    setShowUpload,
    showCSVImport,
    setShowCSVImport,
    showRecovery,
    setShowRecovery,
    showFAQ,
    setShowFAQ,
    showSettings,
    setShowSettings,
    showTeamSettings,
    setShowTeamSettings,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingSubscription,
    setEditingSubscription,
    uploadedScreenshot,
    setUploadedScreenshot,
    viewingScreenshot,
    setViewingScreenshot,
    toast,
    setToast,
    selectedIds,
    setSelectedIds,
    selectedTags,
    setSelectedTags,
    customTags,
    setCustomTags,
    // Preferences
    displayCurrency,
    handleCurrencyChange,
    sortOption,
    handleSortChange,
    searchQuery,
    setSearchQuery,
  };
}
