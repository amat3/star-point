'use client'

import styled from '@emotion/styled'

const EmptyState = styled.div`
  padding: 1.5rem 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
  text-align: center;
`

export default EmptyState
