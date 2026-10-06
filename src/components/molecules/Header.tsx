'use client'

import styled from '@emotion/styled'

import Logo from "../atoms/Logo"
import AvatarMenu from './AvatarMenu'
import { ButtonLink } from '../atoms/Button'

interface HeaderProps {
  // Omit userName for anonymous visitors: shows a login button instead of the avatar.
  profile?: { avatar_url?: string | null } | null
  userName?: string
  // Real role (not the current view): only admins get the view switch
  isAdmin?: boolean
  adminView?: boolean
}

function Header({ profile, userName, isAdmin = false, adminView = false }: HeaderProps) {
  return (
    <Root>
      <Logo />
      
      {userName ? (
        <Actions>
          {adminView && <AdminPill>Admin</AdminPill>}
          <AvatarMenu name={userName} avatarUrl={profile?.avatar_url} isAdmin={isAdmin} adminView={adminView} />
        </Actions>
      ) : (
        <ButtonLink href="/login" $size="sm">
          Entrar
        </ButtonLink>
      )}
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  display: flex;
  /* Extra room on top: iOS blurs the strip under the status bar and it reached the logo and the avatar */
  flex: 0 0 calc(${({ theme }) => theme.layout.headerHeight} + 0.75rem);
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.hairline};
  background: ${({ theme }) => theme.colors.glass};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`

// Reminder that the admin tools are on, so nobody forgets which view they are in.
const AdminPill = styled.span`
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export default Header
