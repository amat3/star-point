'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { ThemeProvider, keyframes } from '@emotion/react'
import { lightTheme } from '@/theme'

const SHOW_MS = 3100
const FADE_MS = 500

// Runs before the first paint (inline, in the layout): marks the page so the splash
// is hidden by CSS when it should not appear, instead of flashing and then going away.
// It only shows on the first load of the session, on the home, and without reduced motion.
export const SPLASH_GUARD_SCRIPT = `try{var d=document.documentElement;if(location.pathname!=='/'||sessionStorage.getItem('sp-splash')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-splash','skip')}catch(e){document.documentElement.setAttribute('data-splash','skip')}`

type Phase = 'show' | 'leave' | 'done'

const NAME = 'starpoint'

// First screen when the app is opened from scratch: the brand and the orb while the
// home is already loading behind it.
function SplashScreen({ hold = false }: { hold?: boolean }) {
  const [phase, setPhase] = useState<Phase>('show')
  // Review mode: the animation restarts every few seconds
  const [cycle, setCycle] = useState(0)

  // The browser bars (status bar, notch area) take the dark theme-color on dark devices:
  // paint them light while the splash is up, then give them back.
  const visible = phase !== 'done'
  useEffect(() => {
    if (!visible) return
    if (!hold && document.documentElement.getAttribute('data-splash') === 'skip') return
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    const original = metas.map(meta => meta.content)
    metas.forEach(meta => { meta.content = lightTheme.colors.background })
    return () => metas.forEach((meta, index) => { meta.content = original[index] })
  }, [visible, hold])

  useEffect(() => {
    if (hold) {
      const replay = setInterval(() => setCycle(c => c + 1), 3800)
      return () => clearInterval(replay)
    }
    // Skipped: the CSS already hides it, nothing to run
    if (document.documentElement.getAttribute('data-splash') === 'skip') return
    try {
      sessionStorage.setItem('sp-splash', '1')
    } catch {
      // private mode: the splash simply shows again next time
    }
    const leave = setTimeout(() => setPhase('leave'), SHOW_MS)
    const done = setTimeout(() => setPhase('done'), SHOW_MS + FADE_MS)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
    }
  }, [hold])

  if (phase === 'done') return null

  // Always the light theme: the splash is the brand, whatever the device uses
  return (
    <ThemeProvider theme={lightTheme}>
      <Root $leaving={phase === 'leave'} data-hold={hold || undefined} role="status" aria-label="Cargando starpoint">
        <Brand key={cycle}>
          <MarkWrap>
            <Mark />
            {/* Starts as the whole screen in lime and contracts into the dot of the logo */}
            <Dot />
          </MarkWrap>
          <Name aria-label="starpoint">
            {NAME.split('').map((letter, index) => (
              <Letter key={index} aria-hidden="true" style={{ animationDelay: `${1250 + index * 55}ms` }}>
                {letter}
              </Letter>
            ))}
          </Name>
          <Tagline>Tu app de Pádel</Tagline>
        </Brand>
        <Credits key={`credits-${cycle}`}>
          <span>JUANAN AMATE</span>
          <span>© 2026</span>
        </Credits>
      </Root>
    </ThemeProvider>
  )
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(0.75rem); }
  to { opacity: 1; transform: translateY(0); }
`

// The tile spins a full turn while it grows and settles at its resting angle (-7deg)
const pop = keyframes`
  0% { opacity: 0; transform: scale(0.3) rotate(353deg); }
  15% { opacity: 1; }
  80% { opacity: 1; transform: scale(1.05) rotate(-12deg); }
  100% { opacity: 1; transform: scale(1) rotate(-7deg); }
`

// The lime starts as a huge disc around the dot and contracts into it. Radius 14px x 22 = 308px:
// it covers the width of any phone but never reaches the top edge of the screen, where iOS
// takes the color of the status bar strip and would keep it lime after the animation.
const contract = keyframes`
  from { transform: scale(22); }
  to { transform: scale(1); }
`

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.14); }
`

const letterIn = keyframes`
  from { opacity: 0; transform: translateY(0.6em); }
  to { opacity: 1; transform: translateY(0); }
`

const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== '$leaving',
})<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* the page's own variables: right theme from the first paint */
  overflow: hidden;
  background: var(--sp-bg);
  color: var(--sp-ink);
  opacity: ${({ $leaving }) => ($leaving ? 0 : 1)};
  pointer-events: ${({ $leaving }) => ($leaving ? 'none' : 'auto')};
  transition: opacity ${FADE_MS}ms ease;

  html[data-splash='skip'] &:not([data-hold]) {
    display: none;
  }
`

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`

const MarkWrap = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 0.75rem;
`

const Mark = styled.div`
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.375rem;
  background: ${({ theme }) => theme.colors.forest};
  transform: rotate(-7deg);
  animation: ${pop} 1000ms 650ms cubic-bezier(0.25, 0.8, 0.3, 1) both;
`

// Lives over the tile: the same lime as the screen at first, the dot of the logo at the end
const Dot = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 1.75rem;
  height: 1.75rem;
  margin: -0.875rem 0 0 -0.875rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.lime};
  animation:
    ${contract} 750ms cubic-bezier(0.65, 0, 0.35, 1) both,
    ${breathe} 1500ms 1700ms ease-in-out infinite;
`

const Name = styled.h1`
  display: flex;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.06em;
  line-height: 1.1;
  /* clips the letters while they rise, without cutting the tail of the p */
  padding-bottom: 0.15em;
  overflow: hidden;
`

const Letter = styled.span`
  display: inline-block;
  animation: ${letterIn} 520ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
`

const Tagline = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 1rem;
  animation: ${rise} 700ms 1850ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
`

// Same credits as the home footer, pinned to the bottom edge
const Credits = styled.p`
  position: absolute;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 1.5rem);
  left: 0;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
  animation: ${rise} 700ms 2100ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
`

export default SplashScreen
