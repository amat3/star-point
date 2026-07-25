'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventMixingData, saveAllRounds } from '@/app/actions/mixing-generator'
import { generateMixingRound, MixingParticipant, RoundProposal, MixingConfig, ExclusionRule } from '@/lib/mixing-algorithm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Save } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toTitleCase } from '@/lib/utils'
import { COURT_NAMES } from '@/lib/constants'

// Swap manual en stand-by: se mantiene el código pero deshabilitado a petición del admin.
// Reactivar cambiando esto a `true`.
const SWAP_ENABLED = false

export default function GenerateMixPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [participants, setParticipants] = useState<MixingParticipant[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Multi-round state
  const [roundsCount, setRoundsCount] = useState(1)
  const [proposals, setProposals] = useState<RoundProposal[]>([])
  const [activeTab, setActiveTab] = useState("round-1")
  
  // Selection for swapping
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Config State
  const [config, setConfig] = useState<MixingConfig>({
    genderMode: 'open',
    balanceStrategy: 'similar_levels',
    avoidRepetition: true,
    forcePosition: true
  })

  const [exclusions, setExclusions] = useState<ExclusionRule[]>([])

  // Optional court names (shared across rounds)
  const [courtNames, setCourtNames] = useState<Record<number, string>>({})

  // Pending state for server actions
  const [isSaving, startTransition] = useTransition()

  // State for max spots for validation
  const [maxSpots, setMaxSpots] = useState(0)

  useEffect(() => {
    if (id) {
        console.log("Loading data for event ID:", id)
        loadData()
    } else {
        console.error("No ID found in params")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    try {
      console.log("Calling getEventMixingData...")
      const { participants: data, max_spots, rounds, exclusions: excl } = await getEventMixingData(id)
      console.log("Data received:", { count: data.length, max_spots, rounds })

      setParticipants(data)
      setMaxSpots(max_spots)
      setRoundsCount(rounds)
      setExclusions(excl)
    } catch (error) {
      toast.error(`Error cargando: ${error instanceof Error ? error.message : String(error)}`)
      console.error("LoadData Error:", error)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleGenerate() {
    try {
        if (participants.length < 4) {
          toast.error('Necesitas al menos 4 jugadores para generar una ronda')
          return
        }

        if (participants.length < maxSpots) {
            const missing = maxSpots - participants.length
            toast.error(`El evento no está completo (faltan ${missing}). Añade jugadores o invitados desde el dashboard antes de generar.`)
            return
        }

        const newProposals: RoundProposal[] = []
        
        console.log("Cloning participants...")
        // Deep clone to avoid mutating state directly and to reset for calculation
        const currentParticipants: MixingParticipant[] = JSON.parse(JSON.stringify(participants))

        console.log("Starting loop", roundsCount)
        for (let i = 0; i < roundsCount; i++) {
            console.log("Generating round", i + 1)
            const result = generateMixingRound(currentParticipants, { ...config, exclusions })
            console.log("Round result", result)
            newProposals.push(result)
            
            // Update history for next round
            result.matches.forEach(m => {
                 const updateHistory = (pid: string, partnerId: string, opponents: string[]) => {
                    const p = currentParticipants.find(cp => cp.id === pid)
                    if (p) {
                        if (!p.past_partners.includes(partnerId)) p.past_partners.push(partnerId)
                        if (!p.current_event_partners.includes(partnerId)) p.current_event_partners.push(partnerId)
                        opponents.forEach(oid => {
                            if (!p.past_opponents.includes(oid)) p.past_opponents.push(oid)
                        })
                    }
                 }

                 // Update for all 4 players
                 // P1: Partner P2, Opponents P3, P4
                 updateHistory(m.player1.id, m.player2.id, [m.player3.id, m.player4.id])
                 // P2: Partner P1, Opponents P3, P4
                 updateHistory(m.player2.id, m.player1.id, [m.player3.id, m.player4.id])
                 // P3: Partner P4, Opponents P1, P2
                 updateHistory(m.player3.id, m.player4.id, [m.player1.id, m.player2.id])
                 // P4: Partner P3, Opponents P1, P2
                 updateHistory(m.player4.id, m.player3.id, [m.player1.id, m.player2.id])
            })
        }

        console.log("Setting proposals", newProposals)
        setProposals(newProposals)
        setSelectedPlayerId(null)
        setActiveTab("round-1")
        toast.success(`${roundsCount} rondas generadas`)
    } catch (e) {
        console.error("CRITICAL ERROR IN GENERATE:", e)
        toast.error(`Error crítico: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  function handleSwap(roundIndex: number, targetPlayerId: string) {
    if (!selectedPlayerId) return
    const proposal = proposals[roundIndex]
    if (!proposal) return

    // Find the two players locations
    const newMatches = [...proposal.matches]
    
    // Helper to find player coords
    const findCoords = (pid: string) => {
        for (let mIdx = 0; mIdx < newMatches.length; mIdx++) {
            const match = newMatches[mIdx]
            const players = [match.player1, match.player2, match.player3, match.player4]
            const pIdx = players.findIndex(p => p.id === pid)
            if (pIdx !== -1) return { mIdx, pIdx }
        }
        return null
    }

    const c1 = findCoords(selectedPlayerId)
    const c2 = findCoords(targetPlayerId)

    if (c1 && c2 && c1.mIdx !== c2.mIdx) {
        // Un swap entre pistas distintas deshace el balance de nivel, la
        // complementariedad de posición y las exclusiones que el algoritmo
        // calculó para ese grupo de 4 concreto — solo se permite reordenar
        // parejas dentro del mismo partido/pista.
        toast.error('Solo puedes intercambiar jugadores dentro de la misma pista')
        setSelectedPlayerId(null)
        return
    }

    if (c1 && c2) {
        // c1.mIdx === c2.mIdx garantizado por el chequeo anterior: siempre es
        // un reordenamiento dentro del mismo partido/pista.
        const m1 = { ...newMatches[c1.mIdx] }
        newMatches[c1.mIdx] = m1
        const m2 = m1

        type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4'
        const playerKeys: PlayerKey[] = ['player1', 'player2', 'player3', 'player4']
        const p1Val = m1[playerKeys[c1.pIdx]]
        const p2Val = m2[playerKeys[c2.pIdx]]

        m1[playerKeys[c1.pIdx]] = p2Val
        m2[playerKeys[c2.pIdx]] = p1Val

        m1.pairA = [m1.player1, m1.player2]
        m1.pairB = [m1.player3, m1.player4]
        m2.pairA = [m2.player1, m2.player2]
        m2.pairB = [m2.player3, m2.player4]

        const updatedProposals = [...proposals]
        updatedProposals[roundIndex] = { ...proposal, matches: newMatches }
        setProposals(updatedProposals)
        toast.success('Jugadores intercambiados')
    } else {
        toast.error('No se pudo realizar el intercambio')
    }
    
    setSelectedPlayerId(null)
  }

  function handleSave() {
    if (proposals.length === 0) return

    startTransition(async () => {
      try {
        const rounds = proposals.map((proposal, index) => ({
          matches: proposal.matches,
          roundNumber: index + 1
        }))
        await saveAllRounds(id, rounds, courtNames)
        toast.success('Rondas publicadas exitosamente')
        router.push(`/dashboard`)
      } catch (e) {
        toast.error('Error guardando las rondas')
        console.error(e)
      }
    })
  }

  if (loadingData) {
    return <div className="p-8 flex justify-center"><ThinkingOrb state="composing" size={64} theme="auto" aria-label="Cargando…" /></div>
  }

  const assignedNames = Object.values(courtNames).filter(Boolean)
  const hasDuplicateCourtNames = assignedNames.length !== new Set(assignedNames).size
  const firstDuplicate = assignedNames.find((n, i) => assignedNames.indexOf(n) !== i)

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Generador de Mixings</h1>
            <span className={`text-sm ${participants.length < maxSpots ? 'text-destructive' : 'text-green-600'}`}>
                {participants.length}/{maxSpots} Jugadores (Titulares) • {roundsCount} Rondas
            </span>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Generación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            
            {/* Strategy */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Estrategia</label>
                <div className="flex gap-2">
                    <Button 
                        variant={config.balanceStrategy === 'similar_levels' ? 'default' : 'outline'}
                        onClick={() => setConfig({...config, balanceStrategy: 'similar_levels'})}
                        size="sm"
                    >
                        Niveles Similares
                    </Button>
                    <Button
                        variant={config.balanceStrategy === 'pro_am' ? 'default' : 'outline'}
                        onClick={() => setConfig({...config, balanceStrategy: 'pro_am'})}
                        size="sm"
                    >
                        Serpentín
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {config.balanceStrategy === 'similar_levels'
                        ? 'Agrupa por nivel: los mejores en la misma pista, los peores en la misma pista.'
                        : 'El mejor se empareja con el peor, el 2º con el 11º, etc. Mezcla todos los niveles en todas las pistas.'
                    }
                </p>
            </div>

            {/* Repetition */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Evitar Repetición</label>
                <div className="flex gap-2">
                     <Button 
                        variant={config.avoidRepetition ? 'default' : 'outline'}
                        onClick={() => setConfig({...config, avoidRepetition: !config.avoidRepetition})}
                        size="sm"
                    >
                        {config.avoidRepetition ? 'Activado' : 'Desactivado'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Prioriza que no repitan pareja los mismos jugadores en este evento.
                </p>
            </div>

            {/* Force Position */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Respetar Posición en Pista</label>
                 <div className="flex gap-2">
                     <Button 
                        variant={config.forcePosition ? 'default' : 'outline'}
                        onClick={() => setConfig({...config, forcePosition: !config.forcePosition})}
                        size="sm"
                    >
                        {config.forcePosition ? 'Activado' : 'Desactivado'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Busca parejas complementarias (Drive + Revés) y evita juntar a dos jugadores del mismo lado.
                </p>
            </div>

          </div>

          <Button
            onClick={handleGenerate}
            className="w-full mt-4"
            size="lg"
            disabled={participants.length < maxSpots}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Generar {roundsCount} Rondas
          </Button>
          {participants.length < maxSpots && (
            <p className="text-xs text-destructive text-center mt-1">
              Faltan {maxSpots - participants.length} jugadores para completar el evento. Añade jugadores o invitados desde el dashboard.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {proposals.length > 0 && (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Propuesta Generada</h2>
                <Button onClick={handleSave} disabled={isSaving || hasDuplicateCourtNames} className="bg-green-600 hover:bg-green-700 disabled:opacity-50">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Guardando...' : `Publicar ${proposals.flatMap(p => p.matches).length} Partidos`}
                </Button>
              </div>
              {hasDuplicateCourtNames && (
                <p className="text-sm text-destructive text-right">
                  El nombre <strong>{firstDuplicate}</strong> está asignado a más de una pista. Cada pista debe tener un nombre único.
                </p>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${roundsCount}, 1fr)` }}>
                    {proposals.map((_, idx) => (
                        <TabsTrigger key={idx} value={`round-${idx + 1}`}>Ronda {idx + 1}</TabsTrigger>
                    ))}
                </TabsList>
                
                {proposals.map((proposal, rIdx) => (
                    <TabsContent key={rIdx} value={`round-${rIdx + 1}`} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {proposal.matches.map((match, mIdx) => {
                                const availableCourtNames = COURT_NAMES.filter(name =>
                                    name === courtNames[match.courtNumber] || !assignedNames.includes(name)
                                )
                                return (
                                <Card key={mIdx} className={`border-2 ${match.warning ? 'border-red-400 dark:border-red-700' : 'border-primary/10'}`}>
                                    <CardHeader className="pb-2 bg-muted/30">
                                        <CardTitle className="text-sm font-bold text-center flex flex-col items-center gap-2">
                                            <span>Pista {match.courtNumber}</span>
                                            {match.warning && (
                                                <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800 rounded px-2 py-0.5 normal-case">
                                                    ⚠️ {match.warning}
                                                </span>
                                            )}
                                            <Select
                                                value={courtNames[match.courtNumber] ?? ''}
                                                onValueChange={(val) => setCourtNames(prev => ({ ...prev, [match.courtNumber]: val }))}
                                            >
                                                <SelectTrigger className="h-7 text-xs font-normal max-w-45">
                                                    <SelectValue placeholder="Nombre pista..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableCourtNames.map(name => (
                                                        <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                    <div className="flex flex-col items-center gap-2">
                                        {/* Team A */}
                                        <div className="w-full flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                                            <PlayerItem
                                                player={match.pairA[0]}
                                                isSelected={selectedPlayerId === match.pairA[0].id}
                                                onSelect={SWAP_ENABLED ? () => selectedPlayerId === match.pairA[0].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairA[0].id) : setSelectedPlayerId(match.pairA[0].id)) : undefined}
                                            />
                                            <div className="w-px self-stretch bg-blue-200 dark:bg-blue-800" />
                                            <PlayerItem
                                                player={match.pairA[1]}
                                                isSelected={selectedPlayerId === match.pairA[1].id}
                                                onSelect={SWAP_ENABLED ? () => selectedPlayerId === match.pairA[1].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairA[1].id) : setSelectedPlayerId(match.pairA[1].id)) : undefined}
                                            />
                                        </div>

                                        {/* VS */}
                                        <span className="text-xl font-black text-muted-foreground/50 leading-none">VS</span>

                                        {/* Team B */}
                                        <div className="w-full flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                                            <PlayerItem
                                                player={match.pairB[0]}
                                                isSelected={selectedPlayerId === match.pairB[0].id}
                                                onSelect={SWAP_ENABLED ? () => selectedPlayerId === match.pairB[0].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairB[0].id) : setSelectedPlayerId(match.pairB[0].id)) : undefined}
                                            />
                                            <div className="w-px self-stretch bg-red-200 dark:bg-red-800" />
                                            <PlayerItem
                                                player={match.pairB[1]}
                                                isSelected={selectedPlayerId === match.pairB[1].id}
                                                onSelect={SWAP_ENABLED ? () => selectedPlayerId === match.pairB[1].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairB[1].id) : setSelectedPlayerId(match.pairB[1].id)) : undefined}
                                            />
                                        </div>
                                    </div>
                                    </CardContent>
                                </Card>
                                )
                            })}
                        </div>

                        {proposal.leftovers.length > 0 && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
                                <h3 className="font-bold text-yellow-800 dark:text-yellow-200">Jugadores sin asignar:</h3>
                                <ul>
                                    {proposal.leftovers.map(l => (
                                        <li key={l.id}>{toTitleCase(l.full_name)} ({l.rating})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
      )}
    </div>
  )
}

function PlayerItem({ player, isSelected, onSelect }: { player: MixingParticipant, isSelected: boolean, onSelect?: () => void }) {
    if (!player) return <div>Empty</div>

    return (
        <div
            onClick={onSelect}
            className={`
                flex-1 min-w-0 flex flex-col items-center gap-1 p-2 rounded transition-all
                ${onSelect ? 'cursor-pointer' : ''}
                ${isSelected ? 'ring-2 ring-primary bg-primary/10' : onSelect ? 'hover:bg-accent' : ''}
            `}
        >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-lime-500">
                <AvatarImage src={player.avatar_url ?? undefined} />
                <AvatarFallback className="bg-lime-100 text-lime-800 text-xs font-bold">
                    {player.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="font-bold text-xs sm:text-sm truncate w-full text-center min-w-0" title={player.full_name}>
                {toTitleCase(player.full_name)}
            </div>
            <div className="flex gap-1 text-[10px] text-muted-foreground">
                <span>{player.rating.toFixed(1)}</span>
                <span>•</span>
                <span className="uppercase">{player.court_position === 'ambos' ? 'MIX' : player.court_position === 'drive' ? 'DRV' : 'REV'}</span>
            </div>
        </div>
    )
}

