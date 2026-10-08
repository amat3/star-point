'use client'

import styled from '@emotion/styled'

// Vertical stack of page sections. By default it leaves room for the fixed TabBar;
// a page that renders something after it (the home footer) opts out and provides it.
const Content = styled('main', {
  shouldForwardProp: (prop) => prop !== '$clearTabBar',
})<{ $clearTabBar?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(5, 6)}
    ${({ theme, $clearTabBar = true }) =>
      $clearTabBar ? `calc(${theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + ${theme.space[4]})` : '0'};
`

export default Content
