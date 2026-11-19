export interface MixingEvent {
  id: string
  created_at: string
  title: string
  start_time: string
  max_spots: number
  rounds: number
  duration_minutes: number
  status: 'open' | 'in_progress'
  created_by: string
  is_test: boolean
  // 'match': a player-published match looking for players (no draw, no results)
  kind?: 'mixing' | 'match'
  club_id: string | null
  club?: { name: string } | null
  // false: an admin makes the draw by hand; the automatic one 3 hours before never acts on this event
  auto_draw?: boolean
  // Set when a draw has been published (also kept after "Rehacer"): from then on the draw is the admin's
  draw_published_at?: string | null
  // Header texts of the event page; null or empty keeps the defaults (see lib/event-title.ts)
  intro_eyebrow?: string | null
  intro_subtitle?: string | null
  // A published draw nobody may undo or change from the app (no Rehacer, no Cambiar parejas, no structural edit)
  draw_locked?: boolean

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
