'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Select from '@/components/atoms/Select'
import Textarea from '@/components/atoms/Textarea'
import Field from '@/components/molecules/Field'
import SegmentedControl from '@/components/molecules/SegmentedControl'
import { MATCH_NOTES_MAX, MATCH_NOTE_SUGGESTIONS } from '@/lib/match-events'
import { madridDateTimeToUTC } from '@/lib/utils'

const formSchema = z.object({
  club_id: z.string().min(1, 'Elige un club'),
  date: z.string().min(1, 'Elige una fecha'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  notes: z.string().max(MATCH_NOTES_MAX, `Máximo ${MATCH_NOTES_MAX} caracteres`),
})

type FormValues = z.infer<typeof formSchema>

export interface MatchFormInitial {
  club_id: string
  date: string
  time: string
  needed: 1 | 2 | 3
  notes?: string
}

export interface MatchFormSubmit {
  start_time: string
  club_id: string
  needed: number
  notes: string
}

interface MatchFormProps {
  clubs: { id: string; name: string }[]
  initial: MatchFormInitial
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: MatchFormSubmit) => Promise<void>
}

// Shared by "publish" and "edit": club, day, time and how many players are missing.
function MatchForm({ clubs, initial, submitLabel, submittingLabel, onSubmit }: MatchFormProps) {
  const [needed, setNeeded] = useState<'1' | '2' | '3'>(String(initial.needed) as '1' | '2' | '3')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { club_id: initial.club_id, date: initial.date, time: initial.time, notes: initial.notes ?? '' },
  })

  const notes = watch('notes') ?? ''

  async function submit(values: FormValues) {
    setSubmitting(true)
    try {
      await onSubmit({
        start_time: madridDateTimeToUTC(values.date, values.time),
        club_id: values.club_id,
        needed: Number(needed),
        notes: values.notes.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit(submit)}>
      <Field label="Club" htmlFor="match-club" error={errors.club_id?.message}>
        <Select id="match-club" {...register('club_id')}>
          <option value="">Elige un club…</option>
          {clubs.map(club => (
            <option key={club.id} value={club.id}>{club.name}</option>
          ))}
        </Select>
      </Field>

      <Row>
        <Field label="Fecha" htmlFor="match-date" error={errors.date?.message}>
          <Input id="match-date" type="date" {...register('date')} />
        </Field>
        <Field label="Hora" htmlFor="match-time" error={errors.time?.message}>
          <Input id="match-time" type="time" {...register('time')} />
        </Field>
      </Row>

      <Field label="¿Cuántos jugadores buscas?" htmlFor="match-needed">
        <SegmentedControl
          label="Jugadores que buscas"
          fill
          value={needed}
          onChange={setNeeded}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
          ]}
        />
      </Field>

      <Field label="Comentarios (opcional)" htmlFor="match-notes" error={errors.notes?.message} hint={`${notes.length}/${MATCH_NOTES_MAX}`}>
        <Textarea id="match-notes" rows={3} maxLength={MATCH_NOTES_MAX} placeholder="Ej.: buscamos un revés" {...register('notes')} />
        <Suggestions>
          {MATCH_NOTE_SUGGESTIONS.map(suggestion => (
            <Chip
              key={suggestion}
              type="button"
              onClick={() => setValue('notes', suggestion, { shouldValidate: true })}
            >
              {suggestion}
            </Chip>
          ))}
        </Suggestions>
      </Field>

      <Button type="submit" $size="lg" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
`

const Suggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem;
`

const Chip = styled.button`
  padding: 0.25rem 0.625rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:active {
    background: ${({ theme }) => theme.colors.line};
  }
`

export default MatchForm
