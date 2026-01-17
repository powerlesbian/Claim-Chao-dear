import { X } from 'lucide-react';

interface ScreenshotModalProps {
  screenshot: string;
  onClose: () => void;
}

export default function ScreenshotModal({ screenshot, onClose }: ScreenshotModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} />
        </button>
        <img
          src={screenshot}
          alt="Bank statement"
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
