'use client'

import { useState } from 'react'
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
  max_spots: z.coerce.number().min(2, "Mínimo 2 plazas").max(50, "Máximo 50 plazas")
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
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event.title,
      date: datePart,
      time: timePart ? timePart.substring(0, 5) : '12:00',
      max_spots: event.max_spots
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const dateTime = new Date(`${values.date}T${values.time}:00`)
      await updateEvent(event.id, {
        title: values.title,
        start_time: dateTime.toISOString(),
        max_spots: values.max_spots
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
              name="max_spots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plazas</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
