'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

// The browser's speech recognition (Web Speech API): Chrome, Android and Safari on iOS; not Firefox.
// TypeScript's DOM lib only ships the result types, so the recognizer itself is typed here.
interface Recognizer {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognizerConstructor = new () => Recognizer

// On iOS every browser runs WebKit and exposes the recognizer, but only Safari gets the service
const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS/

function getRecognizer(): RecognizerConstructor | undefined {
  if (IOS_OTHER_BROWSER.test(navigator.userAgent)) return undefined
  const w = window as unknown as { SpeechRecognition?: RecognizerConstructor; webkitSpeechRecognition?: RecognizerConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Permite el micrófono en el navegador para dictar',
  // iOS: Dictation turned off in Settings, or the app opened from the home screen
  'service-not-allowed': 'Aquí no puedo usar el micro: dicta con el micro del teclado',
  'no-speech': 'No te he oído: inténtalo otra vez',
  'audio-capture': 'No encuentro el micrófono',
  network: 'El dictado necesita conexión',
}

/**
 * Dictation into a text box. `onText` receives the full transcript of the current take (interim
 * results included) so the caller can show it live and append it to what was already written.
 */
export function useSpeechDictation(onText: (transcript: string) => void, lang = 'es-ES') {
  // false on the server and during hydration; afterwards, whether the browser has a recognizer
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(getRecognizer()),
    () => false,
  )
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The browser has a recognizer but refuses the service: stop offering the button
  const [blocked, setBlocked] = useState(false)
  const recognizer = useRef<Recognizer | null>(null)
  const onTextRef = useRef(onText)

  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  // Leaving the page mid-dictation releases the microphone
  useEffect(() => () => recognizer.current?.abort(), [])

  const start = useCallback(() => {
    const Recognizer = getRecognizer()
    if (!Recognizer || recognizer.current) return
    const r = new Recognizer()
    r.lang = lang
    r.interimResults = true
    r.continuous = false
    r.onresult = event => {
      const transcript = Array.from(event.results, result => result[0]?.transcript ?? '').join('')
      onTextRef.current(transcript)
    }
    r.onerror = event => {
      if (event.error === 'service-not-allowed') setBlocked(true)
      if (event.error !== 'aborted') setError(ERRORS[event.error] ?? 'No he podido usar el micrófono')
    }
    r.onend = () => {
      recognizer.current = null
      setListening(false)
    }
    setError(null)
    recognizer.current = r
    setListening(true)
    r.start()
  }, [lang])

  const stop = useCallback(() => recognizer.current?.stop(), [])

  return { supported: supported && !blocked, listening, error, start, stop }
}
