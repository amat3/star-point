'use client'

import styled from '@emotion/styled'

import Logo from "../atoms/Logo"
import Avatar from '../atoms/Avatar'
import { ButtonLink } from '../atoms/Button'

interface HeaderProps {
  // Omit userName for anonymous visitors: shows a login button instead of the avatar.
  profile?: { avatar_url?: string | null } | null
  userName?: string
}

function Header({ profile, userName }: HeaderProps) {
  return (
    <Root>
      <Logo />
      
      {userName ? (
        <Avatar src={profile?.avatar_url} name={userName} online />
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
  flex: 0 0 ${({ theme }) => theme.layout.headerHeight};
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.hairline};
  background: ${({ theme }) => theme.colors.glass};
`

export default Header
