'use client'

import styled from '@emotion/styled'

const Input = styled.input`
  width: 100%;
  min-width: 0;
  height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;

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
