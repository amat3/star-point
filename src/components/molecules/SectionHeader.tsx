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
  gap: ${({ theme }) => theme.spacing(3)};
`

const Title = styled.h2`
  margin: 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  letter-spacing: -0.01em;
`

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.5)};
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  text-decoration: none;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

export default SectionHeader
