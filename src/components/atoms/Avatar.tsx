'use client'

import styled from '@emotion/styled'
import * as AvatarPrimitive from '@radix-ui/react-avatar'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  online?: boolean
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

function Avatar({ src, name, size = 36, online }: AvatarProps) {
  return (
    <Root $size={size}>
      <Circle>
        <Image src={src ?? undefined} alt={name} />
        <Fallback>{initials(name)}</Fallback>
      </Circle>
      {online && <Dot />}
    </Root>
  )
}

// Wrapper doesn't clip, so the status dot can overflow the circle.
const Root = styled.div<{ $size: number }>`
  position: relative;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`

const Circle = styled(AvatarPrimitive.Root)`
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.hairline};
`

const Dot = styled.span`
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.online};
  border: 2px solid ${({ theme }) => theme.colors.background};
`

const Image = styled(AvatarPrimitive.Image)`
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`

const Fallback = styled(AvatarPrimitive.Fallback)`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: #efe8dc;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`

export default Avatar
