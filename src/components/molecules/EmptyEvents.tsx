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
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(6, 4)};
  border: 1px dashed ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-align: center;

  a {
    margin-top: ${({ theme }) => theme.spacing(2)};
  }
`

const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
`

export default EmptyEvents
