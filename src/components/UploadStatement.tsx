import { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileText, CheckCircle, Circle, AlertCircle, RefreshCw } from 'lucide-react';
import { convertTransactionsToSubscriptions, DetectedSubscription } from '../utils/subscriptionDetector';
import { Subscription } from '../types';
import { formatCurrency } from '../utils/dates';

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
  const [parsedTransactions, setParsedTransactions] = useState<DetectedSubscription[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [rawTransactionCount, setRawTransactionCount] = useState(0);

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
  setParsedTransactions([]);
  setSelectedIds(new Set());

  try {
    // Use the new position-based parser
    const { parsePDF } = await import('../utils/pdfParser');
    const transactions = await parsePDF(dataUrl);

    setRawTransactionCount(transactions.length);
    console.log('Parsed transactions:', transactions.length);

    if (transactions.length === 0) {
      setError('No transactions found in the PDF. The file may be an image-based PDF or have an unsupported format.');
      setParsing(false);
      return;
    }

    // Convert all transactions to importable format
    const detected = convertTransactionsToSubscriptions(transactions, 'HKD');
    console.log('Converted to subscriptions:', detected.length);

    setParsedTransactions(detected);
    setSelectedIds(new Set(detected.map((_, i) => i)));

  } catch (err) {
    console.error('Error parsing PDF:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to parse PDF: ${errorMessage}. You can still attach this file to a subscription manually.`);
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

  const selectAll = () => {
    setSelectedIds(new Set(parsedTransactions.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

const handleImportSelected = () => {
  if (!onImportSubscriptions) return;

  const subscriptionsToImport: Omit<Subscription, 'id' | 'createdAt'>[] = [];

  parsedTransactions.forEach((detected, index) => {
    if (selectedIds.has(index)) {
      subscriptionsToImport.push({
        name: detected.name,
        amount: detected.amount,
        currency: detected.currency,
        frequency: detected.frequency,
        category: detected.category,
        startDate: detected.date || new Date().toISOString().split('T')[0],
        notes: `Imported from ${fileName}`,
        cancelled: false,
        screenshot: preview || undefined,
        user_id: '',
        tags: ['Business'],
      });
    }
  });

  if (subscriptionsToImport.length > 0) {
    onImportSubscriptions(subscriptionsToImport);

    // Show success message
    const count = subscriptionsToImport.length;
    alert(`Successfully imported ${count} transaction${count > 1 ? 's' : ''}!\n\nView them in the "All Payments" tab.`);
    
    onCancel(); // Close the modal after import
  }
};

  const totalSelected = parsedTransactions
    .filter((_, i) => selectedIds.has(i))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
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
              <p className="text-xs text-gray-400 mt-4">
                Supports: American Express HK statements (PDF)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {fileType === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <FileText className="h-16 w-16 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900 mb-1">{fileName}</p>
                    {parsing ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="animate-spin" size={16} />
                        <span className="text-sm">Analyzing PDF...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-green-600">
                        Found {rawTransactionCount} transactions
                      </p>
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
                    setParsedTransactions([]);
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

              {!parsing && parsedTransactions.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-green-900 mb-1">
                          {parsedTransactions.length} transaction{parsedTransactions.length > 1 ? 's' : ''} found
                        </p>
                        <p className="text-sm text-green-800">
                          Selected: {selectedIds.size} ({formatCurrency(totalSelected, 'HKD')})
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-green-700 hover:text-green-900 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-green-400">|</span>
                      <button
                        onClick={selectNone}
                        className="text-xs text-green-700 hover:text-green-900 font-medium"
                      >
                        Select None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {parsedTransactions.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => toggleSelection(index)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIds.has(index)
                            ? 'bg-white border-green-300'
                            : 'bg-green-50/50 border-green-100 opacity-60'
                        }`}
                      >
                        <div className="mt-0.5">
                          {selectedIds.has(index) ? (
                            <CheckCircle className="text-green-600" size={18} />
                          ) : (
                            <Circle className="text-gray-400" size={18} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              {item.isRecurring && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium flex-shrink-0">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 flex-shrink-0">
                              {formatCurrency(item.amount, item.currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {item.category}
                            </span>
                            <span className="text-xs text-gray-500">{item.date}</span>
                            <span className="text-xs text-gray-400">{item.frequency}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!parsing && parsedTransactions.length === 0 && !error && fileType === 'pdf' && (
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
                {parsedTransactions.length > 0 && selectedIds.size > 0 ? (
                  <button
                    onClick={handleImportSelected}
                    disabled={!onImportSubscriptions}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import {selectedIds.size} Transaction{selectedIds.size > 1 ? 's' : ''}
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
