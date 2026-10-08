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
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2, 0, 1)};
`

const Name = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
`

const Caption = styled.p`
  margin: -0.25rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`

export default ProfileHero
