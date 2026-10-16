'use client'

import { useEffect, useState } from 'react'
import { keyframes } from '@emotion/react'
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
import MatchAssistant from './MatchAssistant'
import { MATCH_NOTES_MAX, MATCH_NOTE_SUGGESTIONS } from '@/lib/match-events'
import type { MatchFill, RequiredMatchField } from '@/lib/match-parser'
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
  // Shows the "write it and I fill it" box above the form (publish page, players with AI enabled)
  assistant?: boolean
}

// Shared by "publish" and "edit": club, day, time and how many players are missing.
function MatchForm({ clubs, initial, submitLabel, submittingLabel, onSubmit, assistant = false }: MatchFormProps) {
  const [needed, setNeeded] = useState<'1' | '2' | '3'>(String(initial.needed) as '1' | '2' | '3')
  const [submitting, setSubmitting] = useState(false)
  // Fields the assistant just touched flash for a moment: lime if it filled them, amber if the
  // text did not mention them and they kept their previous value
  const [flashes, setFlashes] = useState<Partial<Record<keyof MatchFill, FlashTone>>>({})

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { club_id: initial.club_id, date: initial.date, time: initial.time, notes: initial.notes ?? '' },
  })

  const notes = watch('notes') ?? ''

  /** Fills what the assistant found; returns, for each missing field, the value it kept. */
  function applyFill(fill: MatchFill, missing: RequiredMatchField[]) {
    const kept: Partial<Record<RequiredMatchField, string>> = {}
    for (const field of missing) {
      if (field === 'club_id') kept.club_id = clubs.find(c => c.id === getValues('club_id'))?.name ?? ''
      if (field === 'date') kept.date = getValues('date') ? formatDay(getValues('date')) : ''
      if (field === 'time') kept.time = getValues('time')
      if (field === 'needed') kept.needed = needed
    }

    const options = { shouldValidate: true, shouldDirty: true }
    if (fill.club_id) setValue('club_id', fill.club_id, options)
    if (fill.date) setValue('date', fill.date, options)
    if (fill.time) setValue('time', fill.time, options)
    if (fill.notes) setValue('notes', fill.notes, options)
    if (fill.needed) setNeeded(String(fill.needed) as '1' | '2' | '3')

    const next: Partial<Record<keyof MatchFill, FlashTone>> = {}
    for (const field of Object.keys(fill) as (keyof MatchFill)[]) next[field] = 'filled'
    for (const field of missing) next[field] = 'missing'
    setFlashes(next)
    return kept
  }

  useEffect(() => {
    if (Object.keys(flashes).length === 0) return
    const timer = setTimeout(() => setFlashes({}), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flashes])

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
    <Stack>
      {assistant && <MatchAssistant onFill={applyFill} exampleClub={clubs[0]?.name} />}
      <Form onSubmit={handleSubmit(submit)}>
        <Flash $tone={flashes.club_id}>
          <Field label="Club" htmlFor="match-club" error={errors.club_id?.message}>
            <Select id="match-club" {...register('club_id')}>
              <option value="">Elige un club…</option>
              {clubs.map(club => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </Select>
          </Field>
        </Flash>

        <Row>
          <Flash $tone={flashes.date}>
            <Field label="Fecha" htmlFor="match-date" error={errors.date?.message}>
              <Input id="match-date" type="date" {...register('date')} />
            </Field>
          </Flash>
          <Flash $tone={flashes.time}>
            <Field label="Hora" htmlFor="match-time" error={errors.time?.message}>
              <Input id="match-time" type="time" {...register('time')} />
            </Field>
          </Flash>
        </Row>

        <Flash $tone={flashes.needed}>
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
        </Flash>

        <Flash $tone={flashes.notes}>
          <Field label="Comentarios (opcional)" htmlFor="match-notes" error={errors.notes?.message}>
            <Textarea id="match-notes" rows={3} maxLength={MATCH_NOTES_MAX} placeholder="Ej.: buscamos un revés" {...register('notes')} />
            <div>
              <Counter>{notes.length}/{MATCH_NOTES_MAX}</Counter>
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
            </div>
          </Field>
        </Flash>

        <Button type="submit" $size="lg" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </Form>
    </Stack>
  )
}

const FLASH_MS = 1600

type FlashTone = 'filled' | 'missing'

/** "2026-10-15" → "jueves 15 oct" */
function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short' })
    .format(new Date(Date.UTC(y, m - 1, d)))
}

const flash = keyframes`
  from { box-shadow: 0 0 0 4px var(--flash-color); }
  to { box-shadow: 0 0 0 4px transparent; }
`

const Flash = styled('div', { shouldForwardProp: prop => prop !== '$tone' })<{ $tone?: FlashTone }>`
  min-width: 0;
  --flash-color: ${({ theme, $tone }) => ($tone === 'missing' ? theme.colors.amber : theme.colors.lime)};

  & :is(input, select, textarea, [role='radiogroup']) {
    animation: ${({ $tone }) => ($tone ? flash : 'none')} ${FLASH_MS}ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    & :is(input, select, textarea, [role='radiogroup']) {
      animation: none;
    }
  }
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
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

const Counter = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-align: right;
`

const Suggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Chip = styled.button`
  padding: ${({ theme }) => theme.spacing(1, 3)};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;

  &:active {
    background: ${({ theme }) => theme.colors.line};
  }
`

export default MatchForm
