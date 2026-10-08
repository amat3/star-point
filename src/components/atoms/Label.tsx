'use client'

import styled from '@emotion/styled'
import * as LabelPrimitive from '@radix-ui/react-label'

const Label = styled(LabelPrimitive.Root)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  line-height: 1;
  user-select: none;
`

export default Label
