import { AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DuplicateWarningProps {
  duplicateIds: Set<string>;
  visible: boolean;
  onMarkNotDuplicate?: (id: string) => void;
}

export default function DuplicateWarning({ 
  duplicateIds, 
  visible,
  onMarkNotDuplicate 
}: DuplicateWarningProps) {
  if (!visible || duplicateIds.size === 0) return null;

  const handleMarkNotDuplicate = async (id: string) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ markedAsNotDuplicate: true })
        .eq('id', id);
      
      if (onMarkNotDuplicate) {
        onMarkNotDuplicate(id);
      }
    } catch (error) {
      console.error('Error marking as not duplicate:', error);
    }
  };

  return (
    <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 mb-2">
            ⚠️ Possible Duplicates Detected
          </p>
          <p className="text-sm text-amber-800 mb-3">
            {duplicateIds.size} payment{duplicateIds.size !== 1 ? 's' : ''} highlighted in yellow may be duplicates.
          </p>
          <div className="text-xs text-amber-700">
            <p className="mb-1">💡 Tip: If these are NOT duplicates, click the button in the payment row to dismiss.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
