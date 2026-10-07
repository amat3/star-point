'use client'

import styled from '@emotion/styled'

// Shown only on the demo deployment (NEXT_PUBLIC_DEMO=true): nobody should take its
// fictional players and results for a real group.
function DemoBanner() {
  return (
    <Root role="note">
      <strong>Demo</strong> con datos ficticios · no es un grupo real
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: 0.375rem 1rem;
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: 0.75rem;
  text-align: center;

  strong {
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`

export default DemoBanner
