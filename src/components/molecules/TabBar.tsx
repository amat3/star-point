'use client'

import styled from '@emotion/styled'
import { css, keyframes } from '@emotion/react'
import type { Theme } from '@/theme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
// highlight where the old one left it and slide it to the current tab.
let lastActive = -1
let lastCount = 0

function isActive(pathname: string, { href, ...tab }: (typeof TABS)[number]) {
  const sections = [href, ...('alsoActiveOn' in tab ? (tab.alsoActiveOn ?? []) : [])]
  return href === '/' ? pathname === '/' : sections.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

function TabBar({ loggedIn = true }: { loggedIn?: boolean }) {
  const pathname = usePathname()
  const tabs = loggedIn ? TABS : GUEST_TABS
  const active = tabs.findIndex(tab => isActive(pathname, tab))
  const canSlide = lastActive >= 0 && lastCount === tabs.length
  const [position, setPosition] = useState(canSlide ? lastActive : active)
  const [visible, setVisible] = useState(canSlide || active >= 0)

  useEffect(() => {
    // Wait a frame so the browser paints the starting position before the highlight moves
    const frame = requestAnimationFrame(() => {
      setVisible(active >= 0)
      if (active >= 0) setPosition(active)
    })
    lastActive = active
    lastCount = tabs.length
    return () => cancelAnimationFrame(frame)
  }, [active, tabs.length])

  return (
    <Root aria-label="Menú principal">
      <Track>
        <Highlight aria-hidden="true" $count={tabs.length} $index={Math.max(position, 0)} $visible={visible} />
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
            <Tab key={label} href={href} aria-current={index === active ? 'page' : undefined}>
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

const iconPop = keyframes`
  0% { transform: scale(0.8); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
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

    svg {
      animation: ${iconPop} 320ms ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
      svg {
        animation: none;
      }
    }
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
