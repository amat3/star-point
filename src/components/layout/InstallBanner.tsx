'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { X } from 'lucide-react'
import { isStandaloneMode, isIOSDevice, isTouchDevice } from '@/lib/utils'

const DISMISS_KEY = 'pwa-reinstall-dismissed-v1'

export function InstallBanner() {
  const [state, setState] = useState({ visible: false, isIOS: false })

  useEffect(() => {
    function checkInstallState() {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (isTouchDevice() && !isStandaloneMode() && !dismissed) {
        setState({ visible: true, isIOS: isIOSDevice() })
      }
    }
    checkInstallState()
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setState((s) => ({ ...s, visible: false }))
  }

  if (!state.visible) return null

  return (
    <Root role="status">
      <Emoji aria-hidden="true">📲</Emoji>
      <Text>
        <Title>Reinstala starpoint</Title>
        <Description>
          {state.isIOS
            ? 'Borra el icono actual y vuelve a pulsar Compartir → "Añadir a pantalla de inicio" para abrir la app a pantalla completa.'
            : 'Borra el icono actual y usa el menú ⋮ → "Instalar app" para abrir starpoint a pantalla completa.'}
        </Description>
      </Text>
      <Close type="button" onClick={dismiss} aria-label="Cerrar aviso">
        <X />
      </Close>
    </Root>
  )
}

// Sits above the TabBar so it never hides the menu.
const Root = styled.div`
  position: fixed;
  bottom: calc(${({ theme }) => theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + 0.5rem);
  left: 50%;
  z-index: 50;
  display: flex;
  width: calc(100% - 1.5rem);
  max-width: calc(${({ theme }) => theme.layout.maxWidth} - 1.5rem);
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.md};
  transform: translateX(-50%);
`

const Emoji = styled.span`
  flex-shrink: 0;
  font-size: 1.25rem;
  line-height: 1;
`

const Text = styled.div`
  flex: 1;
  min-width: 0;
`

const Title = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
`

const Description = styled.p`
  margin: 0.125rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
  line-height: 1.35;
`

const Close = styled.button`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
`
