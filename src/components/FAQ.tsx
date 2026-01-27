interface FAQProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function FAQ({ isVisible, onToggle }: FAQProps) {
  return (
    <div className="mt-8 mb-20 md:mb-8">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
      >
        <span>{isVisible ? 'Hide FAQ' : 'Show FAQ'}</span>
      </button>

      {isVisible && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <FAQItem
            question="What can I track with this app?"
            answer="Track all your recurring and one-off payments including streaming services, software licenses, memberships, purchases, and any other payments. View upcoming payments and manage your costs across different currencies."
          />

          <FAQItem
            question="What currencies are supported?"
            answer="Currently supports HKD (Hong Kong Dollar), SGD (Singapore Dollar), and USD (US Dollar). You can set a primary display currency to see total costs converted. Exchange rates: 1 USD = 7.8 HKD = 1.35 SGD."
          />

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              How do I import payments via CSV?
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              Click the "Import CSV" button. Your CSV file must have these columns in
              this exact order:
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
              Name,Amount,Currency,Frequency,Start Date,Next Payment
            </div>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Example:</strong>
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
              Netflix,119.00,HKD,Monthly,2026-01-01,2026-02-01
            </div>
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li>
                <strong>Frequency:</strong> Daily, Weekly, Monthly, Yearly, or One-off
                (case-insensitive)
              </li>
              <li>
                <strong>Currency:</strong> HKD, SGD, or USD
              </li>
              <li>
                <strong>Dates:</strong> Format as YYYY-MM-DD
              </li>
              <li>
                <strong>Note:</strong> The "Next Payment" column is required in the CSV
                but the app calculates payment dates automatically based on start date
                and frequency
              </li>
            </ul>
          </div>

          <FAQItem
            question="How are payment dates calculated?"
            answer="The app automatically calculates your next payment date based on the subscription's start date and billing frequency. You don't need to manually update payment dates."
          />

          <FAQItem
            question="Can I upload bank statements?"
            answer='Yes, use the "Upload Statement" button to upload a screenshot or photo of your bank/credit card statement. The app stores the image with your subscription for reference.'
          />

          <FAQItem
            question="Is my data secure?"
            answer="Yes, all data is stored securely in a database with row-level security. Only you can access your payment data. Your password is encrypted and never stored in plain text."
          />

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              What are the app's limitations?
            </h3>
            <p className="text-sm text-gray-700">Currently, the app:</p>
            <ul className="text-sm text-gray-700 mt-1 list-disc list-inside space-y-1">
              <li>Supports 3 currencies only (HKD, SGD, USD)</li>
              <li>Uses fixed exchange rates for conversions</li>
              <li>
                Stores screenshots as base64 data (may impact performance with many
                large images)
              </li>
              <li>Does not send payment reminders or notifications</li>
              <li>Cannot automatically sync with your bank accounts</li>
              <li>
                One-off payments are included in monthly totals only for the month they
                occurred
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-sm text-gray-700">{answer}</p>
    </div>
  );
}
