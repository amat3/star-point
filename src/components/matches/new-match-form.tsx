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
}).refine((data) => {
  const players = [data.player_a1, data.player_a2, data.player_b1, data.player_b2]
  const uniquePlayers = new Set(players)
  return uniquePlayers.size === 4
}, {
  message: "Los jugadores deben ser distintos",
  path: ["player_a2"], // Show error on 2nd player of pair A for simplicity, or generic
})

interface Profile {
  id: string
  full_name: string
}

// Extracted component to manage state properly
function PlayerSelect({ 
  name, 
  label, 
  form, 
  players 
}: { 
  name: "player_a1" | "player_a2" | "player_b1" | "player_b2", 
  label: string,
  form: any,
  players: Profile[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value
                    ? players.find((player) => player.id === field.value)?.full_name
                    : "Seleccionar jugador"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Buscar jugador..." />
                <CommandList>
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup>
                    {players.map((player) => (
                      <CommandItem
                        value={player.full_name}
                        key={player.id}
                        onSelect={() => {
                          form.setValue(name, player.id)
                          setOpen(false) // Close popover on selection
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            player.id === field.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {player.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Helper component for Score with buttons
function ScoreInput({ 
  name, 
  form, 
  labelColor 
}: { 
  name: "set1_a" | "set1_b" | "set2_a" | "set2_b" | "set3_a" | "set3_b", 
  form: any,
  labelColor: string
}) {
  const value = form.watch(name) ?? 0

  const updateValue = (delta: number) => {
    const newValue = Math.max(0, Math.min(7, (Number(value) || 0) + delta))
    form.setValue(name, newValue, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col items-center space-y-1">
      <span className={cn("text-xs font-bold", labelColor)}>{name.endsWith('_a') ? 'A' : 'B'}</span>
      <div className="flex items-center border rounded-md overflow-hidden bg-white dark:bg-gray-950">
        <button
          type="button"
          onClick={() => updateValue(-1)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
        <div className="w-8 sm:w-10 h-8 flex items-center justify-center border-x text-sm font-medium">
          {value}
        </div>
        <button
          type="button"
          onClick={() => updateValue(1)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  )
}

export function NewMatchForm() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [players, setPlayers] = useState<Profile[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name')
      if (data) setPlayers(data)
    }
    fetchPlayers()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      set1_a: 0, set1_b: 0,
      set2_a: 0, set2_b: 0,
      set3_a: 0, set3_b: 0,
    },
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Partido
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] rounded-lg max-w-[425px] overflow-y-auto max-h-[90vh]">
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
            
            <div className="space-y-4 rounded-lg border p-3">
              <h3 className="font-medium text-center text-blue-600">Pareja A</h3>
              <PlayerSelect name="player_a1" label="Jugador 1" form={form} players={players} />
              <PlayerSelect name="player_a2" label="Jugador 2" form={form} players={players} />
            </div>

            <div className="space-y-4 rounded-lg border p-3">
              <h3 className="font-medium text-center text-lime-600">Pareja B</h3>
              <PlayerSelect name="player_b1" label="Jugador 3" form={form} players={players} />
              <PlayerSelect name="player_b2" label="Jugador 4" form={form} players={players} />
            </div>

            <div className="space-y-2">
               <h3 className="text-sm font-medium text-center sm:text-left">Marcador (Sets)</h3>
               <div className="flex flex-wrap gap-4 items-center justify-center">
                   <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Set 1</span>
                     <ScoreInput name="set1_a" form={form} labelColor="text-blue-600" />
                     <span>-</span>
                     <ScoreInput name="set1_b" form={form} labelColor="text-lime-600" />
                   </div>

                   <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">Set 2</span>
                     <ScoreInput name="set2_a" form={form} labelColor="text-blue-600" />
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Partido"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
