'use client'

import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  // Action buttons, laid out in a row at the bottom
  footer?: React.ReactNode
  // false: no close button and no closing by Escape or tapping outside (forced acknowledgement)
  dismissible?: boolean
}

// Mobile-first: a sheet that slides up from the bottom, capped at the app width.
function Dialog({ open, onOpenChange, title, description, children, footer, dismissible = true }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay />
        {/* Without a description, tell Radix on purpose so it does not warn */}
        <Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          {...(dismissible ? {} : { onPointerDownOutside: e => e.preventDefault(), onEscapeKeyDown: e => e.preventDefault(), onInteractOutside: e => e.preventDefault() })}
        >
          <Header>
            <DialogPrimitive.Title asChild>
              <Title>{title}</Title>
            </DialogPrimitive.Title>
            {dismissible && (
              <DialogPrimitive.Close asChild>
                <CloseButton type="button" aria-label="Cerrar">
                  <X />
                </CloseButton>
              </DialogPrimitive.Close>
            )}
          </Header>
          {description && (
            <DialogPrimitive.Description asChild>
              <Description>{description}</Description>
            </DialogPrimitive.Description>
          )}
          {children}
          {footer && <Footer>{footer}</Footer>}
        </Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

const slideUp = keyframes`
  from { transform: translate(-50%, 100%); }
  to { transform: translate(-50%, 0); }
`

const slideDown = keyframes`
  from { transform: translate(-50%, 0); }
  to { transform: translate(-50%, 100%); }
`

const Overlay = styled(DialogPrimitive.Overlay)`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(11, 21, 18, 0.55);

  &[data-state='open'] {
    animation: ${fadeIn} 150ms ease-out;
  }
  &[data-state='closed'] {
    animation: ${fadeOut} 120ms ease-in;
  }
`

const Content = styled(DialogPrimitive.Content)`
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 61;
  display: flex;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  max-height: 90dvh;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.spacing(6, 6)} calc(${theme.space[6]} + env(safe-area-inset-bottom))`};
  border-radius: ${({ theme }) => theme.radii.lg} ${({ theme }) => theme.radii.lg} 0 0;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.ink};
  box-shadow: 0 -8px 32px rgba(11, 21, 18, 0.2);
  transform: translate(-50%, 0);

  &:focus {
    outline: none;
  }
  &[data-state='open'] {
    animation: ${slideUp} 220ms cubic-bezier(0.2, 0.75, 0.25, 1);
  }
  &[data-state='closed'] {
    animation: ${slideDown} 160ms ease-in;
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-state] {
      animation: none;
    }
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(4)};
`

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
`

const Description = styled.p`
  margin: -0.5rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
`

const CloseButton = styled.button`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  margin: -0.25rem -0.5rem 0 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  cursor: pointer;

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`

const Footer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};

  > * {
    flex: 1;
  }
`

export default Dialog
