'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/atoms/Logo'
import Input from '@/components/atoms/Input'
import Label from '@/components/atoms/Label'
import Button from '@/components/atoms/Button'
import PasswordInput from '@/components/molecules/PasswordInput'
import { RATING_CONFIG } from '@/lib/config'

// Sign-ups are closed for now: only existing accounts can log in.
// Flip this to bring the register form back (also needs sign-ups enabled in Supabase).
const REGISTRATION_ENABLED = false

// Only same-site paths are allowed as post-login destinations.
function getNextPath() {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const isRegister = REGISTRATION_ENABLED && mode === 'register'

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const handleRegister = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, rating: RATING_CONFIG.INITIAL_RATING } },
    })
    if (error) throw error
    // Force update profile just in case trigger doesn't pick up metadata rating
    if (data.user) {
      await supabase.from('profiles').update({ rating: RATING_CONFIG.INITIAL_RATING }).eq('id', data.user.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      if (isRegister) await handleRegister()
      else await handleLogin()
      router.push(getNextPath())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido completar la operación')
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Escribe primero tu email')
      return
    }

    setLoading(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) setError(error.message)
    else setNotice('Revisa tu email: te hemos enviado un enlace para restablecer tu contraseña.')
    setLoading(false)
  }

  return (
    <Root>
      <Brand>
        <Logo />
        <Tagline>Tu app de Pádel</Tagline>
      </Brand>

      <Form onSubmit={handleSubmit}>
        <Heading>{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</Heading>

        {isRegister && (
          <Field>
            <Label htmlFor="fullname">Nombre completo</Label>
            <Input
              id="fullname"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </Field>
        )}

        <Field>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field>
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </Field>

        {!isRegister && (
          <TextButton type="button" onClick={handleForgotPassword} disabled={loading}>
            ¿Olvidaste tu contraseña?
          </TextButton>
        )}

        {error && <Message role="alert" $error>{error}</Message>}
        {notice && <Message role="status">{notice}</Message>}

        <Button type="submit" $size="lg" disabled={loading}>
          {loading ? 'Cargando…' : isRegister ? 'Registrarse' : 'Iniciar sesión'}
        </Button>

        {REGISTRATION_ENABLED && (
          <TextButton type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Ya tengo cuenta' : 'Crear una cuenta'}
          </TextButton>
        )}
      </Form>
    </Root>
  )
}

const Root = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 2.5rem;
  padding: 2rem 1.5rem;
`

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`

const Tagline = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Heading = styled.h1`
  margin: 0 0 0.25rem;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TextButton = styled.button`
  align-self: flex-end;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.forest};
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
  }
`

const Message = styled('p', {
  shouldForwardProp: (prop) => prop !== '$error',
})<{ $error?: boolean }>`
  margin: 0;
  color: ${({ theme, $error }) => ($error ? theme.colors.alert : theme.colors.forest)};
  font-size: 0.8125rem;
`
