import { Edit2, Trash2, CheckCircle, XCircle, Image } from 'lucide-react';
import { Subscription } from '../types';
import { formatCurrency, formatDate, calculateNextPaymentDate } from '../utils/dates';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  duplicateIds?: Set<string>;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
  onToggleCancelled: (id: string, cancelled: boolean) => void;
  onViewScreenshot: (screenshot: string) => void;
}

export default function SubscriptionList({
  subscriptions,
  duplicateIds = new Set(),
  onEdit,
  onDelete,
  onToggleCancelled,
  onViewScreenshot
}: SubscriptionListProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No subscriptions yet</p>
        <p className="text-gray-400 text-sm mt-2">Add your first subscription to get started</p>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(sub => !sub.cancelled);
  const cancelledSubscriptions = subscriptions.filter(sub => sub.cancelled);

  return (
    <div className="space-y-6">
      {activeSubscriptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Subscriptions</h3>
          <div className="space-y-3">
            {activeSubscriptions.map(subscription => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                isDuplicate={duplicateIds.has(subscription.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleCancelled={onToggleCancelled}
                onViewScreenshot={onViewScreenshot}
              />
            ))}
          </div>
        </div>
      )}

      {cancelledSubscriptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancelled Subscriptions</h3>
          <div className="space-y-3">
            {cancelledSubscriptions.map(subscription => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                isDuplicate={duplicateIds.has(subscription.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleCancelled={onToggleCancelled}
                onViewScreenshot={onViewScreenshot}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  isDuplicate = false,
  onEdit,
  onDelete,
  onToggleCancelled,
  onViewScreenshot
}: {
  subscription: Subscription;
  isDuplicate?: boolean;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
  onToggleCancelled: (id: string, cancelled: boolean) => void;
  onViewScreenshot: (screenshot: string) => void;
}) {
  const nextPayment = !subscription.cancelled
    ? calculateNextPaymentDate(subscription.startDate, subscription.frequency)
    : null;

  return (
    <div className={`rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow ${
      isDuplicate
        ? 'bg-yellow-50 border-yellow-300'
        : subscription.cancelled
        ? 'bg-white border-gray-200 opacity-75'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-lg font-semibold text-gray-900">{subscription.name}</h4>
            {isDuplicate && (
              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                Possible Duplicate
              </span>
            )}
            {subscription.cancelled && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                Cancelled
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <p className="text-xl font-bold text-gray-900">{formatCurrency(subscription.amount, subscription.currency)}</p>
            <p className="capitalize">{subscription.frequency} billing</p>
            <p>Started: {formatDate(subscription.startDate)}</p>
            {nextPayment && (
              <p className="text-blue-600 font-medium">
                Next payment: {formatDate(nextPayment)}
              </p>
            )}
            {subscription.cancelled && subscription.cancelledDate && (
              <p className="text-gray-500">
                Cancelled on: {formatDate(subscription.cancelledDate)}
              </p>
            )}
            {subscription.notes && (
              <p className="text-gray-500 italic mt-2">{subscription.notes}</p>
            )}
          </div>

          {subscription.screenshot && (
            <button
              onClick={() => onViewScreenshot(subscription.screenshot!)}
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Image size={16} />
              View Screenshot
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onEdit(subscription)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 size={18} />
          </button>

          <button
            onClick={() => onToggleCancelled(subscription.id, !subscription.cancelled)}
            className={`p-2 rounded-lg transition-colors ${
              subscription.cancelled
                ? 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
            title={subscription.cancelled ? 'Reactivate' : 'Mark as Cancelled'}
          >
            {subscription.cancelled ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this subscription?')) {
                onDelete(subscription.id);
              }
            }}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
