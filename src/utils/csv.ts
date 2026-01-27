import { Subscription } from '../types';

/**
 * Export subscriptions to a CSV file and trigger download
 */
export const exportToCSV = (subscriptions: Subscription[]): void => {
  const headers = [
    'Name',
    'Amount',
    'Currency',
    'Frequency',
    'Start Date',
    'Next Payment',
    'Notes',
    'Status',
  ];

  const rows = subscriptions.map((sub) => {
    const nextPayment = !sub.cancelled ? new Date(sub.startDate) : null;

    return [
      sub.name,
      sub.amount.toFixed(2),
      sub.currency,
      sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1),
      sub.startDate,
      nextPayment ? nextPayment.toISOString().split('T')[0] : 'N/A',
      sub.notes || '',
      sub.cancelled ? 'Cancelled' : 'Active',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
