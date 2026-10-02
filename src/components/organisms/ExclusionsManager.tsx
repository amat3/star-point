'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Badge, { type BadgeVariant } from '../atoms/Badge'
import Button from '../atoms/Button'
import Card from '../atoms/Card'
import Input from '../atoms/Input'
import Select from '../atoms/Select'
import EmptyState from '../molecules/EmptyState'
import Field from '../molecules/Field'
import ConfirmDialog from '../molecules/ConfirmDialog'
import { addExclusion, removeExclusion, type ExclusionRow } from '@/app/actions/admin-exclusions'
import { toTitleCase } from '@/lib/utils'

type ExclusionType = 'no_partner' | 'no_opponent' | 'no_contact'

const TYPES: Record<ExclusionType, { label: string; description: string; variant: BadgeVariant }> = {
  no_partner: { label: 'No compañeros', description: 'Nunca pueden jugar en la misma pareja', variant: 'default' },
  no_opponent: { label: 'No rivales', description: 'Nunca pueden enfrentarse entre sí', variant: 'accent' },
  no_contact: { label: 'Sin contacto', description: 'Nunca en el mismo partido (ni pareja ni rival)', variant: 'danger' },
}

interface ExclusionsManagerProps {
  exclusions: ExclusionRow[]
  players: { id: string; full_name: string | null }[]
}

function ExclusionsManager({ exclusions, players }: ExclusionsManagerProps) {
  const router = useRouter()
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [type, setType] = useState<ExclusionType>('no_contact')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toRemove, setToRemove] = useState<ExclusionRow | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!playerA || !playerB) { toast.error('Selecciona dos jugadores'); return }
    if (playerA === playerB) { toast.error('Los jugadores deben ser distintos'); return }
    setSaving(true)
    try {
      await addExclusion(playerA, playerB, type, note || undefined)
      toast.success('Exclusión añadida')
      setPlayerA('')
      setPlayerB('')
      setNote('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeExclusion(id)
      toast.success('Exclusión eliminada')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const options = (excluding: string) =>
    players
      .filter(p => p.id !== excluding)
      .map(p => <option key={p.id} value={p.id}>{toTitleCase(p.full_name)}</option>)

  return (
    <>
      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => { if (!open) setToRemove(null) }}
        title="Eliminar exclusión"
        description={toRemove ? `${toTitleCase(toRemove.player_a_name)} y ${toTitleCase(toRemove.player_b_name)} podrán volver a coincidir.` : ''}
        confirmLabel="Eliminar"
        onConfirm={() => toRemove && handleRemove(toRemove.id)}
      />

      <Card as="form" onSubmit={handleAdd}>
        <Title>Nueva exclusión</Title>
        <Row>
          <Field label="Jugador A" htmlFor="player-a">
            <Select id="player-a" value={playerA} onChange={e => setPlayerA(e.target.value)}>
              <option value="">Seleccionar…</option>
              {options(playerB)}
            </Select>
          </Field>
          <Field label="Jugador B" htmlFor="player-b">
            <Select id="player-b" value={playerB} onChange={e => setPlayerB(e.target.value)}>
              <option value="">Seleccionar…</option>
              {options(playerA)}
            </Select>
          </Field>
        </Row>

        <Field label="Tipo de exclusión" htmlFor="exclusion-type" hint={TYPES[type].description}>
          <Select id="exclusion-type" value={type} onChange={e => setType(e.target.value as ExclusionType)}>
            {Object.entries(TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Nota (opcional)" htmlFor="exclusion-note">
          <Input id="exclusion-note" placeholder="Motivo, contexto…" value={note} onChange={e => setNote(e.target.value)} />
        </Field>

        <Button type="submit" $size="lg" disabled={saving || !playerA || !playerB}>
          {saving ? 'Guardando…' : 'Añadir exclusión'}
        </Button>
      </Card>

      <List>
        {exclusions.length === 0 && <EmptyState>No hay exclusiones configuradas.</EmptyState>}
        {exclusions.map(ex => {
          const meta = TYPES[ex.type]
          return (
            <Item key={ex.id}>
              <Names>
                <strong>{toTitleCase(ex.player_a_name)}</strong>
                <span aria-hidden="true">↔</span>
                <strong>{toTitleCase(ex.player_b_name)}</strong>
              </Names>
              <Meta>
                <Badge $variant={meta.variant}>{meta.label}</Badge>
                {ex.note && <Note>{ex.note}</Note>}
              </Meta>
              <Remove type="button" aria-label="Eliminar exclusión" onClick={() => setToRemove(ex)}>
                <Trash2 />
              </Remove>
            </Item>
          )
        })}
      </List>
    </>
  )
}

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.0625rem;
  font-weight: 700;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Item = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 3rem 1rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
`

const Names = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;

  span {
    color: ${({ theme }) => theme.colors.muted};
  }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`

const Note = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const Remove = styled.button`
  position: absolute;
  top: 50%;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.danger};
  cursor: pointer;
  transform: translateY(-50%);

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`

export default ExclusionsManager
