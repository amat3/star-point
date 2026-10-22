'use client'

import styled from '@emotion/styled'
import { css } from '@emotion/react'
import type { Theme } from '@/theme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Activity, CircleUserRound, Home, LogIn, Plus } from 'lucide-react'

// Tabs without an href are placeholders until their page exists.
const TABS = [
  { label: 'Inicio', icon: Home, href: '/' },
  // Event pages belong to the Mixing section, so the tab stays active there
  { label: 'Mixing', icon: Activity, href: '/mixing', alsoActiveOn: ['/events'] },
  { label: 'Partido', icon: Plus, href: '/partido' },
  { label: 'Perfil', icon: CircleUserRound, href: '/profile' },
]

const GUEST_TABS = [
  TABS[0],
  { label: 'Entrar', icon: LogIn, href: '/login' },
]

// Every page renders its own TabBar, so it remounts on each navigation. The last highlighted position
// lives at module level (it survives client-side navigations) so the new bar can start the
// highlight where the old one left it (even in mid-slide, so it never jumps) and slide it to the current tab.
let lastPosition = -1 // in tab units, fractional while moving; -1 = nothing highlighted
let lastCount = 0

function isActive(pathname: string, { href, ...tab }: (typeof TABS)[number]) {
  const sections = [href, ...('alsoActiveOn' in tab ? (tab.alsoActiveOn ?? []) : [])]
  return href === '/' ? pathname === '/' : sections.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

function TabBar({ loggedIn = true }: { loggedIn?: boolean }) {
  const pathname = usePathname()
  const tabs = loggedIn ? TABS : GUEST_TABS
  const active = tabs.findIndex(tab => isActive(pathname, tab))
  const highlight = useRef<HTMLSpanElement>(null)
  const canSlide = lastPosition >= 0 && lastCount === tabs.length
  const [position, setPosition] = useState(canSlide ? lastPosition : active)
  const [visible, setVisible] = useState(canSlide || active >= 0)

  useEffect(() => {
    // Wait a frame so the browser paints the starting position before the highlight moves
    const frame = requestAnimationFrame(() => {
      setVisible(active >= 0)
      if (active >= 0) setPosition(active)
    })
    return () => cancelAnimationFrame(frame)
  }, [active, tabs.length])

  // On unmount, remember where the highlight is right now (it may be halfway through a slide)
  const count = tabs.length
  useEffect(() => {
    const element = highlight.current
    return () => {
      const track = element?.parentElement
      if (!element || !track || getComputedStyle(element).opacity === '0') {
        lastPosition = -1
        return
      }
      const margin = parseFloat(getComputedStyle(element).marginLeft)
      lastPosition = ((element.offsetLeft - margin) / track.offsetWidth) * count
      lastCount = count
    }
  }, [count])

  return (
    <Root aria-label="Menú principal">
      <Track>
        <Highlight ref={highlight} aria-hidden="true" $count={tabs.length} $index={Math.max(position, 0)} $visible={visible} />
        {tabs.map(({ label, icon: Icon, href }, index) => {
          const content = (
            <>
              <Icon />
              <span>{label}</span>
            </>
          )
          if (!href) {
            return (
              <Placeholder key={label} aria-disabled="true">
                {content}
              </Placeholder>
            )
          }
          return (
            <Tab
              key={label}
              href={href}
              // Start the slide on touch, not after the next page has loaded
              onClick={() => {
                setPosition(index)
                setVisible(true)
              }}
              aria-current={index === active ? 'page' : undefined}>
              {content}
            </Tab>
          )
        })}
      </Track>
    </Root>
  )
}

const Root = styled.nav`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: ${({ theme }) => theme.layout.tabBarHeight};
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  padding-bottom: env(safe-area-inset-bottom);
  padding-inline: ${({ theme }) => theme.spacing(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.hairline};
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(12px);
`

// Same width as the Root content box; the tabs share it equally, so the highlight can be placed by index
const Track = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
`

const Highlight = styled.span<{ $count: number; $index: number; $visible: boolean }>`
  position: absolute;
  inset-block: 0;
  left: ${({ $count, $index }) => `calc(${$index} * 100% / ${$count})`};
  margin-inline: ${({ theme }) => theme.spacing(1)};
  width: ${({ $count, theme }) => `calc(100% / ${$count} - ${theme.spacing(2)})`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition:
    left 320ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const tabStyles = (theme: Theme) => css`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing(1)};
  color: ${theme.colors.tabInactive};
  font-size: ${theme.fontSizes['2xs']};
  font-weight: 600;
  text-decoration: none;
  // No grey flash on tap: the highlight already marks the selection
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  // line-height 1 and a block icon: otherwise the text line box leaves extra room below the label
  line-height: 1;
  padding-block: ${theme.spacing(2)};
  margin-inline: ${theme.spacing(1)};
  // Above the sliding highlight
  position: relative;

  svg {
    display: block;
  }

  &[aria-current='page'] {
    color: ${theme.colors.forestText};
  }
`

const Tab = styled(Link)`
  ${({ theme }) => tabStyles(theme)}
`

const Placeholder = styled.span`
  ${({ theme }) => tabStyles(theme)}
  opacity: 0.45;
`

export default TabBar
