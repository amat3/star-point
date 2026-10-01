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
  gap: 0.75rem;
`

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.lime};
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const When = styled.span`
  opacity: 0.6;
  font-size: .625rem;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
`

const Description = styled.p`
  margin: 0.375rem 0 0;
  opacity: 0.7;
  font-size: 0.75rem;
`

const Context = styled.p`
  margin: 0 0 0.5rem;
  opacity: 0.6;
  font-size: 0.75rem;
  font-weight: 600;
`

const Summary = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid ${({ theme }) => theme.colors.heroTint};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.heroTint};
`

const Side = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
`

const Names = styled.div`
  display: flex;
  max-width: 100%;
  flex-direction: column;
  opacity: 0.6;
  font-size: 0.75rem;
  line-height: 1.3;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Big = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
`

const Versus = styled.span`
  align-self: end;
  padding-bottom: 0.25rem;
  color: ${({ theme }) => theme.colors.lime};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

export default PendingActionCard
