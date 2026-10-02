'use client'

import styled from '@emotion/styled'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface NavRowProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  // Small count shown before the chevron (e.g. pending matches)
  badge?: number
}

function NavRow({ href, icon, title, description, badge }: NavRowProps) {
  return (
    <Root href={href}>
      <IconBox>{icon}</IconBox>
      <Text>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Text>
      {badge ? <Count>{badge}</Count> : null}
      <ChevronRight />
    </Root>
  )
}

const Root = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  color: ${({ theme }) => theme.colors.ink};
  text-decoration: none;
  transition: transform 100ms ease;

  &:active {
    transform: scale(0.99);
  }

  > svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: ${({ theme }) => theme.colors.muted};
  }
`

const IconBox = styled.div`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.forest};
  color: ${({ theme }) => theme.colors.onForest};

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`

const Text = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
`

const Title = styled.span`
  font-size: 0.9375rem;
  font-weight: 700;
`

const Description = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const Count = styled.span`
  min-width: 1.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.danger};
  color: ${({ theme }) => theme.colors.onDanger};
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
`

export default NavRow
