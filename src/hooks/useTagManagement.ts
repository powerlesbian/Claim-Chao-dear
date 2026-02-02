import { Subscription } from '../types';
import { supabase } from '../lib/supabase';

export function useTagManagement(
  subscriptions: Subscription[],
  customTags: string[],
  setCustomTags: (tags: string[]) => void,
  selectedTags: string[],
  setSelectedTags: (tags: string[]) => void,
  reload: () => Promise<void>,
  setToast: (msg: string) => void
) {
  const handleAddTag = (tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag]);
    }
  };

  const handleTagDelete = async (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
    setSelectedTags(selectedTags.filter(t => t !== tag));

    const subsWithTag = subscriptions.filter(s => s.tags?.includes(tag));

    for (const sub of subsWithTag) {
      const newTags = sub.tags?.filter(t => t !== tag) || [];
      const finalTags = newTags.length > 0 ? newTags : ['Personal'];

      await supabase
        .from('subscriptions')
        .update({ tags: finalTags })
        .eq('id', sub.id);
    }

    await reload();
    setToast(`Deleted tag: ${tag}`);
  };

  const handleTagRename = async (oldTag: string, newTag: string) => {
    setCustomTags(customTags.map(t => t === oldTag ? newTag : t));
    setSelectedTags(selectedTags.map(t => t === oldTag ? newTag : t));

    const subsWithTag = subscriptions.filter(s => s.tags?.includes(oldTag));

    for (const sub of subsWithTag) {
      const newTags = sub.tags?.map(t => t === oldTag ? newTag : t) || [newTag];

      await supabase
        .from('subscriptions')
        .update({ tags: newTags })
        .eq('id', sub.id);
    }

    await reload();
    setToast(`Renamed tag: ${oldTag} → ${newTag}`);
  };

  return {
    handleAddTag,
    handleTagDelete,
    handleTagRename,
  };
}
