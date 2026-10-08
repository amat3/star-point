'use client'

import styled from '@emotion/styled'

// Native <select>: the OS picker is the best control on mobile.
const Select = styled.select`
  width: 100%;
  height: 2.75rem;
  padding: 0 2.25rem 0 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.field};
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237c8780' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  appearance: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.forest};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

export default Select
