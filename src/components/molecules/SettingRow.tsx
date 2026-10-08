'use client'

import styled from '@emotion/styled'

interface SettingRowProps {
  icon: React.ReactNode
  title: string
  description?: string
  // The control on the right (switch, button…)
  control: React.ReactNode
}

function SettingRow({ icon, title, description, control }: SettingRowProps) {
  return (
    <Root>
      <IconBox>{icon}</IconBox>
      <Text>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
      </Text>
      {control}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`

const IconBox = styled.div`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.forest};

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`

const Text = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
`

const Description = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.35;
`

export default SettingRow
