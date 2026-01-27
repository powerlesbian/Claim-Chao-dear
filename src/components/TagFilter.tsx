import { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onAddTag?: (tag: string) => void;
}

export default function TagFilter({ 
  availableTags, 
  selectedTags, 
  onTagsChange,
  onAddTag 
}: TagFilterProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !availableTags.includes(trimmed) && onAddTag) {
      onAddTag(trimmed);
      // Also select the new tag
      onTagsChange([...selectedTags, trimmed]);
      setNewTag('');
      setShowAddInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const selectAll = () => {
    onTagsChange([...availableTags]);
  };

  const selectNone = () => {
    onTagsChange([]);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Tag size={16} />
          <span>Filter by account:</span>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-blue-600 hover:text-blue-800">
            All
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={selectNone} className="text-blue-600 hover:text-blue-800">
            None
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tag}
          </button>
        ))}
        
        {onAddTag && (
          showAddInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Company name..."
                className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="p-1 text-green-600 hover:text-green-800"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => { setShowAddInput(false); setNewTag(''); }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          )
        )}
      </div>
    </div>
  );
}
