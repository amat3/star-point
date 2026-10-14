'use client'

import { useRef, useState } from 'react'
import styled from '@emotion/styled'
import { Mic, Square } from 'lucide-react'
import Button from '@/components/atoms/Button'
import Card, { CardDescription, CardTitle } from '@/components/atoms/Card'
import Textarea from '@/components/atoms/Textarea'
import { parseMatchText } from '@/app/actions/match-parser'
import { MATCH_PARSER_MAX_CHARS, type MatchFill } from '@/lib/match-parser'
import { useSpeechDictation } from '@/lib/use-speech-dictation'

const FIELD_LABELS: Record<keyof MatchFill, string> = {
  club_id: 'club',
  date: 'fecha',
  time: 'hora',
  needed: 'jugadores',
  notes: 'comentario',
}

// Free text → form values. It only fills the form below; publishing stays a manual step.
function MatchAssistant({ onFill }: { onFill: (fill: MatchFill) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ filled: string[]; doubts: string[]; remaining: number } | null>(null)
  // What was written before the current dictation: the transcript is appended to it
  const textBeforeDictation = useRef('')
  const dictation = useSpeechDictation(transcript => {
    setText(`${textBeforeDictation.current} ${transcript}`.trim().slice(0, MATCH_PARSER_MAX_CHARS))
  })

  function toggleDictation() {
    if (dictation.listening) return dictation.stop()
    textBeforeDictation.current = text.trim()
    dictation.start()
  }

  async function handleFill() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { fill, doubts, remaining } = await parseMatchText(text)
      onFill(fill)
      const filled = (Object.keys(fill) as (keyof MatchFill)[]).map(key => FIELD_LABELS[key])
      setResult({ filled, doubts, remaining })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No he podido entender el texto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div>
        <CardTitle>Escríbelo y lo relleno por ti</CardTitle>
        <CardDescription>
          {dictation.supported
            ? 'Escríbelo o pulsa el micro y díctalo. Después revisas el formulario y lo publicas tú.'
            : 'Después revisas el formulario y lo publicas tú. En el móvil también puedes dictarlo con el micro del teclado.'}
        </CardDescription>
      </div>

      <Textarea
        aria-label="Describe el partido"
        rows={3}
        maxLength={MATCH_PARSER_MAX_CHARS}
        placeholder="Ej.: busco 2 para el jueves a las 19:00 en Padel Indoor, mejor un revés"
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <Footer>
        <Counter>{dictation.listening ? 'Escuchando…' : `${text.length}/${MATCH_PARSER_MAX_CHARS}`}</Counter>
        <Actions>
          {dictation.supported && (
            <Button
              type="button"
              $variant={dictation.listening ? 'accent' : 'outline'}
              $size="icon"
              aria-label={dictation.listening ? 'Parar el dictado' : 'Dictar con el micrófono'}
              aria-pressed={dictation.listening}
              disabled={loading}
              onClick={toggleDictation}
            >
              {dictation.listening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
            </Button>
          )}
          <Button type="button" $variant="outline" disabled={loading || dictation.listening || !text.trim()} onClick={handleFill}>
            {loading ? 'Rellenando…' : 'Rellenar'}
          </Button>
        </Actions>
      </Footer>

      {dictation.error && <Message role="alert" $tone="error">{dictation.error}</Message>}

      {error && <Message role="alert" $tone="error">{error}</Message>}

      {result && (
        <Message role="status">
          {result.filled.length > 0
            ? `He rellenado: ${result.filled.join(', ')}. Revisa el formulario antes de publicar.`
            : 'No he encontrado datos del partido en el texto.'}
          {result.doubts.length > 0 && (
            <Doubts>
              {result.doubts.map(doubt => <li key={doubt}>{doubt}</li>)}
            </Doubts>
          )}
          <Remaining>
            {result.remaining === 1 ? 'Te queda 1 relleno hoy' : `Te quedan ${result.remaining} rellenos hoy`}
          </Remaining>
        </Message>
      )}
    </Card>
  )
}

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Counter = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`

const Message = styled('div', { shouldForwardProp: prop => prop !== '$tone' })<{ $tone?: 'error' }>`
  color: ${({ theme, $tone }) => ($tone === 'error' ? theme.colors.danger : theme.colors.ink)};
  font-size: ${({ theme }) => theme.fontSizes.base};
`

const Doubts = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  margin: ${({ theme }) => theme.spacing(2, 0, 0)};
  padding: 0;
  list-style: none;
  text-align: left;

  li {
    position: relative;
    padding-left: ${({ theme }) => theme.spacing(4)};
  }

  li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 0.45em;
    height: 0.45em;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.amber};
  }
`

const Remaining = styled.p`
  margin: ${({ theme }) => theme.spacing(2, 0, 0)};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`

export default MatchAssistant
