'use client'

import styled from '@emotion/styled'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  action?: { label: string; href: string }
}

function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <Root>
      <Title>{title}</Title>
      {action && (
        <Action href={action.href}>
          {action.label}
          <ChevronRight />
        </Action>
      )}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0; /* reset the global Tailwind h2 border-b while it's still loaded */
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
`

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

export default SectionHeader
