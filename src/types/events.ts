export interface MixingEvent {
  id: string
  created_at: string
  title: string
  start_time: string
  max_spots: number
  rounds: number
  status: 'open' | 'closed' | 'finished'
  created_by: string
  
  // Virtual properties (joined columns or computed)
  participants_count?: number
  is_joined?: boolean
  participants?: {
    user_id: string
    full_name: string | null
    avatar_url?: string
  }[]
}

export interface EventParticipant {
  event_id: string
  user_id: string
  joined_at: string
  
  // Joined profile
  profile?: {
    full_name: string | null
    avatar_url?: string
  }
}
