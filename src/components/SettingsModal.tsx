import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  availableTags: string[];
  onTagDelete: (tag: string) => void;
  onTagRename: (oldTag: string, newTag: string) => void;
  onTagAdd: (tag: string) => void;
}

type Tab = 'tags' | 'categories';

export default function SettingsModal({
  onClose,
  availableTags,
  onTagDelete,
  onTagRename,
  onTagAdd,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tags');
  
  // Tags state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagValue, setEditTagValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  // Tag handlers
  const handleTagEdit = (tag: string) => {
    setEditingTag(tag);
    setEditTagValue(tag);
  };

  const handleTagSave = () => {
    if (editingTag && editTagValue.trim() && editTagValue !== editingTag) {
      onTagRename(editingTag, editTagValue.trim());
    }
    setEditingTag(null);
    setEditTagValue('');
  };

  const handleTagAdd = () => {
    const trimmed = newTag.trim();
    if (trimmed && !availableTags.includes(trimmed)) {
      onTagAdd(trimmed);
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const handleTagDelete = (tag: string) => {
    if (confirm(`Delete tag "${tag}"? This will remove it from all subscriptions.`)) {
      onTagDelete(tag);
    }
  };

  // Category handlers
  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategoryValue(category.name);
  };

  const handleCategorySave = async () => {
    if (!editingCategory || !editCategoryValue.trim()) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('categories')
      .update({ name: editCategoryValue.trim() })
      .eq('id', editingCategory);
    
    if (!error) {
      await fetchCategories();
    }
    setEditingCategory(null);
    setEditCategoryValue('');
    setLoading(false);
  };

  const handleCategoryAdd = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('categories')
      .insert({ name: trimmed });
    
    if (!error) {
      await fetchCategories();
      setNewCategory('');
      setShowAddCategory(false);
    }
    setLoading(false);
  };

  const handleCategoryDelete = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);
    
    if (!error) {
      await fetchCategories();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Account Tags
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === 'tags' ? (
            <div className="space-y-2">
              {availableTags.map(tag => (
                <div
                  key={tag}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  {editingTag === tag ? (
                    <input
                      type="text"
                      value={editTagValue}
                      onChange={(e) => setEditTagValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTagSave()}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-gray-900">{tag}</span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingTag === tag ? (
                      <>
                        <button
                          onClick={handleTagSave}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-200 rounded"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTagEdit(tag)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleTagDelete(tag)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {showAddTag ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()}
                    placeholder="New tag name..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleTagAdd}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setShowAddTag(false); setNewTag(''); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTag(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Plus size={18} />
                  Add Tag
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  {editingCategory === category.id ? (
                    <input
                      type="text"
                      value={editCategoryValue}
                      onChange={(e) => setEditCategoryValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCategorySave()}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={loading}
                    />
                  ) : (
                    <span className="text-gray-900">{category.name}</span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingCategory === category.id ? (
                      <>
                        <button
                          onClick={handleCategorySave}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                          disabled={loading}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-200 rounded"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCategoryEdit(category)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleCategoryDelete(category)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {showAddCategory ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategoryAdd()}
                    placeholder="New category name..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    onClick={handleCategoryAdd}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                    disabled={loading}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setShowAddCategory(false); setNewCategory(''); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  disabled={loading}
                >
                  <Plus size={18} />
                  Add Category
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
