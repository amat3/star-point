'use client'

import styled from '@emotion/styled'

const Input = styled.input`
  width: 100%;
  min-width: 0;
  height: 2.75rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  transition: border-color 150ms ease, box-shadow 150ms ease;

  /* iOS Safari gives date/time fields their own intrinsic width and look: make them behave like text fields */
  &[type='date'],
  &[type='time'] {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    text-align: left;
  }
  &[type='date']::-webkit-date-and-time-value,
  &[type='time']::-webkit-date-and-time-value {
    min-width: 0;
    text-align: left;
  }

  /* Browsers repaint autofilled fields (password managers) with their own colors */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: ${({ theme }) => theme.colors.ink};
    caret-color: ${({ theme }) => theme.colors.ink};
    -webkit-box-shadow: 0 0 0 1000px ${({ theme }) => theme.colors.field} inset;
    transition: background-color 9999s ease-out 0s;
  }

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.forest};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
  &[aria-invalid='true'] { border-color: ${({ theme }) => theme.colors.danger}; }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

export default Input
