export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  // Joined from auth.users
  email?: string;
}
