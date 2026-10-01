'use client'

import styled from '@emotion/styled'
import { css } from '@emotion/react'
import type { Theme } from '@/theme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

function TabBar({ loggedIn = true }: { loggedIn?: boolean }) {
  const pathname = usePathname()

  return (
    <Root aria-label="Menú principal">
      {(loggedIn ? TABS : GUEST_TABS).map(({ label, icon: Icon, href, ...tab }) => {
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
        const sections = [href, ...('alsoActiveOn' in tab ? (tab.alsoActiveOn ?? []) : [])]
        const active = href === '/' ? pathname === '/' : sections.some(path => pathname === path || pathname.startsWith(`${path}/`))
        return (
          <Tab key={label} href={href} aria-current={active ? 'page' : undefined}>
            {content}
          </Tab>
        )
      })}
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
  padding-top: 8px;
  padding-bottom: env(safe-area-inset-bottom);
  padding-inline: 13px;
  border-top: 1px solid ${({ theme }) => theme.colors.hairline};
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(12px);
`

const tabStyles = (theme: Theme) => css`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: ${theme.colors.tabInactive};
  font-size: 10px;
  font-weight: 600;
  text-decoration: none;

  &[aria-current='page'] {
    color: ${theme.colors.forest};
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
