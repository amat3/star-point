'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Select from '@/components/atoms/Select'
import Dialog from '@/components/molecules/Dialog'
import Field from '@/components/molecules/Field'
import { createClient } from '@/utils/supabase/client'
import { PLAYERS_PER_COURT, madridDateTimeToUTC, utcToMadridDateTime } from '@/lib/utils'
import { updateEvent } from '@/app/actions/events'
import { MixingEvent } from '@/types/events'

const formSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  club_id: z.string(),
  date: z.string().min(1, 'Elige una fecha'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  courts: z.number().min(1, 'Mínimo 1 pista').max(9, 'Máximo 9 pistas'),
  rounds: z.number().min(1, 'Mínimo 1 ronda').max(6, 'Máximo 6 rondas'),
  duration_minutes: z.number().min(30, 'Mínimo 30 minutos'),
})

type FormValues = z.infer<typeof formSchema>

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: MixingEvent
  // Draw already published: changing club, courts or rounds undoes the draw
  published?: boolean
}

const valuesFor = (event: MixingEvent): FormValues => {
  const { date, time } = utcToMadridDateTime(event.start_time)
  return {
    title: event.title,
    club_id: event.club_id ?? '',
    date,
    time,
    courts: Math.round((event.max_spots || PLAYERS_PER_COURT) / PLAYERS_PER_COURT),
    rounds: event.rounds || 1,
    duration_minutes: event.duration_minutes || 90,
  }
}

export function EditEventDialog({ open, onOpenChange, event, published = false }: EditEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valuesFor(event),
  })

  // Reset the form and load the clubs every time the dialog opens
  useEffect(() => {
    if (!open) return
    reset(valuesFor(event))
    createClient()
      .from('clubs')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClubs(data)
      })
  }, [event, open, reset])

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      await updateEvent(event.id, {
        title: values.title,
        start_time: madridDateTimeToUTC(values.date, values.time),
        max_spots: values.courts * PLAYERS_PER_COURT,
        rounds: values.rounds,
        duration_minutes: values.duration_minutes,
        club_id: values.club_id || null,
      })

      toast.success('Evento actualizado')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar evento')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar evento">
      <Form id="edit-event-form" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Título" htmlFor="edit-title" error={errors.title?.message}>
          <Input id="edit-title" {...register('title')} />
        </Field>

        <Field label="Club" htmlFor="edit-club" error={errors.club_id?.message}>
          <Select id="edit-club" {...register('club_id')}>
            <option value="">Club por confirmar</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </Select>
        </Field>

        <Row>
          <Field label="Fecha" htmlFor="edit-date" error={errors.date?.message}>
            <Input id="edit-date" type="date" {...register('date')} />
          </Field>
          <Field label="Hora" htmlFor="edit-time" error={errors.time?.message}>
            <Input id="edit-time" type="time" {...register('time')} />
          </Field>
        </Row>

        <Row>
          <Field label="Pistas" htmlFor="edit-courts" error={errors.courts?.message}>
            <Input id="edit-courts" type="number" inputMode="numeric" min={1} max={9} {...register('courts', { valueAsNumber: true })} />
          </Field>
          <Field label="Rondas" htmlFor="edit-rounds" error={errors.rounds?.message}>
            <Input id="edit-rounds" type="number" inputMode="numeric" min={1} max={6} {...register('rounds', { valueAsNumber: true })} />
          </Field>
        </Row>

        <Field label="Duración (minutos)" htmlFor="edit-duration" error={errors.duration_minutes?.message}>
          <Input id="edit-duration" type="number" inputMode="numeric" min={30} step={5} {...register('duration_minutes', { valueAsNumber: true })} />
        </Field>

        {published && (
          <Note>El sorteo ya está publicado: si cambias club, pistas o rondas se deshará y tendrás que generarlo de nuevo. Fecha, hora, título y duración no lo afectan.</Note>
        )}

        <Button type="submit" $size="lg" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Form>
    </Dialog>
  )
}

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
`
