'use client'

import styled from '@emotion/styled'

interface PageIntroProps {
  title: string
  subtitle?: string
}

function PageIntro({ title, subtitle }: PageIntroProps) {
  return (
    <Root>
      <Title>{title}</Title>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </Root>
  )
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1.25rem 1.5rem 0;
`

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
`

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

export default PageIntro
