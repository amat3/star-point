'use client'

import { useState } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm = import('react-hook-form').UseFormReturn<any>
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn, toTitleCase } from '@/lib/utils'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PlayerOption } from '@/types'

export function PlayerSelect({
  name,
  label,
  form,
  players
}: {
  name: string
  label: string
  form: AnyForm
  players: PlayerOption[]
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
                    ? toTitleCase(players.find((player) => player.id === field.value)?.full_name)
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
                        value={player.full_name || ""}
                        key={player.id}
                        onSelect={() => {
                          form.setValue(name, player.id, { shouldValidate: true })
                          setOpen(false) 
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
                        {toTitleCase(player.full_name)}
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
