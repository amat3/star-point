import type { PendingAction } from '@/app/actions/matches'

// Design fixtures shown only to admins to check layouts. Never hits the database.
export const SAMPLE_ID_PREFIX = 'sample-'

const names = (a: string, b: string) => ({ full_name: `${a} ${b}` })

const base = (id: string, rest: Omit<PendingAction, 'id' | 'match'>): PendingAction => ({
  id: `${SAMPLE_ID_PREFIX}${id}`,
  ...rest,
  match: {
    id: `${SAMPLE_ID_PREFIX}${id}`,
    score_details: rest.games ? `${rest.games.mine}-${rest.games.theirs}` : '0-0',
    p_a1: names('Lucía', 'Pérez'),
    p_a2: names(rest.partnerName ?? 'Ana', 'Ruiz'),
    p_b1: names(rest.opponents[0], 'López'),
    p_b2: names(rest.opponents[1], 'García'),
  },
})

export const SAMPLE_PENDING_ACTIONS: PendingAction[] = [
  base('confirm-1', {
    kind: 'confirm',
    when: 'Hoy',
    partnerName: 'Ana',
    myTeam: ['Lucía', 'Ana'],
    opponents: ['Marta', 'Inés'],
    games: { mine: 8, theirs: 5 },
    courtLabel: 'Jafrisur · Ronda 1',
  }),
  base('confirm-2', {
    kind: 'confirm',
    when: 'Ayer',
    partnerName: 'Juan Antonio',
    myTeam: ['Lucía', 'Juan Antonio'],
    opponents: ['María Guadalupe', 'Cristobalina'],
    games: { mine: 2, theirs: 8 },
    courtLabel: 'Clínica Dr. Manuel Campaña · Ronda 3',
  }),
  base('record-1', {
    kind: 'record',
    when: 'Hoy',
    partnerName: 'Pedro',
    myTeam: ['Lucía', 'Pedro'],
    opponents: ['Marta', 'Inés'],
    games: null,
    courtLabel: 'Pista 1 · Ronda 2',
  }),
  base('record-2', {
    kind: 'record',
    when: 'Hace 3 días',
    partnerName: null,
    myTeam: ['Lucía', 'Jugador'],
    opponents: ['Alejandro', 'Sofía'],
    games: null,
    courtLabel: null,
  }),
]
