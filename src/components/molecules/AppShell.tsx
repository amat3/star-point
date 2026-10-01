'use client'

import styled from '@emotion/styled'

// Mobile-only app: a single fixed-width column, no breakpoints.
const AppShell = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
`

export default AppShell
