'use client'

import styled from '@emotion/styled'
import type { Theme } from '@/theme'

export type BadgeVariant = 'default' | 'accent' | 'danger' | 'outline'

const variants = (t: Theme): Record<BadgeVariant, string> => ({
  default: `background: ${t.colors.forest}; color: ${t.colors.onForest}; border-color: transparent;`,
  accent: `background: ${t.colors.lime}; color: ${t.colors.forestDeep}; border-color: transparent;`,
  danger: `background: ${t.colors.coral}; color: #fff; border-color: transparent;`,
  outline: `background: transparent; color: ${t.colors.ink}; border-color: ${t.colors.line};`,
})

const Badge = styled('span', {
  shouldForwardProp: (prop) => prop !== '$variant',
})<{ $variant?: BadgeVariant }>`
  display: inline-flex;
  width: fit-content;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  overflow: hidden;
  white-space: nowrap;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.75rem;
  font-weight: 600;
  ${({ theme, $variant = 'default' }) => variants(theme)[$variant]}

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`

export default Badge
