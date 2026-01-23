import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setNewCategoryName('');
      setSuccess(`Category "${data.name}" added successfully`);
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"? This may affect existing subscriptions.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter(cat => cat.id !== id));
      setSuccess(`Category "${name}" deleted successfully`);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Tag className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleAddCategory} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter new category name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Add Category
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Existing Categories ({categories.length})
        </h3>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm">No categories yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete category"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
