'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import styled from '@emotion/styled'
import { ThemeProvider } from '@emotion/react'
import { lightTheme, darkTheme } from '@/theme'

const Frame = styled.div`
  font-family: ${({ theme }) => theme.fonts.body};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100vh;
  transition: background-color 200ms ease, color 200ms ease;
`

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {}, 
    () => true,     
    () => false     
  )
}

export function RedesignFrame({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const mounted = useHasMounted()

  const theme = mounted && resolvedTheme === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeProvider theme={theme}>
      <Frame>{children}</Frame>
    </ThemeProvider>
  )
}