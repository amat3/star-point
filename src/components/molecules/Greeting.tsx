'use client'

import styled from '@emotion/styled'

interface GreetingProps {
  date: string
  name?: string
}

function Greeting({ date, name }: GreetingProps) {
  return (
    <Root>
      <DateLabel>{date}</DateLabel>
      <Title>{name ? `¡Hola, ${name}!` : '¡Hola!'}</Title>
    </Root>
  )
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(5, 6, 0)};
`

const DateLabel = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
`

export default Greeting
