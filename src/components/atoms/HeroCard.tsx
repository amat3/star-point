'use client'

import styled from '@emotion/styled'

// Dark forest card with two decorative circles in the top-right corner.
// Content is lifted above the circles via `> *`.
const HeroCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.hero};
  color: ${({ theme }) => theme.colors.onForest};
  isolation: isolate;

  > * {
    position: relative;
    z-index: 1;
  }

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: 0;
    border-radius: 50%;
    pointer-events: none;
  }

  /* Outer ring */
  &::before {
    top: -6rem;
    right: -5rem;
    width: 14rem;
    height: 14rem;
    border: 1px solid ${({ theme }) => theme.colors.heroTint};
  }

  /* Inner filled circle */
  &::after {
    top: -4rem;
    right: -3rem;
    width: 10rem;
    height: 10rem;
    background: ${({ theme }) => theme.colors.heroTint};
  }
`

export default HeroCard
