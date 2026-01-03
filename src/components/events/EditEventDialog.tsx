'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { updateEvent } from '@/app/actions/events'
import { MixingEvent } from '@/types/events'

const formSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  date: z.string(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido HH:MM"),
  max_spots: z.coerce.number().min(2, "Mínimo 2 plazas").max(50, "Máximo 50 plazas"),
  rounds: z.number().min(1).max(6),
  duration_minutes: z.number().min(30)
})

type FormValues = z.infer<typeof formSchema>

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: MixingEvent
}

export function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const [datePart, timePart] = event.start_time.split('T')
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: event.title,
      date: datePart,
      time: timePart ? timePart.substring(0, 5) : '12:00',
      max_spots: event.max_spots,
      rounds: event.rounds || 1,
      duration_minutes: event.duration_minutes || 90
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  // Watch for changes to rounds to auto-update title if it follows pattern
  const roundsValue = form.watch("rounds")
  const titleValue = form.watch("title")

  useEffect(() => {
    // pattern: "Some Text (X Ronda)" or "Some Text (X Rondas)"
    // explicitly look for this pattern at the end of string
    const match = titleValue.match(/^(.*) \(\d+ Rondas?\)$/)
    if (match) {
       const prefix = match[1]
       const suffix = roundsValue === 1 ? "(1 Ronda)" : `(${roundsValue} Rondas)`
       const newTitle = `${prefix} ${suffix}`
       
       if (newTitle !== titleValue) {
           form.setValue("title", newTitle)
       }
    }
  }, [roundsValue, form, titleValue])

  // Reset form when event changes or dialog opens
  useEffect(() => {
    if (open) {
      const [d, t] = event.start_time.split('T')
      form.reset({
        title: event.title,
        date: d,
        time: t ? t.substring(0, 5) : '12:00',
        max_spots: event.max_spots,
        rounds: event.rounds || 1,
        duration_minutes: event.duration_minutes || 90
      })
    }
  }, [event, open, form])

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const dateTime = new Date(`${values.date}T${values.time}:00`)
      await updateEvent(event.id, {
        title: values.title,
        start_time: dateTime.toISOString(),
        max_spots: values.max_spots,
        rounds: values.rounds,
        duration_minutes: values.duration_minutes
      })
      
      toast.success("Evento actualizado")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar evento")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Partida Mixin..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <FormControl>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(Math.max(30, field.value - 30))}>-</Button>
                            <Input type="number" {...field} className="text-center" readOnly />
                            <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(field.value + 30)}>+</Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rounds"
                render={({ field }) => (
                <FormItem>
                  <FormLabel>Partidos</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(Math.max(1, field.value - 1))}>-</Button>
                        <Input type="number" {...field} className="text-center" readOnly />
                        <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(Math.min(6, field.value + 1))}>+</Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_spots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plazas</FormLabel>
                    <FormControl>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(Math.max(4, field.value - 4))}>-</Button>
                            <Input type="number" {...field} className="text-center" readOnly />
                            <Button type="button" variant="outline" size="icon" onClick={() => field.onChange(field.value + 4)}>+</Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
