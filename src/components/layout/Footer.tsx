'use client'

import styled from '@emotion/styled'

export function Footer() {
  return (
    <Root>
      <Author href="https://wa.me/34629572745" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L0 24l6.335-1.502A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.373l-.359-.214-3.721.882.933-3.613-.234-.372A9.818 9.818 0 1112 21.818z"/>
                  </svg>
        JUANAN AMATE
      </Author>
      <Copyright>© 2026</Copyright>
    </Root>
  )
}

// Bottom padding keeps the footer clear of the fixed TabBar.
const Root = styled.footer`
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.25rem;
  width: 100%;
  padding: 1.5rem 1rem calc(${({ theme }) => theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + 0.5rem);
`

const Author = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
  text-decoration: none;
  transition: color 150ms ease;

  svg {
    width: 0.875rem;
    height: 0.875rem;
    fill: currentColor;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.online};
  }
`

const Copyright = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`
