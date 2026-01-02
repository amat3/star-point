'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Check, ChevronsUpDown, PlusCircle, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { PlayerSelect } from '../shared/player-select'
import { ScoreInput } from '../shared/score-input'
import { PlayerOption } from '@/types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const isValidSet = (a: number, b: number, isSet3: boolean = false) => {
  // Padel estándar
  if (a === 6 && b >= 0 && b <= 4) return true;
  if (b === 6 && a >= 0 && a <= 4) return true;
  if (a === 7 && (b === 5 || b === 6)) return true;
  if (b === 7 && (a === 5 || a === 6)) return true;
  
  // Súper Tie-break o Match Tie-break (Set 3)
  // Permitimos cualquier marcador donde alguien llegue a 1 o más y haya un ganador claro (a != b)
  // para cubrir 1-0, 0-1 o incluso 10-8
  if (isSet3 && (a > 0 || b > 0) && a !== b) return true;
  
  return false;
}

const formSchema = z.object({
  player_a1: z.string().uuid({ message: "Selecciona un jugador" }),
  player_a2: z.string().uuid({ message: "Selecciona un jugador" }),
  player_b1: z.string().uuid({ message: "Selecciona un jugador" }),
  player_b2: z.string().uuid({ message: "Selecciona un jugador" }),
  set1_a: z.coerce.number().min(0).max(7),
  set1_b: z.coerce.number().min(0).max(7),
  set2_a: z.coerce.number().min(0).max(7),
  set2_b: z.coerce.number().min(0).max(7),
  set3_a: z.coerce.number().min(0).max(7).optional(),
  set3_b: z.coerce.number().min(0).max(7).optional(),
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

  // 2. Validación de Sets
  const s1 = isValidSet(data.set1_a, data.set1_b);
  const s2 = isValidSet(data.set2_a, data.set2_b);
  const s3 = data.set3_a !== undefined && data.set3_b !== undefined ? isValidSet(data.set3_a, data.set3_b, true) : false;

  if (!s1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set 1 no válido", path: ["set1_a"] });
  if (!s2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set 2 no válido", path: ["set2_a"] });

  // 3. Coherencia del Partido
  let setsA = 0;
  let setsB = 0;

  if (data.set1_a > data.set1_b) setsA++; else setsB++;
  if (data.set2_a > data.set2_b) setsA++; else setsB++;

  // Si van 2-0 o 0-2, el set 3 debe estar vacío o ser 0-0
  const isFinished2Sets = setsA === 2 || setsB === 2;
  if (isFinished2Sets) {
    if ((data.set3_a || 0) !== 0 || (data.set3_b || 0) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El partido terminó en 2 sets",
        path: ["set3_a"],
      });
    }
  } else {
    // Si van 1-1, el set 3 es obligatorio y debe ser válido
    if (!s3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set 3 obligatorio y válido",
        path: ["set3_a"],
      });
    } else {
      if (data.set3_a! > data.set3_b!) setsA++; else setsB++;
    }
  }

  // Verificar que alguien ganó exactamente 2 sets
  if (setsA !== 2 && setsB !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El partido debe tener un ganador a 2 sets",
      path: ["set2_b"],
    });
  }
})

// Local Profile removed

// Extracted component to manage state properly
// Helper component for Score with buttons

