'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from '@/app/actions/users'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Select from '@/components/atoms/Select'
import Field from '@/components/molecules/Field'
import PasswordInput from '@/components/molecules/PasswordInput'
import type { Profile } from '@/types'

const formSchema = z.object({
  full_name: z.string().min(1, { message: 'El nombre no puede estar vacío' }),
  gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
  preferred_hand: z.enum(['diestro', 'zurdo', 'ambidiestro']).optional(),
  court_position: z.enum(['reves', 'drive', 'ambos']).optional(),
})

interface ProfileFormProps {
  userId?: string
  currentName: string
  profile?: Partial<Profile>
}

export function ProfileForm({ currentName, profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: currentName,
      gender: profile?.gender || undefined,
      preferred_hand: profile?.preferred_hand || undefined,
      court_position: profile?.court_position || undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await updateProfile(values)

      toast.success('Perfil actualizado correctamente')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nombre" htmlFor="full_name" error={errors.full_name?.message}>
        <Input id="full_name" placeholder="Tu nombre" {...register('full_name')} />
      </Field>

      <Field label="Género" htmlFor="gender" error={errors.gender?.message}>
        <Select id="gender" {...register('gender')}>
          <option value="">Seleccionar…</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
        </Select>
      </Field>

      <Field label="Mano preferida" htmlFor="preferred_hand" error={errors.preferred_hand?.message}>
        <Select id="preferred_hand" {...register('preferred_hand')}>
          <option value="">Seleccionar…</option>
          <option value="diestro">Diestro</option>
          <option value="zurdo">Zurdo</option>
          <option value="ambidiestro">Ambidiestro</option>
        </Select>
      </Field>

      <Field
        label="Posición en pista"
        htmlFor="court_position"
        hint="Se usa para formar parejas en el sorteo."
        error={errors.court_position?.message}
      >
        <Select id="court_position" {...register('court_position')}>
          <option value="">Seleccionar…</option>
          <option value="reves">Revés (izquierda)</option>
          <option value="drive">Drive (derecha)</option>
          <option value="ambos">Ambos lados</option>
        </Select>
      </Field>

      <Button type="submit" $size="lg" disabled={isLoading || success}>
        {success && <Check />}
        {isLoading ? 'Guardando…' : success ? 'Guardado' : 'Guardar cambios'}
      </Button>
    </Form>
  )
}

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No hay sesión activa. Por favor, cierra sesión y vuelve a entrar.')
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Contraseña actualizada correctamente')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cambiar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={handleChangePassword}>
      <Field label="Nueva contraseña" htmlFor="new-password" hint="Mínimo 6 caracteres.">
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
      </Field>
      <Field label="Confirmar nueva contraseña" htmlFor="confirm-password">
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </Field>
      <Button type="submit" $size="lg" disabled={isLoading || success}>
        {success && <Check />}
        {isLoading ? 'Cambiando…' : success ? 'Contraseña cambiada' : 'Cambiar contraseña'}
      </Button>
    </Form>
  )
}

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <Button type="button" $variant="danger" $size="lg" onClick={handleSignOut}>
      <LogOut />
      Cerrar sesión
    </Button>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`
