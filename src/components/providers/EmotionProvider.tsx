'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { ThemeProvider } from '@emotion/react'
import { EmotionRegistry } from '@/lib/emotion-registry'
import GlobalStyles from './GlobalStyles'
import { lightTheme, darkTheme } from '@/theme'

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

// Must be rendered inside next-themes' ThemeProvider.
export function EmotionProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const mounted = useHasMounted()
  const theme = mounted && resolvedTheme === 'dark' ? darkTheme : lightTheme

  return (
    <EmotionRegistry>
      <GlobalStyles />
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </EmotionRegistry>
  )
}
