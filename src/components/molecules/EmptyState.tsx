'use client'

import styled from '@emotion/styled'

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing(6, 4)};
  border: 1px dashed ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  text-align: center;
`

export default EmptyState
