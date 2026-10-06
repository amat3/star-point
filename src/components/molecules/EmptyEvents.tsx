'use client'

import styled from '@emotion/styled'
import { Plus } from 'lucide-react'
import { ButtonLink } from '../atoms/Button'

interface EmptyEventsProps {
  // Only signed-in players can publish a match
  canPublish: boolean
}

// Home with nothing coming up: says so and, for players, invites them to start something.
function EmptyEvents({ canPublish }: EmptyEventsProps) {
  return (
    <Root>
      <Text>Aún no hay nada programado.</Text>
      {canPublish && (
        <>
          <Hint>¿Te apetece jugar? Publica un partido y avisamos al grupo.</Hint>
          <ButtonLink href="/partido" $variant="accent" $size="md">
            <Plus />
            Crear partido
          </ButtonLink>
        </>
      )}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-align: center;

  a {
    margin-top: 0.5rem;
  }
`

const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.9375rem;
  font-weight: 600;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

export default EmptyEvents
