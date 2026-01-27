import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Team, TeamMember } from '../types/team';
import { useAuth } from './AuthContext';

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  loading: boolean;
  setCurrentTeam: (team: Team) => void;
  createTeam: (name: string) => Promise<Team | null>;
  inviteMember: (email: string, role?: 'admin' | 'member') => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const CURRENT_TEAM_KEY = 'current-team-id';

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) {
      setTeams([]);
      setCurrentTeamState(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error fetching teams:', error);
      setLoading(false);
      return;
    }

    setTeams(data || []);

    // Restore last selected team or default to first
    const savedTeamId = localStorage.getItem(CURRENT_TEAM_KEY);
    const savedTeam = data?.find(t => t.id === savedTeamId);
    const defaultTeam = savedTeam || data?.[0] || null;
    
    if (defaultTeam) {
      setCurrentTeamState(defaultTeam);
      await fetchTeamMembers(defaultTeam.id);
    }

    setLoading(false);
  };

  const fetchTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at');

    if (!error && data) {
      setTeamMembers(data);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamState(team);
    localStorage.setItem(CURRENT_TEAM_KEY, team.id);
    fetchTeamMembers(team.id);
  };

  const createTeam = async (name: string): Promise<Team | null> => {
    if (!user) return null;

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (teamError || !team) {
      console.error('Error creating team:', teamError);
      return null;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Error adding owner to team:', memberError);
    }

    await fetchTeams();
    return team;
  };
const inviteMember = async (email: string, role: 'admin' | 'member' = 'member'): Promise<boolean> => {
  if (!currentTeam || !user) return false;

  // Check if already invited
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', currentTeam.id)
    .eq('invited_email', email.toLowerCase())
    .single();

  if (existing) {
    alert('This email has already been invited.');
    return false;
  }

  // Create invite record - will be linked when user signs in
  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: currentTeam.id,
      user_id: user.id, // Temporary - will be updated when invitee signs in
      role,
      invited_email: email.toLowerCase(),
      accepted_at: null,
    });

  if (error) {
    console.error('Error inviting member:', error);
    return false;
  }

  await fetchTeamMembers(currentTeam.id);
  return true;
  
};

  const removeMember = async (memberId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return false;
    }

    if (currentTeam) {
      await fetchTeamMembers(currentTeam.id);
    }
    return true;
  };

  const refreshTeams = async () => {
    await fetchTeams();
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        teamMembers,
        loading,
        setCurrentTeam,
        createTeam,
        inviteMember,
        removeMember,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
