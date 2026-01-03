'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEvent } from '@/app/actions/events'
import { toast } from 'sonner'
import { Plus, CalendarPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const formSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  date: z.string(), // Relaxed validation for now
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido HH:MM"),
  max_spots: z.coerce.number().min(2, "Mínimo 2 plazas").max(50, "Máximo 50 plazas"),
  rounds: z.number().min(1).max(6).default(3),
  duration_minutes: z.number().min(30).default(90)
})

type FormValues = z.infer<typeof formSchema>

export function CreateEventDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "Mixing",
      max_spots: 12,
      date: new Date().toISOString().split('T')[0],
      time: "20:00",
      rounds: 3,
      duration_minutes: 90
    }
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      // Combine date and time to ISO string
      const dateTime = new Date(`${values.date}T${values.time}:00`)
      
      await createEvent({
        title: values.title,
        start_time: dateTime.toISOString(),
        max_spots: values.max_spots,
        rounds: values.rounds,
        duration_minutes: values.duration_minutes
      })

      toast.success("Evento creado correctamente")
      setOpen(false)
      form.reset()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <CalendarPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Convocatoria</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Convocatoria de Mixing</DialogTitle>
          <DialogDescription>
            Define los detalles del evento para que los jugadores se apunten.
          </DialogDescription>
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
                    <Input placeholder="Ej: Mixing Viernes Noche" {...field} />
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
                  <FormLabel>Plazas Disponibles</FormLabel>
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

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Publicar Evento"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
