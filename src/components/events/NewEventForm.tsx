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
import AutoDrawSetting from '@/components/events/AutoDrawSetting'
import { createEvent } from '@/app/actions/events'
import { PLAYERS_PER_COURT, madridDateTimeToUTC, utcToMadridDateTime } from '@/lib/utils'
import { DEFAULT_EVENT_SUBTITLE, INTRO_TEXT_MAX, MIXING_TITLE } from '@/lib/event-title'

const formSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  club_id: z.string(),
  date: z.string().min(1, 'Elige una fecha'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  courts: z.number().min(1, 'Mínimo 1 pista').max(9, 'Máximo 9 pistas'),
  rounds: z.number().min(1, 'Mínimo 1 ronda').max(6, 'Máximo 6 rondas'),
  duration_minutes: z.number().min(30, 'Mínimo 30 minutos'),
  intro_eyebrow: z.string().max(INTRO_TEXT_MAX, `Máximo ${INTRO_TEXT_MAX} caracteres`),
  intro_subtitle: z.string().max(INTRO_TEXT_MAX, `Máximo ${INTRO_TEXT_MAX} caracteres`),
  auto_draw: z.boolean(),
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
      title: MIXING_TITLE,
      club_id: clubs.find(c => c.name === 'Padel Indoor')?.id ?? '',
      date: utcToMadridDateTime(new Date().toISOString()).date,
      time: '20:00',
      courts: 3,
      rounds: 3,
      duration_minutes: 90,
      intro_eyebrow: '',
      intro_subtitle: '',
      auto_draw: true,
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
        auto_draw: values.auto_draw,
        intro_eyebrow: values.intro_eyebrow,
        intro_subtitle: values.intro_subtitle,
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
        <Input id="title" placeholder={`Ej: ${MIXING_TITLE}`} {...register('title')} />
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

      <Field label="Antetítulo" htmlFor="intro_eyebrow" hint="Opcional: si lo dejas vacío sale «El plan de los …» con el día." error={errors.intro_eyebrow?.message}>
        <Input id="intro_eyebrow" maxLength={INTRO_TEXT_MAX} placeholder="El plan de los …" {...register('intro_eyebrow')} />
      </Field>

      <Field label="Frase" htmlFor="intro_subtitle" hint="Opcional: si la dejas vacía sale la de siempre." error={errors.intro_subtitle?.message}>
        <Input id="intro_subtitle" maxLength={INTRO_TEXT_MAX} placeholder={DEFAULT_EVENT_SUBTITLE} {...register('intro_subtitle')} />
      </Field>

      <Controller
        control={control}
        name="auto_draw"
        render={({ field }) => <AutoDrawSetting checked={field.value} onCheckedChange={field.onChange} />}
      />

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
  gap: ${({ theme }) => theme.spacing(4)};
`

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
`
