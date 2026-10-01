'use client'

import styled from '@emotion/styled'

interface ProfileHeroProps {
  avatar: React.ReactNode
  name: string
  caption?: string
}

function ProfileHero({ avatar, name, caption }: ProfileHeroProps) {
  return (
    <Root>
      {avatar}
      <Name>{name}</Name>
      {caption && <Caption>{caption}</Caption>}
    </Root>
  )
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0 0.25rem;
`

const Name = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
`

const Caption = styled.p`
  margin: -0.25rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

export default ProfileHero
