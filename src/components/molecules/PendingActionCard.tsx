'use client'

import styled from '@emotion/styled'
import HeroCard from '../atoms/HeroCard'
import PulsatingDot from '../atoms/PulsatingDot'

interface PendingActionCardProps {
  when: string
  title: string
  description: string
  myTeam: string[]
  opponents: string[]
  // Total games of each side; '--' while there is no result
  myGames: string
  theirGames: string
  // Court and round, shown above the summary box
  context: string | null
  action: React.ReactNode
}

function PendingActionCard({ when, title, description, myTeam, opponents, myGames, theirGames, context, action }: PendingActionCardProps) {
  return (
    <HeroCard>
      <Top>
        <Eyebrow>
          <PulsatingDot size={8} />
          Acción pendiente
        </Eyebrow>
        <When>{when}</When>
      </Top>

      <div>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </div>

      <div>
        {context && <Context>{context}</Context>}
        <Summary>
          <Side>
            <Names>{myTeam.map(name => <span key={name}>{name}</span>)}</Names>
            <Big>{myGames}</Big>
          </Side>
          <Versus>vs</Versus>
          <Side>
            <Names>{opponents.map(name => <span key={name}>{name}</span>)}</Names>
            <Big>{theirGames}</Big>
          </Side>
        </Summary>
      </div>

      {action}
    </HeroCard>
  )
}

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.lime};
  font-size: ${({ theme }) => theme.fontSizes['2xs']};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const When = styled.span`
  opacity: 0.6;
  font-size: ${({ theme }) => theme.fontSizes['2xs']};
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
`

const Description = styled.p`
  margin: ${({ theme }) => theme.spacing(2, 0, 0)};
  opacity: 0.7;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`

const Context = styled.p`
  margin: ${({ theme }) => theme.spacing(0, 0, 2)};
  opacity: 0.6;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
`

const Summary = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.heroTint};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.heroTint};
`

const Side = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  text-align: center;
`

const Names = styled.div`
  display: flex;
  max-width: 100%;
  flex-direction: column;
  opacity: 0.6;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.3;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Big = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
`

const Versus = styled.span`
  align-self: end;
  padding-bottom: ${({ theme }) => theme.spacing(1)};
  color: ${({ theme }) => theme.colors.lime};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

export default PendingActionCard
