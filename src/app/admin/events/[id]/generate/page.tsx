'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventMixingData, saveRoundMatches } from '@/app/actions/mixing-generator'
import { generateMixingRound, MixingParticipant, RoundProposal, MixingConfig } from '@/lib/mixing-algorithm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, RefreshCw, Save, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageProps {
  params: any // Deprecated in client components usually
}

export default function GenerateMixPage({ params: propParams }: PageProps) {
  const router = useRouter()
  // Safer way to get params in client component
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
  }, [id])

  async function loadData() {
    try {
      console.log("Calling getEventMixingData...")
      const { participants: data, max_spots, rounds } = await getEventMixingData(id)
      console.log("Data received:", { count: data.length, max_spots, rounds })
      
      // Convert serialized Array back to Set
      const participantsWithSets = data.map((p: any) => ({
          ...p,
          past_partners: new Set(p.past_partners)
      }))
      setParticipants(participantsWithSets)
      setMaxSpots(max_spots)
      setRoundsCount(rounds)
    } catch (error: any) {
      toast.error(`Error cargando: ${error.message}`)
      console.error("LoadData Error:", error)
    } finally {
      setLoadingData(false)
    }
  }

  function handleGenerate() {
    console.log("HANDLE GENERATE CLICKED")
    try {
        if (participants.length < 4) {
          console.log("Not enough participants")
          toast.error('Necesitas al menos 4 jugadores para generar una ronda')
          return
        }
        
        console.log("Checking maxSpots", participants.length, maxSpots)
        if (participants.length < maxSpots) {
            toast.error(`La lista no está completa (${participants.length}/${maxSpots}). Faltan jugadores.`)
            return
        }

        const newProposals: RoundProposal[] = []
        
        console.log("Cloning participants...")
        let currentParticipants: MixingParticipant[] = participants.map(p => ({
            ...p,
            past_partners: new Set(p.past_partners)
        }))

        console.log("Starting loop", roundsCount)
        for (let i = 0; i < roundsCount; i++) {
            console.log("Generating round", i + 1)
            const result = generateMixingRound(currentParticipants, config)
            console.log("Round result", result)
            newProposals.push(result)
            
            // Update history for next round
            result.matches.forEach(m => {
                 currentParticipants.find(p => p.id === m.player1.id)?.past_partners.add(m.player2.id)
                 currentParticipants.find(p => p.id === m.player2.id)?.past_partners.add(m.player1.id)
                 
                 currentParticipants.find(p => p.id === m.player3.id)?.past_partners.add(m.player4.id)
                 currentParticipants.find(p => p.id === m.player4.id)?.past_partners.add(m.player3.id)
            })
        }

        console.log("Setting proposals", newProposals)
        setProposals(newProposals)
        setSelectedPlayerId(null)
        setActiveTab("round-1")
        toast.success(`${roundsCount} rondas generadas`)
    } catch (e: any) {
        console.error("CRITICAL ERROR IN GENERATE:", e)
        toast.error(`Error crítico: ${e.message}`)
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

    if (c1 && c2) {
        const match1 = newMatches[c1.mIdx]
        const match2 = newMatches[c2.mIdx]
        
        const getP = (m: any, idx: number) => {
             if (idx === 0) return m.player1
             if (idx === 1) return m.player2
             if (idx === 2) return m.player3
             return m.player4
        }
        const setP = (m: any, idx: number, val: any) => {
             if (idx === 0) m.player1 = val
             if (idx === 1) m.player2 = val
             if (idx === 2) m.player3 = val
             if (idx === 3) m.player4 = val
        }

        const p1Val = getP(match1, c1.pIdx)
        const p2Val = getP(match2, c2.pIdx)

        setP(match1, c1.pIdx, p2Val)
        setP(match2, c2.pIdx, p1Val)

        // Re-construct pairs roughly
        match1.pairA = [match1.player1, match1.player2]
        match1.pairB = [match1.player3, match1.player4]
        match2.pairA = [match2.player1, match2.player2]
        match2.pairB = [match2.player3, match2.player4]

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
            // Flatten all matches from all rounds
            const allMatches = proposals.flatMap(p => p.matches)
            for (const [index, proposal] of proposals.entries()) {
                await saveRoundMatches(id, proposal.matches, index + 1)
            }
            toast.success('Rondas publicadas exitosamente')
            router.push(`/dashboard`)
        } catch (e) {
            toast.error('Error guardando las rondas')
            console.error(e)
        }
    })
  }

  if (loadingData) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

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
                        Pro-Am
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {config.balanceStrategy === 'similar_levels' 
                        ? 'Equilibra la media de las parejas (A vs B) para partidos reñidos.' 
                        : 'Junta al mejor de la pista con el de menor nivel (1º+4º vs 2º+3º).'
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

          <Button onClick={handleGenerate} className="w-full mt-4" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" /> Generar {roundsCount} Rondas
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {proposals.length > 0 && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Propuesta Generada</h2>
                <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                    <Save className="mr-2 h-4 w-4" /> 
                    {isSaving ? 'Guardando...' : `Publicar ${proposals.flatMap(p => p.matches).length} Partidos`}
                </Button>
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
                            {proposal.matches.map((match, mIdx) => (
                                <Card key={mIdx} className="border-2 border-primary/10">
                                    <CardHeader className="pb-2 bg-muted/30">
                                        <CardTitle className="text-sm font-bold text-center">Pista {match.courtNumber}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Team A */}
                                            <div className="flex-1 flex flex-col gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                                                <PlayerItem 
                                                    player={match.pairA[0]} 
                                                    isSelected={selectedPlayerId === match.pairA[0].id}
                                                    onSelect={() => selectedPlayerId === match.pairA[0].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairA[0].id) : setSelectedPlayerId(match.pairA[0].id))}
                                                />
                                                <div className="h-px bg-blue-200 dark:bg-blue-800 w-full" />
                                                <PlayerItem 
                                                    player={match.pairA[1]} 
                                                    isSelected={selectedPlayerId === match.pairA[1].id}
                                                    onSelect={() => selectedPlayerId === match.pairA[1].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairA[1].id) : setSelectedPlayerId(match.pairA[1].id))}
                                                />
                                            </div>

                                            {/* VS */}
                                            <div className="flex flex-col items-center justify-center px-1">
                                                <span className="text-xl font-black text-muted-foreground/50">VS</span>
                                            </div>

                                            {/* Team B */}
                                            <div className="flex-1 flex flex-col gap-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                                                <PlayerItem 
                                                    player={match.pairB[0]} 
                                                    isSelected={selectedPlayerId === match.pairB[0].id}
                                                    onSelect={() => selectedPlayerId === match.pairB[0].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairB[0].id) : setSelectedPlayerId(match.pairB[0].id))}
                                                />
                                                <div className="h-px bg-red-200 dark:bg-red-800 w-full" />
                                                <PlayerItem 
                                                    player={match.pairB[1]} 
                                                    isSelected={selectedPlayerId === match.pairB[1].id}
                                                    onSelect={() => selectedPlayerId === match.pairB[1].id ? setSelectedPlayerId(null) : (selectedPlayerId ? handleSwap(rIdx, match.pairB[1].id) : setSelectedPlayerId(match.pairB[1].id))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {proposal.leftovers.length > 0 && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
                                <h3 className="font-bold text-yellow-800 dark:text-yellow-200">Jugadores sin asignar:</h3>
                                <ul>
                                    {proposal.leftovers.map(l => (
                                        <li key={l.id}>{l.full_name} ({l.rating})</li>
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

function PlayerItem({ player, isSelected, onSelect }: { player: MixingParticipant, isSelected: boolean, onSelect: () => void }) {
    if (!player) return <div>Empty</div>
    
    return (
        <div 
            onClick={onSelect}
            className={`
                flex-1 flex flex-col items-center p-2 rounded cursor-pointer transition-all
                ${isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-accent'}
            `}
        >
            <div className="font-bold text-xs sm:text-sm truncate w-full text-center" title={player.full_name}>
                {player.full_name}
            </div>
            <div className="flex gap-1 text-[10px] text-muted-foreground">
                <span>{player.rating.toFixed(1)}</span>
                <span>•</span>
                <span className="uppercase">{player.court_position === 'ambos' ? 'MIX' : player.court_position === 'drive' ? 'DRV' : 'REV'}</span>
            </div>
        </div>
    )
}

