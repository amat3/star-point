'use client'

import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { ThemeProvider, css, keyframes } from '@emotion/react'
import { darkTheme, lightTheme } from '@/theme'

const SHOW_MS = 3400
const FADE_MS = 500

// Runs before the first paint (inline, in the layout): marks the page so the splash
// is hidden by CSS when it should not appear, instead of flashing and then going away.
// It only shows on the first load of the session, on the home, and without reduced motion.
// When it does show it also marks the session, here and not after hydration, so a reload
// before React is ready does not play it again.
export const SPLASH_GUARD_SCRIPT = `try{var d=document.documentElement;if(location.pathname!=='/'||sessionStorage.getItem('sp-splash')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-splash','skip');else sessionStorage.setItem('sp-splash','1')}catch(e){document.documentElement.setAttribute('data-splash','skip')}`

type Phase = 'show' | 'done'

const NAME = 'starpoint'

// A padel court is 10 x 20 m: the outline in a 100 x 200 box (half a stroke inside, so the inner
// lines meet it exactly), rounded corners, starting at the top-left and going clockwise.
const COURT_OUTLINE = 'M 3.25 0.25 H 96.75 A 3 3 0 0 1 99.75 3.25 V 196.75 A 3 3 0 0 1 96.75 199.75 H 3.25 A 3 3 0 0 1 0.25 196.75 V 3.25 A 3 3 0 0 1 3.25 0.25 Z'
// The service lines are 6.95 m from the net: 3.05 m of the 20 m from each back wall
const SERVICE_LINE = '15.25%'

// First screen when the app is opened from scratch: the brand and the orb while the
// home is already loading behind it.
function SplashScreen({ hold = false }: { hold?: boolean }) {
  const [phase, setPhase] = useState<Phase>('show')
  const rootRef = useRef<HTMLDivElement>(null)
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
    // The exit is a CSS animation that starts with the first paint, so it lasts the same however
    // late React hydrates. Here we only remove the element once that animation has finished
    // (it may already have, if hydration was slow).
    let cancelled = false
    const finish = () => {
      if (!cancelled) setPhase('done')
    }
    const animations = rootRef.current?.getAnimations() ?? []
    if (animations.length > 0) {
      Promise.all(animations.map(animation => animation.finished)).then(finish, finish)
      return () => {
        cancelled = true
      }
    }
    const fallback = setTimeout(finish, SHOW_MS + FADE_MS)
    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [hold])

  if (phase === 'done') return null

  // Always the light theme: the splash is the brand, whatever the device uses
  return (
    <ThemeProvider theme={lightTheme}>
      <Root ref={rootRef} $hold={hold} data-hold={hold || undefined} role="status" aria-label="Cargando starpoint">
        <Brand key={cycle}>
          <MarkWrap>
            <Court aria-hidden="true">
              <Outline viewBox="0 0 100 200" preserveAspectRatio="none">
                <path d={COURT_OUTLINE} pathLength={1} />
              </Outline>
              <NetLine $side="left" />
              <NetLine $side="right" />
              <ServiceLine $side="top" />
              <ServiceLine $side="bottom" />
              <CenterLine $side="top" />
              <CenterLine $side="bottom" />
            </Court>
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

// At the end the dash is removed: a dashed closed path has no join where it starts, which left a
// small notch in the corner
const traceOutline = keyframes`
  from { stroke-dashoffset: 1; }
  99.9% { stroke-dashoffset: 0; stroke-dasharray: 1; }
  to { stroke-dashoffset: 0; stroke-dasharray: none; }
`

const growX = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`

const growY = keyframes`
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
`

const letterIn = keyframes`
  from { opacity: 0; transform: translateY(0.6em); }
  to { opacity: 1; transform: translateY(0); }
`

// Fades the whole splash out after SHOW_MS. visibility goes hidden at the end, so it also stops
// catching taps if the element is still in the DOM.
const leave = keyframes`
  from { opacity: 1; visibility: visible; }
  to { opacity: 0; visibility: hidden; }
`

const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== '$hold',
})<{ $hold: boolean }>`
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
  /* review mode (hold) never leaves */
  ${({ $hold }) => ($hold ? css`animation: none;` : css`animation: ${leave} ${FADE_MS}ms ${SHOW_MS}ms ease both;`)}

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

// The court sits behind the logo with its center on the tile: the dot of the logo is the center
// mark. Lines are the brand green at low opacity (lime on the dark background, where green would
// vanish), as a group so crossings do not get darker.
const Court = styled.div`
  --logo-gap-x: 5.5rem;
  --logo-gap-top: 4rem;
  --logo-gap-bottom: 10rem;
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  height: min(72dvh, 172vw, 48rem);
  aspect-ratio: 1 / 2;
  transform: translate(-50%, -50%);
  color: ${({ theme }) => theme.colors.forest};
  opacity: 0.2;
  pointer-events: none;

  html.dark & {
    color: ${darkTheme.colors.lime};
    opacity: 0.4;
  }
`

const Outline = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;

  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.5;
    stroke-dasharray: 1;
    animation: ${traceOutline} 1000ms 900ms cubic-bezier(0.65, 0, 0.35, 1) both;
  }
`

// Straight lines are plain boxes that grow with a transform, and they stop short of the logo
const line = `
  position: absolute;
  background: currentColor;
`

// The net: two halves that grow from the logo out to the walls
const NetLine = styled('span', { shouldForwardProp: prop => prop !== '$side' })<{ $side: 'left' | 'right' }>`
  ${line}
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 0;' : 'right: 0;')}
  width: calc(50% - var(--logo-gap-x));
  height: 2px;
  margin-top: -1px;
  transform-origin: ${({ $side }) => ($side === 'left' ? 'right' : 'left')} center;
  animation: ${growX} 600ms 1200ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
`

// The top one is drawn left to right and the bottom one right to left: they follow the outline
const ServiceLine = styled('span', { shouldForwardProp: prop => prop !== '$side' })<{ $side: 'top' | 'bottom' }>`
  ${line}
  ${({ $side }) => ($side === 'top' ? `top: ${SERVICE_LINE};` : `bottom: ${SERVICE_LINE};`)}
  right: 0;
  left: 0;
  height: 1.5px;
  transform-origin: ${({ $side }) => ($side === 'top' ? 'left' : 'right')} center;
  animation: ${growX} 500ms ${({ $side }) => ($side === 'top' ? 1350 : 1500)}ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
`

// The center line of each service box, from the logo toward the service line
const CenterLine = styled('span', { shouldForwardProp: prop => prop !== '$side' })<{ $side: 'top' | 'bottom' }>`
  ${line}
  left: 50%;
  width: 1.5px;
  margin-left: -0.75px;
  ${({ $side }) =>
    $side === 'top'
      ? `top: ${SERVICE_LINE}; bottom: calc(50% + var(--logo-gap-top)); transform-origin: center bottom;`
      : `top: calc(50% + var(--logo-gap-bottom)); bottom: ${SERVICE_LINE}; transform-origin: center top;`}
  animation: ${growY} 400ms 1650ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
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
