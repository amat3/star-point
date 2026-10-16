'use client'

import styled from '@emotion/styled'

// Dark forest card with a decorative circle in the top-right corner: a thin ring plus two
// soft halos (box-shadow spreads). Content is lifted above it via `> *`.
const HeroCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing(5)};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  /* hero: the same green in the light theme, a darker one in the dark theme so the soft text on it keeps 4.5:1 */
  background: ${({ theme }) => theme.colors.hero};
  color: ${({ theme }) => theme.colors.onForest};
  isolation: isolate;

  > * {
    position: relative;
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    z-index: 0;
    top: -39px;
    right: -26px;
    width: 148px;
    height: 148px;
    border: 1px solid ${({ theme }) => theme.colors.heroRing};
    border-radius: 50%;
    box-shadow:
      0 0 0 17px ${({ theme }) => theme.colors.heroHaloInner},
      0 0 0 36px ${({ theme }) => theme.colors.heroHaloOuter};
    pointer-events: none;
  }
`

export default HeroCard
