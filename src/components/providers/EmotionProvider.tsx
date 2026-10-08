'use client'

import { useTheme } from 'next-themes'
import { ThemeProvider } from '@emotion/react'
import { EmotionRegistry } from '@/lib/emotion-registry'
import GlobalStyles from './GlobalStyles'
import { lightTheme, darkTheme } from '@/theme'
import { useHasMounted } from '@/lib/use-has-mounted'

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
