import { Trophy, Swords } from 'lucide-react'

interface PlayerStatsCardProps {
  matchesPlayed: number
  gamesWon: number
  gamesLost: number
}

export function PlayerStatsCard({ matchesPlayed, gamesWon, gamesLost }: PlayerStatsCardProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 text-center">
      <div className="flex flex-col items-center gap-1 px-2">
        <Swords className="h-5 w-5 text-primary" />
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{matchesPlayed}</span>
        <span className="text-xs text-muted-foreground">Partidos jugados</span>
      </div>
      <div className="flex flex-col items-center gap-1 px-2">
        <Trophy className="h-5 w-5 text-green-500" />
        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{gamesWon}</span>
        <span className="text-xs text-muted-foreground">Juegos ganados</span>
      </div>
      <div className="flex flex-col items-center gap-1 px-2">
        <Trophy className="h-5 w-5 text-red-400 rotate-180" />
        <span className="text-2xl font-bold text-red-500 dark:text-red-400">{gamesLost}</span>
        <span className="text-xs text-muted-foreground">Juegos perdidos</span>
      </div>
    </div>
  )
}
