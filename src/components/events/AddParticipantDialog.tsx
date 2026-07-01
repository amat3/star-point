'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { addParticipant } from '@/app/actions/events'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { toTitleCase } from '@/lib/utils'

interface AddParticipantDialogProps {
  eventId: string
  alreadyJoined: string[]
}

type Player = { id: string; full_name: string | null }

export function AddParticipantDialog({ eventId, alreadyJoined }: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_guest', false)
      .order('full_name')
      .then(({ data }) => {
        if (data) setPlayers(data.filter(p => !alreadyJoined.includes(p.id)))
      })
  }, [open, alreadyJoined])

  const handleSelect = async (player: Player) => {
    setAddingId(player.id)
    try {
      await addParticipant(eventId, player.id)
      toast.success(`${toTitleCase(player.full_name)} añadido al evento`)
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al añadir jugador')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Añadir jugador"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Añadir jugador</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Buscar jugador..." />
          <CommandList className="max-h-72">
            <CommandEmpty>No hay jugadores disponibles.</CommandEmpty>
            <CommandGroup>
              {players.map(player => (
                <CommandItem
                  key={player.id}
                  value={player.full_name ?? ''}
                  onSelect={() => handleSelect(player)}
                  disabled={addingId === player.id}
                  className="cursor-pointer"
                >
                  {addingId === player.id
                    ? <Check className="h-4 w-4 mr-2 animate-pulse" />
                    : <span className="w-6" />}
                  {toTitleCase(player.full_name)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
