export interface MixingEvent {
  id: string
  created_at: string
  title: string
  start_time: string
  max_spots: number
  rounds: number
  duration_minutes: number
  status: 'open' | 'closed' | 'finished'
  created_by: string
  is_test: boolean

  // Virtual properties (joined columns or computed)
  participants_count?: number
  is_joined?: boolean
  participants?: {
    user_id: string
    full_name: string | null
    avatar_url?: string
    is_guest?: boolean
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
