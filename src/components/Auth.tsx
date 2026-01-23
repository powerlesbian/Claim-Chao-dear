import { useState, useEffect } from 'react';
import { Mail, Lock, Chrome, AlertCircle, HelpCircle, Eye, EyeOff, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkLocalStorageData } from '../utils/localStorageRecovery';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    setHasLocalData(checkLocalStorageData());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="mb-3">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Payments Tracker
              </h1>
              <p className="text-sm text-blue-600 font-medium">by Claim Chowder</p>
            </div>
            <p className="text-gray-600">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {hasLocalData && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Database className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Local data detected!
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    Your subscriptions are saved in browser storage. Sign in with Google below to automatically import them into your secure database.
                  </p>
                  <p className="text-xs text-blue-700 font-medium">
                    Recommended: Use Google Sign-In for fastest access
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                {error.includes('rate_limit') && (
                  <p className="text-xs text-red-700 mt-2">
                    Use Google Sign-In below instead - it works instantly without rate limits.
                  </p>
                )}
              </div>
            </div>
          )}

          {hasLocalData && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                <Chrome size={20} />
                <span>Continue with Google</span>
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or use email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {!hasLocalData && (
            <>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome size={20} />
                <span>Google</span>
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            <HelpCircle size={20} />
            <span>{showFAQ ? 'Hide FAQ' : 'Show FAQ'}</span>
          </button>

          {showFAQ && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What can I track with this app?</h3>
                <p className="text-sm text-gray-700">
                  Track all your recurring and one-off payments including streaming services, software licenses, memberships, purchases, and any other payments. View upcoming payments and manage your costs across different currencies.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What currencies are supported?</h3>
                <p className="text-sm text-gray-700">
                  Currently supports HKD (Hong Kong Dollar), SGD (Singapore Dollar), and USD (US Dollar). You can set a primary display currency to see total costs converted.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I import payments via CSV?</h3>
                <p className="text-sm text-gray-700 mb-2">
                  After signing in, use the "Import CSV" button. Your CSV file must have these columns in this exact order:
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
                  <li><strong>Frequency:</strong> Daily, Weekly, Monthly, Yearly, or One-off (case-insensitive)</li>
                  <li><strong>Currency:</strong> HKD, SGD, or USD</li>
                  <li><strong>Dates:</strong> Format as YYYY-MM-DD</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-sm text-gray-700">
                  Yes, all data is stored securely in a database with row-level security. Only you can access your payment data. Your password is encrypted and never stored in plain text.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I cancel or pause payments?</h3>
                <p className="text-sm text-gray-700">
                  You can mark payments as cancelled to track which ones you've stopped. This helps you keep a history of all your payments.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
