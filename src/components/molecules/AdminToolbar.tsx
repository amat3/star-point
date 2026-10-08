'use client'

import styled from '@emotion/styled'
import { CalendarPlus, ClipboardCheck, Users } from 'lucide-react'
import Badge from '../atoms/Badge'
import { ButtonLink } from '../atoms/Button'

interface AdminToolbarProps {
  // Matches waiting for review; the badge is hidden at zero
  pendingCount: number
}

// Admin tools shown on the Mixing screen (admin view only).
function AdminToolbar({ pendingCount }: AdminToolbarProps) {
  return (
    <Root>
      <ButtonLink href="/admin/events/new" $variant="primary" $size="lg">
        <CalendarPlus />
        Crear evento
      </ButtonLink>
      <Row>
        <ButtonLink href="/admin/matches" $variant="outline" $size="md">
          <ClipboardCheck />
          Pendientes
          {pendingCount > 0 && <Badge $variant="danger">{pendingCount}</Badge>}
        </ButtonLink>
        <ButtonLink href="/admin/players" $variant="outline" $size="md">
          <Users />
          Jugadores
        </ButtonLink>
      </Row>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing(3)};
`

export default AdminToolbar
