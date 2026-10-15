'use client'

import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import Content from '@/components/molecules/Content'

// What the home shows while its data loads: the same blocks (greeting, section title, event rows)
// as plain shapes, so nothing jumps when the real content arrives.
function HomeSkeleton() {
  return (
    <Root aria-hidden="true">
      <Greeting>
        <Bar $width="9rem" $height="0.75rem" />
        <Bar $width="14rem" $height="1.75rem" />
      </Greeting>
      <Content $clearTabBar={false}>
        <Bar $width="7rem" $height="1rem" />
        <Row />
        <Row />
        <Row />
      </Content>
    </Root>
  )
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`

const Root = styled.div`
  flex: 1;
  /* room for the fixed tab bar, like the real page */
  padding-bottom: calc(${({ theme }) => theme.layout.tabBarHeight} + env(safe-area-inset-bottom));
`

const Greeting = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(5, 6, 0)};
`

const Bar = styled('div', {
  shouldForwardProp: (prop) => prop !== '$width' && prop !== '$height',
})<{ $width: string; $height: string }>`
  width: ${({ $width }) => $width};
  max-width: 100%;
  height: ${({ $height }) => $height};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  animation: ${pulse} 1400ms ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Row = styled.div`
  height: 4.5rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  animation: ${pulse} 1400ms ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export default HomeSkeleton