// Real-time Summary Component
function MatchSummary({ 
  form, 
  players,
  currentUserProfile 
}: { 
  form: any, 
  players: PlayerOption[],
  currentUserProfile: { id: string, role: string } | null
}) {
  const values = form.watch()
  const { 
    player_a1, player_a2, player_b1, player_b2,
    set1_a, set1_b, set2_a, set2_b, set3_a, set3_b 
  } = values

  const playersIds = [player_a1, player_a2, player_b1, player_b2].filter(Boolean)
  const allPlayersSelected = playersIds.length === 4
  const hasDuplicatePlayers = allPlayersSelected && (new Set(playersIds).size !== 4)
  const isCreatorInMatch = playersIds.includes(currentUserProfile?.id || "")
  const mustBeInMatchError = currentUserProfile?.role === 'player' && !isCreatorInMatch

  // 1. Mensajes de error de Selección
  if (!allPlayersSelected) {
    return mustBeInMatchError ? (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm font-medium flex items-center">
        <span className="mr-2">ℹ️</span> Como jugador, debes ser uno de los participantes.
      </div>
    ) : null
  }

  if (hasDuplicatePlayers) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm font-medium flex items-center">
        <span className="mr-2">⚠️</span> Hay jugadores duplicados
      </div>
    )
  }

  if (mustBeInMatchError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm font-medium flex items-center">
        <span className="mr-2">⚠️</span> Debes ser uno de los jugadores del partido
      </div>
    )
  }

  const p_a1 = players.find(p => p.id === player_a1)?.full_name || "Jugador 1"
  const p_a2 = players.find(p => p.id === player_a2)?.full_name || "Jugador 2"
  const p_b1 = players.find(p => p.id === player_b1)?.full_name || "Jugador 3"
  const p_b2 = players.find(p => p.id === player_b2)?.full_name || "Jugador 4"

  const s1Ok = isValidSet(set1_a, set1_b)
  const s2Ok = isValidSet(set2_a, set2_b)
  // s3 es activo si hay puntuación o si van empatados a sets
  const s3Active = (set3_a !== 0 || set3_b !== 0) || (s1Ok && s2Ok && (set1_a > set1_b !== set2_a > set2_b))
  const s3Ok = s3Active ? isValidSet(set3_a, set3_b, true) : true

  // Marcador inválido detectado
  const hasInvalidSet = !s1Ok || !s2Ok || (s3Active && !s3Ok)

  // Cálculo de sets
  let setsA = 0
  let setsB = 0
  if (s1Ok) { if (set1_a > set1_b) setsA++; else setsB++; }
  if (s2Ok) { if (set2_a > set2_b) setsA++; else setsB++; }
  
  const isDraw = setsA === 1 && setsB === 1
  if (isDraw && s3Ok && (set3_a !== 0 || set3_b !== 0)) {
     if (set3_a > set3_b) setsA++; else setsB++;
  }

  const winner = setsA === 2 ? "A" : setsB === 2 ? "B" : null
  const isFinished = winner !== null && !hasInvalidSet

  return (
    <div className="space-y-3 py-2">
      {hasInvalidSet && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm font-medium flex items-center">
          <span className="mr-2">⚠️</span> Marcador de set no válido
        </div>
      )}

      {isFinished && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-xl">🏆</div>
            <div className="font-bold text-green-800 dark:text-green-300">
              Ganadores: {winner === "A" ? `${p_a1} y ${p_a2}` : `${p_b1} y ${p_b2}`}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Por {winner === "A" ? setsA : setsB} sets a {winner === "A" ? setsB : setsA}
            </div>
          </div>
        </div>
      )}

      {!isFinished && !hasInvalidSet && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 p-3 rounded-lg text-center text-sm text-blue-700 dark:text-blue-400 italic">
          Esperando a que una pareja gane 2 sets...
        </div>
      )}
    </div>
  )
}

