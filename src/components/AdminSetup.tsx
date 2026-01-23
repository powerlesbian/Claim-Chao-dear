import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAdmins, setHasAdmins] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      if (adminsError) throw adminsError;

      setHasAdmins(admins && admins.length > 0);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setIsCurrentUserAdmin(profile?.is_admin ?? false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setMessage({ type: 'error', text: 'Failed to check admin status' });
    } finally {
      setLoading(false);
    }
  };

  const grantAdminAccess = async () => {
    if (!user) return;

    setGranting(true);
    setMessage(null);

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            is_admin: true
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Admin access granted! Refresh the page to see the admin panel.' });
      setIsCurrentUserAdmin(true);
      setHasAdmins(true);
    } catch (error: any) {
      console.error('Error granting admin access:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to grant admin access. Please check console for details.'
      });
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-100 rounded-full p-4">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Admin Setup
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Grant yourself admin access to manage all users and data
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Email:</span>
              <span className="text-sm font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Admin Status:</span>
              <span className={`text-sm font-medium ${
                isCurrentUserAdmin ? 'text-green-600' : 'text-gray-400'
              }`}>
                {isCurrentUserAdmin ? 'Admin' : 'Not Admin'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">System Admins:</span>
              <span className="text-sm font-medium text-gray-900">
                {hasAdmins ? 'Exists' : 'None'}
              </span>
            </div>
          </div>

          {!isCurrentUserAdmin && (
            <>
              <button
                onClick={grantAdminAccess}
                disabled={granting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shield size={20} />
                {granting ? 'Granting Access...' : 'Grant Me Admin Access'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                This will give you full access to view and manage all user data in the admin panel.
              </p>
            </>
          )}

          {isCurrentUserAdmin && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">You have admin access!</span>
              </div>
              <a
                href="/"
                className="inline-block text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Dashboard →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
