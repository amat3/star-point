'use client'

import styled from '@emotion/styled'
import * as LabelPrimitive from '@radix-ui/react-label'

const Label = styled(LabelPrimitive.Root)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  user-select: none;
`

export default Label
