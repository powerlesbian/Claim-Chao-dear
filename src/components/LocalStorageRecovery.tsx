import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle, X } from 'lucide-react';
import { checkLocalStorageData, getLocalStorageSubscriptions, clearLocalStorageData, getLocalStorageDataSize } from '../utils/localStorageRecovery';
import { Subscription } from '../types';

interface LocalStorageRecoveryProps {
  onRecover: (subscriptions: Omit<Subscription, 'id' | 'createdAt'>[]) => Promise<void>;
  onCancel: () => void;
}

export default function LocalStorageRecovery({ onRecover, onCancel }: LocalStorageRecoveryProps) {
  const [hasData, setHasData] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dataSize, setDataSize] = useState('0 KB');
  const [recovering, setRecovering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasLocalData = checkLocalStorageData();
    setHasData(hasLocalData);
    setDataSize(getLocalStorageDataSize());

    if (hasLocalData) {
      const localSubs = getLocalStorageSubscriptions();
      setSubscriptions(localSubs);
    }
  }, []);

  const handleRecover = async () => {
    if (subscriptions.length === 0) return;

    setRecovering(true);
    setError(null);

    try {
      const subsToRecover = subscriptions.map(({ id, createdAt, ...rest }) => rest);
      await onRecover(subsToRecover);
      clearLocalStorageData();
      setSuccess(true);

      setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover data');
      setRecovering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recover Local Data</h2>
              <p className="text-sm text-gray-600">Import your subscriptions from browser storage</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={recovering}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!hasData ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No local data found in browser storage.</p>
              <p className="text-sm text-gray-500 mt-2">
                Your subscription data may have already been migrated or cleared.
              </p>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <p className="text-lg font-semibold text-gray-900 mb-2">Recovery Complete!</p>
              <p className="text-gray-600">
                Successfully recovered {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      Local data detected!
                    </p>
                    <p className="text-sm text-blue-800">
                      Found <strong>{subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}</strong> in your browser storage ({dataSize}).
                      Click "Recover Data" to import them into your database.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm text-red-900 font-medium mb-1">Error</p>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Preview ({subscriptions.length} items)</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-700">Name</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-700">Amount</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-700">Frequency</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {subscriptions.slice(0, 10).map((sub, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">{sub.name}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {sub.currency} {sub.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-gray-700 capitalize">{sub.frequency}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              sub.cancelled
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {sub.cancelled ? 'Cancelled' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {subscriptions.length > 10 && (
                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 text-center border-t border-gray-200">
                      + {subscriptions.length - 10} more subscription{subscriptions.length - 10 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-900 font-medium mb-1">
                      Important
                    </p>
                    <p className="text-sm text-yellow-800">
                      After successful recovery, the local browser data will be cleared.
                      All subscriptions will be stored in your secure database instead.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={recovering}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecover}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={recovering || subscriptions.length === 0}
                >
                  {recovering ? 'Recovering...' : `Recover ${subscriptions.length} Subscription${subscriptions.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
