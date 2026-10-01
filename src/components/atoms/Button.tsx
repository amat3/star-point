'use client'

import styled from '@emotion/styled'
import Link from 'next/link'
import type { Theme } from '@/theme'

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variants = (t: Theme): Record<ButtonVariant, string> => ({
  primary: `background: ${t.colors.forest}; color: ${t.colors.onForest}; border-color: transparent;`,
  accent: `background: ${t.colors.lime}; color: ${t.colors.forestDeep}; border-color: transparent;`,
  outline: `background: transparent; color: ${t.colors.ink}; border-color: ${t.colors.fieldBorder};`,
  ghost: `background: transparent; color: ${t.colors.ink}; border-color: transparent;`,
  danger: `background: ${t.colors.danger}; color: ${t.colors.onDanger}; border-color: transparent;`,
  link: `background: transparent; color: ${t.colors.forest}; border-color: transparent; text-decoration: underline; text-underline-offset: 4px;`,
})

const sizes: Record<ButtonSize, string> = {
  sm: 'height: 2.25rem; padding: 0 0.75rem;',
  md: 'height: 2.75rem; padding: 0 1.5rem;',
  lg: 'height: 3.25rem; padding: 0 1.75rem;',
  icon: 'height: 2.5rem; width: 2.5rem; padding: 0;',
}

const Button = styled('button', {
  shouldForwardProp: (prop) => prop !== '$variant' && prop !== '$size',
})<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease, transform 100ms ease;
  ${({ theme, $variant = 'primary' }) => variants(theme)[$variant]}
  ${({ $size = 'md' }) => sizes[$size]}

  svg {
    width: 15px;
    height: 15px;
    pointer-events: none;
  }
  &:hover { opacity: 0.9; }
  &:active { transform: scale(0.97); }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.forest};
    outline-offset: 2px;
  }
  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }
`

// Same look, rendered as a Next.js link.
export const ButtonLink = Button.withComponent(Link)

export default Button
