import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
        <CheckCircle size={20} />
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-green-700 rounded p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
