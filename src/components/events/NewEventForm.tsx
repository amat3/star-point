'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Select from '@/components/atoms/Select'
import Switch from '@/components/atoms/Switch'
import Field from '@/components/molecules/Field'
import SettingRow from '@/components/molecules/SettingRow'
import { createEvent } from '@/app/actions/events'
import { PLAYERS_PER_COURT, madridDateTimeToUTC, utcToMadridDateTime } from '@/lib/utils'

const formSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  club_id: z.string(),
  date: z.string().min(1, 'Elige una fecha'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  courts: z.number().min(1, 'Mínimo 1 pista').max(9, 'Máximo 9 pistas'),
  rounds: z.number().min(1, 'Mínimo 1 ronda').max(6, 'Máximo 6 rondas'),
  duration_minutes: z.number().min(30, 'Mínimo 30 minutos'),
  is_test: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface NewEventFormProps {
  clubs: { id: string; name: string }[]
}

export default function NewEventForm({ clubs }: NewEventFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: 'Mixing Padel&Risas',
      club_id: clubs.find(c => c.name === 'Padel Indoor')?.id ?? '',
      date: utcToMadridDateTime(new Date().toISOString()).date,
      time: '20:00',
      courts: 3,
      rounds: 3,
      duration_minutes: 90,
      is_test: false,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      await createEvent({
        title: values.title,
        start_time: madridDateTimeToUTC(values.date, values.time),
        max_spots: values.courts * PLAYERS_PER_COURT,
        rounds: values.rounds,
        duration_minutes: values.duration_minutes,
        is_test: values.is_test,
        club_id: values.club_id || null,
      })

      toast.success('Evento creado correctamente')
      router.push('/mixing')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      setIsSubmitting(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Field label="Título" htmlFor="title" error={errors.title?.message}>
        <Input id="title" placeholder="Ej: Mixing Padel&Risas" {...register('title')} />
      </Field>

      <Field label="Club" htmlFor="club_id" hint="Si todavía no se sabe, se mostrará «Club por confirmar»." error={errors.club_id?.message}>
        <Select id="club_id" {...register('club_id')}>
          <option value="">Club por confirmar</option>
          {clubs.map(club => (
            <option key={club.id} value={club.id}>{club.name}</option>
          ))}
        </Select>
      </Field>

      <Row>
        <Field label="Fecha" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" {...register('date')} />
        </Field>
        <Field label="Hora" htmlFor="time" error={errors.time?.message}>
          <Input id="time" type="time" {...register('time')} />
        </Field>
      </Row>

      <Row>
        <Field label="Pistas" htmlFor="courts" hint={`${PLAYERS_PER_COURT} jugadores por pista`} error={errors.courts?.message}>
          <Input id="courts" type="number" inputMode="numeric" min={1} max={9} {...register('courts', { valueAsNumber: true })} />
        </Field>
        <Field label="Rondas" htmlFor="rounds" error={errors.rounds?.message}>
          <Input id="rounds" type="number" inputMode="numeric" min={1} max={6} {...register('rounds', { valueAsNumber: true })} />
        </Field>
      </Row>

      <Field label="Duración (minutos)" htmlFor="duration_minutes" hint="Se reparte a partes iguales entre las rondas." error={errors.duration_minutes?.message}>
        <Input id="duration_minutes" type="number" inputMode="numeric" min={30} step={5} {...register('duration_minutes', { valueAsNumber: true })} />
      </Field>

      <Controller
        control={control}
        name="is_test"
        render={({ field }) => (
          <SettingRow
            icon={<CalendarPlus />}
            title="Evento de prueba"
            description="No cuenta para el ranking ni avisa al grupo"
            control={<Switch aria-label="Evento de prueba" checked={field.value} onCheckedChange={field.onChange} />}
          />
        )}
      />

      <Button type="submit" $size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Creando…' : 'Crear evento'}
      </Button>
    </Form>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`
