'use client'

import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

interface PulsatingDotProps {
  size?: number
  // Defaults to the alert color (pending actions).
  color?: string
}

function PulsatingDot({ size = 10, color }: PulsatingDotProps) {
  return <Dot $size={size} $color={color} aria-hidden="true" />
}

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.6); opacity: 0; }
`

const Dot = styled('span', {
  shouldForwardProp: (prop) => prop !== '$size' && prop !== '$color',
})<{ $size: number; $color?: string }>`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ theme, $color }) => $color ?? theme.colors.alert};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: inherit;
    animation: ${pulse} 1.8s cubic-bezier(0, 0, 0.35, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; display: none; }
  }
`

export default PulsatingDot
