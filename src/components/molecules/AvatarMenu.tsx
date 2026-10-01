'use client'

import { useTransition } from 'react'
import styled from '@emotion/styled'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import Avatar from '../atoms/Avatar'
import { setAdminView } from '@/app/actions/view-mode'
import { createClient } from '@/utils/supabase/client'

interface AvatarMenuProps {
  name: string
  avatarUrl?: string | null
  // Real role: only admins get the view switch
  isAdmin: boolean
  adminView: boolean
}

function AvatarMenu({ name, avatarUrl, isAdmin, adminView }: AvatarMenuProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const handleViewChange = (checked: boolean) => {
    startTransition(async () => {
      try {
        await setAdminView(checked)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se ha podido cambiar de vista')
      }
    })
  }

  const handleSignOut = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Trigger type="button" aria-label="Menú de usuario">
          <Avatar src={avatarUrl} name={name} online />
        </Trigger>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <Content align="end" sideOffset={8}>
          {isAdmin && (
            <>
              <CheckItem checked={adminView} onCheckedChange={handleViewChange}>
                <ShieldCheck />
                Vista admin
                <DropdownMenu.ItemIndicator asChild>
                  <Indicator><Check /></Indicator>
                </DropdownMenu.ItemIndicator>
              </CheckItem>
              <Separator />
            </>
          )}
          <Item asChild>
            <Link href="/profile">
              <UserRound />
              Perfil
            </Link>
          </Item>
          <Item onSelect={handleSignOut}>
            <LogOut />
            Cerrar sesión
          </Item>
        </Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const Trigger = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
`

const Content = styled(DropdownMenu.Content)`
  z-index: 50;
  min-width: 13rem;
  padding: 0.375rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.md};
`

const itemStyles = ({ theme }: { theme: import('@/theme').Theme }) => `
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border-radius: ${theme.radii.sm};
  color: ${theme.colors.ink};
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  outline: none;
  cursor: pointer;
  user-select: none;

  svg {
    width: 1rem;
    height: 1rem;
    color: ${theme.colors.muted};
  }
  &[data-highlighted] {
    background: ${theme.colors.surface};
  }
`

const Item = styled(DropdownMenu.Item)(itemStyles)
const CheckItem = styled(DropdownMenu.CheckboxItem)(itemStyles)

const Indicator = styled.span`
  margin-left: auto;
  display: grid;
  place-items: center;

  svg {
    color: ${({ theme }) => theme.colors.forest};
  }
`

const Separator = styled(DropdownMenu.Separator)`
  height: 1px;
  margin: 0.25rem 0;
  background: ${({ theme }) => theme.colors.line};
`

export default AvatarMenu
