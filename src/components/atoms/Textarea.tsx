'use client'

import styled from '@emotion/styled'

const Textarea = styled.textarea`
  width: 100%;
  min-width: 0;
  min-height: 5rem;
  padding: ${({ theme }) => theme.spacing(3, 3)};
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1.4;
  resize: vertical;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
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

export default Textarea
