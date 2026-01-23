import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { Subscription } from '../types';

interface CSVImportProps {
  onImport: (subscriptions: Omit<Subscription, 'id' | 'createdAt'>[]) => void;
  onCancel: () => void;
}

export default function CSVImport({ onImport, onCancel }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<Omit<Subscription, 'id' | 'createdAt'>[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const parseCSV = (text: string): Omit<Subscription, 'id' | 'createdAt'>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Name', 'Amount', 'Currency', 'Frequency', 'Start Date'];

    const headerCheck = requiredHeaders.every(h => headers.includes(h));
    if (!headerCheck) {
      throw new Error(`CSV must have required headers: ${requiredHeaders.join(', ')}`);
    }

    const categoryIndex = headers.indexOf('Category');

    const subscriptions: Omit<Subscription, 'id' | 'createdAt'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());

      const nameIndex = headers.indexOf('Name');
      const amountIndex = headers.indexOf('Amount');
      const currencyIndex = headers.indexOf('Currency');
      const frequencyIndex = headers.indexOf('Frequency');
      const startDateIndex = headers.indexOf('Start Date');

      const name = values[nameIndex];
      const amount = parseFloat(values[amountIndex]);
      const currency = values[currencyIndex] as 'HKD' | 'SGD' | 'USD';
      const frequency = values[frequencyIndex].toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly';
      const startDate = values[startDateIndex];
      const category = categoryIndex >= 0 && values[categoryIndex]
        ? values[categoryIndex]
        : 'Other';

      if (!name || isNaN(amount)) {
        throw new Error(`Row ${i} has invalid data`);
      }

      if (!['HKD', 'SGD', 'USD'].includes(currency)) {
        throw new Error(`Row ${i} has invalid currency: ${currency}`);
      }

      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
        throw new Error(`Row ${i} has invalid frequency: ${frequency}`);
      }

      subscriptions.push({
        name,
        amount,
        currency,
        frequency,
        startDate,
        category,
        cancelled: false,
      });
    }

    return subscriptions;
  };

  const handleFileChange = (selectedFile: File) => {
    setError('');
    setPreview([]);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setPreview(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV');
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileChange(droppedFile);
    } else {
      setError('Please drop a CSV file');
    }
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import CSV</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file with subscription data
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">CSV Format</h3>
            <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
              <div>Name,Amount,Currency,Frequency,Start Date,Category</div>
              <div className="text-gray-600">Example: Netflix,119.00,HKD,Monthly,2026-01-01,Entertainment</div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Frequency:</strong> Daily, Weekly, Monthly, or Yearly<br />
              <strong>Currency:</strong> HKD, SGD, or USD<br />
              <strong>Category (optional):</strong> Any category from your list (defaults to "Other")
            </p>
          </div>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FileText className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-700 mb-2">
                Drag and drop your CSV file here, or
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <Upload size={20} />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="text-green-600" size={20} />
                  <span className="font-medium text-green-900">{file.name}</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setError('');
                  }}
                  className="text-sm text-green-700 hover:text-green-900"
                >
                  Remove
                </button>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Preview ({preview.length} subscription{preview.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Amount</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Frequency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {preview.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{sub.name}</td>
                              <td className="px-3 py-2">
                                {sub.amount.toFixed(2)} {sub.currency}
                              </td>
                              <td className="px-3 py-2 capitalize">{sub.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {preview.length > 0 && `(${preview.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
