'use client'

import styled from '@emotion/styled'

const Input = styled.input`
  width: 100%;
  min-width: 0;
  height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.forest};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.hairline};
  }
  &[aria-invalid='true'] { border-color: ${({ theme }) => theme.colors.coral}; }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

export default Input
