'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/atoms/Logo'
import Button from '@/components/atoms/Button'
import Field from '@/components/molecules/Field'
import PasswordInput from '@/components/molecules/PasswordInput'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // The reset link signs the user in with a recovery session; the form is always shown.
    const { data } = supabase.auth.onAuthStateChange(() => {})
    return () => data.subscription.unsubscribe()
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('¡Contraseña actualizada correctamente!')
      router.push('/')
    }
  }

  return (
    <Root>
      <Brand>
        <Logo />
      </Brand>

      <Form onSubmit={handleResetPassword}>
        <div>
          <Heading>Nueva contraseña</Heading>
          <Hint>Escribe la contraseña con la que quieres entrar a partir de ahora.</Hint>
        </div>

        <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 6 caracteres.">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>

        <Field label="Confirmar contraseña" htmlFor="confirm-password">
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>

        <Button type="submit" $size="lg" disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar contraseña'}
        </Button>
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
  justify-content: center;
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

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`
