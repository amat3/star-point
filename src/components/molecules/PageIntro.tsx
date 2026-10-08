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
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(5, 6, 0)};
`

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
`

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
`

export default PageIntro
