import { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileText, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { extractTextFromPDF, parseTransactionsFromText } from '../utils/pdfParser';
import { detectSubscriptions, DetectedSubscription } from '../utils/subscriptionDetector';
import { Subscription } from '../types';

interface UploadStatementProps {
  onUpload: (screenshot: string) => void;
  onCancel: () => void;
  onImportSubscriptions?: (subscriptions: Omit<Subscription, 'id' | 'createdAt'>[]) => void;
}

export default function UploadStatement({ onUpload, onCancel, onImportSubscriptions }: UploadStatementProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<DetectedSubscription[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (file: File) => {
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setPreview(result);
        setFileType(file.type === 'application/pdf' ? 'pdf' : 'image');
        setFileName(file.name);
        setError(null);

        if (file.type === 'application/pdf') {
          await parsePDF(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const parsePDF = async (dataUrl: string) => {
    setParsing(true);
    setError(null);
    try {
      const text = await extractTextFromPDF(dataUrl);
      const transactions = parseTransactionsFromText(text);

      if (transactions.length === 0) {
        setError('No transactions found in the PDF. The file may be an image-based PDF or have an unsupported format.');
        setParsing(false);
        return;
      }

      const detected = detectSubscriptions(transactions);

      if (detected.length === 0) {
        setError('No recurring subscriptions detected. You can still attach this file to a subscription manually.');
      } else {
        setDetectedSubscriptions(detected);
        setSelectedIds(new Set(detected.map((_, i) => i)));
      }
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError('Failed to parse PDF. You can still attach this file to a subscription manually.');
    }
    setParsing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (preview) {
      onUpload(preview);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const handleImportSelected = () => {
    if (!onImportSubscriptions) return;

    const today = new Date().toISOString().split('T')[0];
    const subscriptionsToImport: Omit<Subscription, 'id' | 'createdAt'>[] = [];

    detectedSubscriptions.forEach((detected, index) => {
      if (selectedIds.has(index)) {
        subscriptionsToImport.push({
          name: detected.name,
          amount: detected.amount,
          currency: 'USD',
          frequency: detected.frequency,
          startDate: today,
          notes: `Auto-detected from ${fileName} (${Math.round(detected.confidence * 100)}% confidence)`,
          cancelled: false,
          screenshot: preview || undefined,
        });
      }
    });

    if (subscriptionsToImport.length > 0) {
      onImportSubscriptions(subscriptionsToImport);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Upload Bank Statement</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!preview ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload bank statement
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop your image or PDF here, or click to browse
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />
                Choose File
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {fileType === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <FileText className="h-24 w-24 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-1">{fileName}</p>
                    <p className="text-sm text-gray-500">PDF uploaded successfully</p>
                    {parsing && (
                      <p className="text-sm text-blue-600 mt-2">Analyzing PDF...</p>
                    )}
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Statement preview"
                    className="w-full rounded-lg border border-gray-200"
                  />
                )}
                <button
                  onClick={() => {
                    setPreview(null);
                    setFileType(null);
                    setFileName('');
                    setDetectedSubscriptions([]);
                    setSelectedIds(new Set());
                    setError(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                    <div className="text-sm text-yellow-900">
                      <p className="font-medium mb-1">Note</p>
                      <p className="text-yellow-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {!parsing && detectedSubscriptions.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 mb-1">
                        Found {detectedSubscriptions.length} potential subscription{detectedSubscriptions.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-green-800">
                        Select the subscriptions you want to import:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detectedSubscriptions.map((sub, index) => (
                      <div
                        key={index}
                        onClick={() => toggleSelection(index)}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200 cursor-pointer hover:bg-green-50 transition-colors"
                      >
                        <div className="mt-0.5">
                          {selectedIds.has(index) ? (
                            <CheckCircle className="text-green-600" size={20} />
                          ) : (
                            <Circle className="text-gray-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{sub.name}</p>
                          <p className="text-sm text-gray-600">
                            ${sub.amount.toFixed(2)} / {sub.frequency}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round(sub.confidence * 100)}% confidence • {sub.transactions.length} transaction{sub.transactions.length > 1 ? 's' : ''} found
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!parsing && detectedSubscriptions.length === 0 && !error && fileType === 'pdf' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <FileText className="text-blue-600 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">PDF uploaded</p>
                      <p className="text-blue-700">
                        This file will be stored and attached to your subscription.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {fileType === 'image' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ImageIcon className="text-blue-600 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Screenshot uploaded</p>
                      <p className="text-blue-700">
                        This file will be stored and attached to your subscription.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                {detectedSubscriptions.length > 0 && selectedIds.size > 0 ? (
                  <button
                    onClick={handleImportSelected}
                    disabled={!onImportSubscriptions}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import {selectedIds.size} Subscription{selectedIds.size > 1 ? 's' : ''}
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Continue to Add Subscription
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
