import type { CourtPlayer } from '@/components/molecules/CourtCard'

export type DrawMatchStatus = 'pending' | 'confirmed' | 'disputed' | 'expired'

// One match of the draw, already oriented for display (teamA is the viewer's team
// for their own match). Built on the server so other people's data never reaches
// a player's browser.
export interface DrawMatch {
  id: string
  round: number
  title: string
  mine: boolean
  status: DrawMatchStatus
  // Total games as shown (teamA vs teamB); null while there is no result
  games: { a: number; b: number } | null
  // Pending result entered by the rival: waiting for the viewer / for the rival
  waitingForMe: boolean
  waitingForRival: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  // Raw data for the score dialog
  dialogMatch: {
    id: string
    score_details: string
    p_a1: { full_name: string | null } | null
    p_a2: { full_name: string | null } | null
    p_b1: { full_name: string | null } | null
    p_b2: { full_name: string | null } | null
  }
}

export interface DrawRound {
  number: number
  matches: DrawMatch[]
}
