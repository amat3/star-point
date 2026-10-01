'use client'

import styled from '@emotion/styled'

// Vertical stack of page sections. By default it leaves room for the fixed TabBar;
// a page that renders something after it (the home footer) opts out and provides it.
const Content = styled('main', {
  shouldForwardProp: (prop) => prop !== '$clearTabBar',
})<{ $clearTabBar?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 1.5rem
    ${({ theme, $clearTabBar = true }) =>
      $clearTabBar ? `calc(${theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + 1rem)` : '0'};
`

export default Content
