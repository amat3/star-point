'use client'

import styled from '@emotion/styled'
import { Users } from 'lucide-react'

function WaitlistNote({ count }: { count: number }) {
  return (
    <Root>
      <IconBox>
        <Users />
      </IconBox>
      <Text>
        <Title>Lista de espera</Title>
        <Detail>Entran si se libera una plaza</Detail>
      </Text>
      <Count>{count} en reserva</Count>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.coral};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.coralTint};
`

const IconBox = styled.div`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  color: ${({ theme }) => theme.colors.coral};

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`

const Text = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
`

const Title = styled.span`
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.8125rem;
  font-weight: 700;
`

const Detail = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const Count = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.8125rem;
  font-weight: 700;
`

export default WaitlistNote
