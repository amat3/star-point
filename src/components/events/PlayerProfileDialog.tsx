'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { Check, Pencil, X } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import { toast } from 'sonner'
import Avatar from '@/components/atoms/Avatar'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Dialog from '@/components/molecules/Dialog'
import StatsRow from '@/components/molecules/StatsRow'
import { getPlayerProfileDetails, type PlayerProfileDetails } from '@/app/actions/matches'
import { renameGuest } from '@/app/actions/events'
import { toTitleCase } from '@/lib/utils'

interface PlayerProfileDialogProps {
  userId: string | null
  userRole?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GENDER_LABEL: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
}

const HAND_LABEL: Record<string, string> = {
  diestro: 'Diestro',
  zurdo: 'Zurdo',
  ambidiestro: 'Ambidiestro',
}

const POSITION_LABEL: Record<string, string> = {
  reves: 'Revés (izquierda)',
  drive: 'Drive (derecha)',
  ambos: 'Ambos lados',
}

const NOT_SET = 'No especificado'

export function PlayerProfileDialog({ userId, userRole, open, onOpenChange }: PlayerProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PlayerProfileDetails | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!open || !userId) return

    async function load() {
      setLoading(true)
      setData(null)
      setEditingName(false)
      const result = await getPlayerProfileDetails(userId!)
      setData(result)
      setLoading(false)
    }

    load()
  }, [open, userId])

  function startEditingName() {
    setNameDraft(data?.full_name ?? '')
    setEditingName(true)
  }

  async function saveName() {
    if (!data) return
    setSavingName(true)
    try {
      await renameGuest(data.id, nameDraft)
      setData({ ...data, full_name: nameDraft.trim() })
      setEditingName(false)
      toast.success('Nombre actualizado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al renombrar')
    } finally {
      setSavingName(false)
    }
  }

  const name = toTitleCase(data?.full_name) || '—'
  const matchesWon = data ? Math.round(data.matches_played * data.win_ratio) : 0

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Perfil del jugador"
      description="Datos y estadísticas del jugador seleccionado."
    >
      {loading && (
        <Center>
          <ThinkingOrb state="composing" size={20} theme="auto" aria-label="Cargando…" />
        </Center>
      )}

      {!loading && !data && <Message>No se pudo cargar el perfil de este jugador.</Message>}

      {!loading && data && (
        <>
          <Identity>
            <Avatar src={data.avatar_url} name={name} size={88} />
            {editingName ? (
              <NameEditor>
                <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus disabled={savingName} />
                <Button type="button" $size="icon" aria-label="Guardar nombre" onClick={saveName} disabled={savingName}>
                  <Check />
                </Button>
                <Button type="button" $variant="ghost" $size="icon" aria-label="Cancelar" onClick={() => setEditingName(false)} disabled={savingName}>
                  <X />
                </Button>
              </NameEditor>
            ) : (
              <NameRow>
                <PlayerName>{name}</PlayerName>
                {userRole === 'admin' && data.is_guest && (
                  <EditButton type="button" onClick={startEditingName} title="Editar nombre del invitado" aria-label="Editar nombre del invitado">
                    <Pencil />
                  </EditButton>
                )}
              </NameRow>
            )}
          </Identity>

          <Info>
            <InfoRow label="Género" value={(data.gender && GENDER_LABEL[data.gender]) || NOT_SET} />
            <InfoRow label="Mano preferida" value={(data.preferred_hand && HAND_LABEL[data.preferred_hand]) || NOT_SET} />
            <InfoRow label="Posición en pista" value={(data.court_position && POSITION_LABEL[data.court_position]) || NOT_SET} />
          </Info>

          <StatsRow
            matchesPlayed={data.matches_played}
            matchesWon={matchesWon}
            winRatio={data.win_ratio}
            gamesWon={data.gamesWon}
            gamesLost={data.gamesLost}
          />
        </>
      )}
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <Label>{label}</Label>
      <Value>{value}</Value>
    </Row>
  )
}

const Center = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem 0;
`

const Message = styled.p`
  margin: 0;
  padding: 2rem 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
  text-align: center;
`

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const PlayerName = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.25rem;
  font-weight: 700;
`

const EditButton = styled.button`
  display: grid;
  place-items: center;
  padding: 0.25rem;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

const NameEditor = styled.div`
  display: flex;
  width: 100%;
  max-width: 18rem;
  align-items: center;
  gap: 0.375rem;

  button {
    flex-shrink: 0;
  }
`

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
`

const Label = styled.span`
  color: ${({ theme }) => theme.colors.muted};
`

const Value = styled.span`
  font-weight: 600;
`
