'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Select from '@/components/atoms/Select'
import { addDrawRule, removeDrawRule } from '@/app/actions/mixing-generator'
import { pairFormatLabel, type DrawRule } from '@/lib/draw-rules'
import type { MixingParticipant } from '@/lib/mixing-algorithm'

interface DrawRulesEditorProps {
  eventId: string
  // The event's starters: the players a new rule can name
  starters: MixingParticipant[]
  rules: DrawRule[]
  onRulesChange: (rules: DrawRule[]) => void
}

const FORMAT_ORDER = ['Mixta', 'Femenina', 'Masculina']

/**
 * The rules of this event's draw, saved with the event (admins only): the men who may complete the women's court
 * of the separated rounds, and fixed pairs. Every change is saved at once.
 */
export default function DrawRulesEditor({ eventId, starters, rules, onRulesChange }: DrawRulesEditorProps) {
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [busy, setBusy] = useState(false)

  const byId = new Map(starters.map(p => [p.id, p]))
  const byName = [...starters].sort((x, y) => x.full_name.localeCompare(y.full_name, 'es'))
  const courtMen = rules.filter(r => r.kind === 'women_court')
  // Starters who are men, plus anyone already on the list (even if no longer a starter, so they can be removed)
  const menChips = [
    ...byName.filter(p => p.gender === 'masculino').map(p => ({ id: p.id, name: p.full_name })),
    ...courtMen.filter(r => byId.get(r.playerA)?.gender !== 'masculino').map(r => ({ id: r.playerA, name: r.playerAName })),
  ]
  const pairs = rules
    .filter(r => r.kind === 'pair' && r.playerB)
    .map(rule => ({
      rule,
      names: `${byId.get(rule.playerA)?.full_name ?? rule.playerAName} + ${byId.get(rule.playerB!)?.full_name ?? rule.playerBName}`,
      format: pairFormatLabel(byId.get(rule.playerA), byId.get(rule.playerB!)),
    }))
    .sort((x, y) =>
      FORMAT_ORDER.indexOf(x.format ?? '') - FORMAT_ORDER.indexOf(y.format ?? '') || x.names.localeCompare(y.names, 'es')
    )

  // One change at a time (the controls are disabled meanwhile), so `rules` is never stale
  const save = async (change: () => Promise<DrawRule[]>) => {
    setBusy(true)
    try {
      onRulesChange(await change())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const toggleCourtMan = (id: string) =>
    save(async () => {
      const existing = courtMen.find(r => r.playerA === id)
      if (!existing) return [...rules, await addDrawRule(eventId, 'women_court', id, null)]
      await removeDrawRule(existing.id)
      return rules.filter(r => r.id !== existing.id)
    })

  const addPair = (event: React.FormEvent) => {
    event.preventDefault()
    if (!playerA || !playerB || playerA === playerB) {
      toast.error('Elige dos jugadores distintos')
      return
    }
    save(async () => {
      const rule = await addDrawRule(eventId, 'pair', playerA, playerB)
      setPlayerA('')
      setPlayerB('')
      return [...rules, rule]
    })
  }

  const removePair = (rule: DrawRule) =>
    save(async () => {
      await removeDrawRule(rule.id)
      return rules.filter(r => r.id !== rule.id)
    })

  return (
    <>
      <Title>Reglas del sorteo</Title>
      <Hint>
        Se guardan en este evento y solo las ven los administradores. Se cumplen sí o sí: si no encajan, no se puede
        generar.
      </Hint>

      <Subtitle id="women-court-men">Pueden completar la pista de chicas</Subtitle>
      <Hint>En las rondas separadas, cuando las chicas no llenan su última pista. Si no marcas a nadie, puede cualquiera.</Hint>
      <Chips role="group" aria-labelledby="women-court-men">
        {menChips.map(man => (
          <Chip
            key={man.id}
            type="button"
            aria-pressed={courtMen.some(r => r.playerA === man.id)}
            disabled={busy}
            onClick={() => toggleCourtMan(man.id)}
          >
            {man.name}
          </Chip>
        ))}
      </Chips>

      <Subtitle>Parejas fijas</Subtitle>
      <Hint>
        Juegan juntos una vez, en una ronda de su formato: chica y chico en una mixta; dos chicas o dos chicos en una
        separada.
      </Hint>
      {pairs.length > 0 && (
        <PairList>
          {pairs.map(({ rule, names, format }) => (
            <PairRow key={rule.id}>
              <PairNames>{names}</PairNames>
              {format && <Badge $variant="outline">{format}</Badge>}
              <Button
                type="button"
                $variant="ghost"
                $size="icon"
                aria-label={`Quitar la pareja ${names}`}
                disabled={busy}
                onClick={() => removePair(rule)}
              >
                <X />
              </Button>
            </PairRow>
          ))}
        </PairList>
      )}
      <AddPair onSubmit={addPair}>
        <Select aria-label="Primer jugador de la pareja" value={playerA} onChange={e => setPlayerA(e.target.value)} disabled={busy}>
          <option value="">Jugador…</option>
          {byName.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </Select>
        <Select aria-label="Segundo jugador de la pareja" value={playerB} onChange={e => setPlayerB(e.target.value)} disabled={busy}>
          <option value="">Jugador…</option>
          {byName.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </Select>
        <Button type="submit" $variant="outline" disabled={busy || !playerA || !playerB}>
          <Plus />
          Añadir pareja
        </Button>
      </AddPair>
    </>
  )
}

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
`

const Subtitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Chip = styled.button`
  padding: ${({ theme }) => theme.spacing(2, 4)};
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  cursor: pointer;

  &[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.colors.forest};
    background: ${({ theme }) => theme.colors.forest};
    color: ${({ theme }) => theme.colors.onForest};
  }
  &:disabled {
    cursor: wait;
  }
`

const PairList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const PairRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1, 0)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`

const PairNames = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
`

const AddPair = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};

  button {
    grid-column: 1 / -1;
  }
`
