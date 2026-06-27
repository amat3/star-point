export type UserRole = 'player' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
  avatar_url?: string;
  rating: number;
  role: UserRole;
  matches_played: number;
  matches_won: number;
  win_ratio: number;
  ranking?: number;
  gender?: 'masculino' | 'femenino' | 'otro';
  preferred_hand?: 'diestro' | 'zurdo' | 'ambidiestro';
  court_position?: 'reves' | 'drive' | 'ambos';
  updated_at?: string;
  is_guest?: boolean;
}

export type PlayerOption = Pick<Profile, 'id' | 'full_name'>;

export type MatchStatus = 'pending' | 'confirmed' | 'disputed';
export type MatchType = 'mixing';

export interface Match {
  id: string;
  created_at: string;
  creator_id: string;
  match_type: MatchType;
  status: MatchStatus;
  event_id?: string;
  last_updated_by?: string;
  
  // Players
  player_a1: string;
  player_a2: string;
  player_b1: string;
  player_b2: string;

  // Scores
  score_details: string;
  sets_a: number;
  sets_b: number;
  
  // Rating impact
  rating_change?: number;

  // Joined relations (optional, populated via joins)
  p_a1?: { full_name: string; is_guest?: boolean };
  p_a2?: { full_name: string; is_guest?: boolean };
  p_b1?: { full_name: string; is_guest?: boolean };
  p_b2?: { full_name: string; is_guest?: boolean };
  
  // Event Metadata
  court_number?: number;
  court_name?: string;
  event?: { title: string, start_time?: string, duration_minutes?: number, rounds?: number };
  round_number?: number;
}

export interface RatingResult {
  newRating: number;
  change: number;
}
