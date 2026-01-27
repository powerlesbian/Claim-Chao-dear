import { useState } from 'react';
import { X, Plus, Users, Crown, Shield, User, Trash2, Mail } from 'lucide-react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';

interface TeamSettingsProps {
  onClose: () => void;
}

export default function TeamSettings({ onClose }: TeamSettingsProps) {
  const { user } = useAuth();
  const { teams, currentTeam, teamMembers, createTeam, inviteMember, removeMember, setCurrentTeam } = useTeam();
  
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setLoading(true);
    const team = await createTeam(newTeamName.trim());
    if (team) {
      setCurrentTeam(team);
      setNewTeamName('');
      setShowNewTeam(false);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    const success = await inviteMember(inviteEmail.trim(), inviteRole);
    if (success) {
      setInviteEmail('');
      setShowInvite(false);
    }
    setLoading(false);
  };

  const handleRemoveMember = async (memberId: string, email?: string) => {
    if (!confirm(`Remove ${email || 'this member'} from the team?`)) return;
    await removeMember(memberId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown size={14} className="text-yellow-500" />;
      case 'admin': return <Shield size={14} className="text-blue-500" />;
      default: return <User size={14} className="text-gray-400" />;
    }
  };

  const isOwner = currentTeam?.owner_id === user?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Team Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Team Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Team
            </label>
            <div className="flex gap-2">
              <select
                value={currentTeam?.id || ''}
                onChange={(e) => {
                  const team = teams.find(t => t.id === e.target.value);
                  if (team) setCurrentTeam(team);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewTeam(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* New Team Form */}
          {showNewTeam && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Team Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                  placeholder="e.g., My Company"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={loading}
                />
                <button
                  onClick={handleCreateTeam}
                  disabled={loading || !newTeamName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewTeam(false); setNewTeamName(''); }}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Team Members */}
          {currentTeam && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Team Members</h3>
                {isOwner && (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={16} />
                    Invite
                  </button>
                )}
              </div>

              {/* Invite Form */}
              {showInvite && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invite by Email
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="secretary@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={loading}
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInvite}
                      disabled={loading || !inviteEmail.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Mail size={16} />
                      Send Invite
                    </button>
                    <button
                      onClick={() => { setShowInvite(false); setInviteEmail(''); }}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    The invited user needs to sign up or log in with this email to access the team.
                  </p>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <span className="text-gray-900">
                        {member.invited_email || member.user_id}
                        {member.user_id === user?.id && ' (you)'}
                      </span>
                      {!member.accepted_at && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                    {isOwner && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.invited_email || undefined)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
