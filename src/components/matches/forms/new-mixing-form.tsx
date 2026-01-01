'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PlayerSelect } from '../shared/player-select'
import { ScoreInput } from '../shared/score-input'
import { PlayerOption } from '@/types'

const formSchema = z.object({
  player_a1: z.string().uuid({ message: "Selecciona un jugador" }),
  player_a2: z.string().uuid({ message: "Selecciona un jugador" }),
  player_b1: z.string().uuid({ message: "Selecciona un jugador" }),
  player_b2: z.string().uuid({ message: "Selecciona un jugador" }),
  games_a: z.coerce.number().min(0, "Mínimo 0"),
  games_b: z.coerce.number().min(0, "Mínimo 0"),
}).superRefine((data, ctx) => {
  // 1. Jugadores distintos
  const players = [data.player_a1, data.player_a2, data.player_b1, data.player_b2]
  if (new Set(players).size !== 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Los jugadores deben ser distintos",
      path: ["player_a2"],
    })
  }

  // 2. Empate no permitido en Mixing (para simplificar ranking)
  if (data.games_a === data.games_b) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El empate no está permitido en Mixing",
        path: ["games_b"],
      })
  }
})

interface NewMixingFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NewMixingForm({ open: controlledOpen, onOpenChange: setControlledOpen, trigger }: NewMixingFormProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string, role: string } | null>(null)
  const isOpen = controlledOpen ?? internalOpen
  const setOpen = setControlledOpen ?? setInternalOpen

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
       // 1. Fetch current user & role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()
        if (profile) setCurrentUserProfile(profile)
      }

      // 2. Fetch all players
      const { data } = await supabase.from('profiles').select('id, full_name')
      if (data) setPlayers(data)
    }
    fetchData()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      games_a: 0,
      games_b: 0,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Debes iniciar sesión")
        return
      }

      // Preparar datos para Mixing
      // No hay sets, enviamos 0. Score details es "GamesA-GamesB"
      const scoreText = `${values.games_a}-${values.games_b}`
      
      const { error } = await supabase.from('matches').insert({
        creator_id: user.id,
        player_a1: values.player_a1,
        player_a2: values.player_a2,
        player_b1: values.player_b1,
        player_b2: values.player_b2,
        sets_a: 0, // No aplica
        sets_b: 0, // No aplica
        score_details: scoreText,
        match_type: 'mixing',
        status: 'pending',
      })

      if (error) throw error

      toast.success("Mixing registrado con éxito")
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Error al guardar")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            {trigger || (
                <Button variant="secondary" className="gap-2">
                    <Shuffle className="w-4 h-4" />
                    Nuevo Mixing
                </Button>
            )}
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Registrar Mixing</DialogTitle>
          <DialogDescription>
            Introduce juego total. Mayor número de juegos gana.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* EQUIPO A */}
            <div className="space-y-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                <h3 className="font-bold text-center text-indigo-700 dark:text-indigo-400 text-sm uppercase">Pareja A</h3>
                <PlayerSelect name="player_a1" label="Jugador 1" form={form} players={players} />
                <PlayerSelect name="player_a2" label="Jugador 2" form={form} players={players} />
            </div>

            {/* VS Divider */}
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <span className="relative bg-background px-2 text-xs text-muted-foreground font-bold">VS</span>
            </div>

            {/* EQUIPO B */}
            <div className="space-y-3 p-3 bg-lime-50/50 dark:bg-lime-900/10 rounded-lg border border-lime-100 dark:border-lime-900/20">
                <h3 className="font-bold text-center text-lime-700 dark:text-lime-400 text-sm uppercase">Pareja B</h3>
                <PlayerSelect name="player_b1" label="Jugador 3" form={form} players={players} />
                <PlayerSelect name="player_b2" label="Jugador 4" form={form} players={players} />
            </div>

            {/* MARCADOR (Estilo Horizontal) */}
            <div className="pt-2 border-t">
              <h3 className="text-sm font-medium text-center mb-3 text-gray-500 uppercase tracking-wider">Resultado Final</h3>
              
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                {/* Score A */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-indigo-600">A</span>
                  <ScoreInput name="games_a" form={form} labelColor="hidden" max={50} />
                </div>

                <div className="text-sm font-black text-gray-300">VS</div>

                {/* Score B */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-lime-600">B</span>
                  <ScoreInput name="games_b" form={form} labelColor="hidden" max={50} />
                </div>
              </div>
            </div>

            {/* Validation Feedback */}
            {(() => {
                const values = form.watch()
                const selectedIds = [values.player_a1, values.player_a2, values.player_b1, values.player_b2].filter(Boolean)
                const uniqueIds = new Set(selectedIds)
                const hasDuplicates = selectedIds.length === 4 && uniqueIds.size !== 4
                const isPlayer = currentUserProfile?.role === 'player'
                const isSelfIncluded = currentUserProfile && selectedIds.includes(currentUserProfile.id)
                const missingSelfError = isPlayer && !isSelfIncluded && selectedIds.length === 4

                if (hasDuplicates) {
                    return (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm font-medium flex items-center">
                            <span className="mr-2">⚠️</span> Hay jugadores duplicados
                        </div>
                    )
                }

                if (missingSelfError) {
                    return (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm font-medium flex items-center">
                            <span className="mr-2">ℹ️</span> Como jugador, debes participar en el mixing.
                        </div>
                    )
                }
                return null
            })()}

            <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                disabled={(() => {
                    const values = form.watch()
                    const selectedIds = [values.player_a1, values.player_a2, values.player_b1, values.player_b2].filter(Boolean)
                    const isPlayer = currentUserProfile?.role === 'player'
                    const isSelfIncluded = currentUserProfile && selectedIds.includes(currentUserProfile.id)
                    
                    return isSubmitting || (isPlayer && !isSelfIncluded)
                })()}
            >
              {isSubmitting ? "Guardando..." : "Guardar Mixing"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