interface NewMatchFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NewMatchForm({ open: controlledOpen, onOpenChange: setControlledOpen, trigger }: NewMatchFormProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  
  const isOpen = controlledOpen ?? internalOpen
  const setOpen = setControlledOpen ?? setInternalOpen

  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string, role: string } | null>(null)
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
      const { data: allPlayers } = await supabase.from('profiles').select('id, full_name')
      if (allPlayers) setPlayers(allPlayers)
    }
    fetchData()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    mode: 'onChange',
    defaultValues: {
      set1_a: 0, set1_b: 0,
      set2_a: 0, set2_b: 0,
      set3_a: 0, set3_b: 0,
    },
  })

  // DEBUG: Seguimiento del estado del formulario
  console.log("DEBUG Form State:", {
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    values: form.watch(),
    role: currentUserProfile?.role,
    userId: currentUserProfile?.id
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submitted with values:", values)
    setIsSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error("No estás autenticado")
        return
      }

      // 1. Calcular cuántos SETS ganó cada uno (Lógica para el ranking)
      let sets_a = 0
      let sets_b = 0

      if (values.set1_a > values.set1_b) sets_a++
      else if (values.set1_b > values.set1_a) sets_b++

      if (values.set2_a > values.set2_b) sets_a++
      else if (values.set2_b > values.set2_a) sets_b++

      if (values.set3_a !== undefined && values.set3_b !== undefined) {
        if (values.set3_a > values.set3_b) sets_a++
        else if (values.set3_b > values.set3_a) sets_b++
      }

      // 2. Formatear el texto del resultado (Para mostrar en el historial)
      let scoreText = `${values.set1_a}-${values.set1_b} ${values.set2_a}-${values.set2_b}`
      if (values.set3_a! > 0 || values.set3_b! > 0) {
        scoreText += ` ${values.set3_a}-${values.set3_b}`
      }

      // 3. Insertar con los nombres de columna EXACTOS de la base de datos
      const { error } = await supabase.from('matches').insert({
        creator_id: user.id,
        player_a1: values.player_a1,
        player_a2: values.player_a2,
        player_b1: values.player_b1,
        player_b2: values.player_b2,
        sets_a: sets_a,           // Campo obligatorio en SQL
        sets_b: sets_b,           // Campo obligatorio en SQL
        score_details: scoreText, // Coincide con el alter table que hicimos
        status: 'pending',
      })

      if (error) {
        console.error("Error real de Supabase:", error.message)
        toast.error(`Error: ${error.message}`)
        return
      }

      toast.success("Partido registrado. Esperando validación del oponente.")
      setOpen(false)
      form.reset()
      router.refresh()

    } catch (error) {
      console.error("Error en el proceso:", error)
      toast.error("Error inesperado al guardar")
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
        <Button className="flex shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 px-3 sm:px-4">
          <PlusCircle className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Nuevo Partido</span>
          <span className="sr-only sm:hidden">Nuevo Partido</span>
        </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95%] rounded-lg max-w-[425px] overflow-y-auto max-h-[90vh] no-scrollbar">
        <DialogHeader>
          <DialogTitle>Registrar Resultado</DialogTitle>
          <DialogDescription>
            Ingresa los jugadores y el marcador del partido.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error("Form validation errors:", errors)
            toast.error("Faltan datos o hay errores en el formulario")
          })} className="space-y-4">
            
            <div className="space-y-4 rounded-lg border p-3 bg-primary/10 dark:bg-primary/20 border-primary/20">
              <h3 className="font-bold text-center text-primary">Pareja A</h3>
              <PlayerSelect name="player_a1" label="Jugador 1" form={form} players={players} />
              <PlayerSelect name="player_a2" label="Jugador 2" form={form} players={players} />
            </div>

            <div className="space-y-4 rounded-lg border p-3 bg-secondary/25 dark:bg-secondary/30 border-secondary/20">
              <h3 className="font-bold text-center text-secondary-foreground">Pareja B</h3>
              <PlayerSelect name="player_b1" label="Jugador 3" form={form} players={players} />
              <PlayerSelect name="player_b2" label="Jugador 4" form={form} players={players} />
            </div>

            <div className="space-y-2">
               <h3 className="text-sm font-medium text-center sm:text-left">Marcador (Sets)</h3>
               <div className="flex flex-wrap gap-4 items-center justify-center">
                   <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Set 1</span>
                     <ScoreInput name="set1_a" form={form} labelColor="text-indigo-600" />
                     <span>-</span>
                     <ScoreInput name="set1_b" form={form} labelColor="text-lime-600" />
                   </div>

                   <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Set 2</span>
                     <ScoreInput name="set2_a" form={form} labelColor="text-indigo-600" />
                     <span>-</span>
                     <ScoreInput name="set2_b" form={form} labelColor="text-lime-600" />
                   </div>

                   <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Set 3</span>
                     <ScoreInput name="set3_a" form={form} labelColor="text-blue-600" />
                     <span>-</span>
                     <ScoreInput name="set3_b" form={form} labelColor="text-lime-600" />
                   </div>
               </div>
            </div>

            <MatchSummary form={form} players={players} currentUserProfile={currentUserProfile} />

            <Button 
              type="submit" 
              className="w-full font-bold py-6 text-lg" 
              disabled={
                isSubmitting || 
                !form.formState.isValid || 
                (currentUserProfile?.role === 'player' && ![
                  form.watch('player_a1'), 
                  form.watch('player_a2'), 
                  form.watch('player_b1'), 
                  form.watch('player_b2')
                ].includes(currentUserProfile.id))
              }
              onClick={() => {
                if (!form.formState.isValid) {
                  console.log("DEBUG: Submit clicked but form is INVALID", form.formState.errors)
                  toast.error("El formulario contiene errores de validación")
                }
              }}
            >
              {isSubmitting ? "Guardando..." : "Guardar Partido"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
