'use client'

import styled from '@emotion/styled'

interface GroupProgressProps {
  confirmed: number
  total: number
}

function GroupProgress({ confirmed, total }: GroupProgressProps) {
  const free = Math.max(total - confirmed, 0)
  const percent = total > 0 ? Math.min((confirmed / total) * 100, 100) : 0

  return (
    <Root>
      <Row>
        <Title>Así va el grupo</Title>
        <Free>{free === 0 ? 'Completo' : `${free} ${free === 1 ? 'plaza libre' : 'plazas libres'}`}</Free>
      </Row>
      <Track role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={confirmed}>
        <Fill style={{ width: `${percent}%` }} />
      </Track>
      <Row>
        <Count>
          <strong>{confirmed} confirmados</strong> de {total}
        </Count>
        <Note>Se asigna por orden de inscripción</Note>
      </Row>
    </Root>
  )
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fffefa;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  /* lets Row react to the card's own width instead of the screen's */
  container: group / inline-size;
`

const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;

  /* Narrow card (small phones): stack the two texts instead of squeezing or wrapping them */
  @container group (max-width: 19rem) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }
`

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  font-weight: 700;
`

const Free = styled.span`
  color: ${({ theme }) => theme.colors.forest};
  font-size: 0.8125rem;
  font-weight: 700;
`

const Track = styled.div`
  height: 0.5rem;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.line};
  border: 1px solid ${({ theme }) => theme.colors.hairline};
`

const Fill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.lime};
  transition: width ${({ theme }) => theme.motion.enter};
`

const Count = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;

  strong {
    color: ${({ theme }) => theme.colors.forest};
  }
`

const Note = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
`

export default GroupProgress
