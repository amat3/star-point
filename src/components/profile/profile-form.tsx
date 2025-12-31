'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { LogOut, Eye, EyeOff } from 'lucide-react'

// Change Password Component
function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    console.log('🔐 Iniciando cambio de contraseña...')

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
      // Verificar sesión actual
      const { data: { session } } = await supabase.auth.getSession()
      console.log('📋 Sesión actual:', session ? 'Activa' : 'No activa')

      if (!session) {
        throw new Error('No hay sesión activa. Por favor, cierra sesión y vuelve a entrar.')
      }

      console.log('🔄 Actualizando contraseña...')
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      console.log('📊 Resultado:', { data, error })

      if (error) throw error

      toast.success('Contraseña actualizada correctamente')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('❌ Error changing password:', error)
      toast.error(error.message || 'Error al cambiar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="new-password" className="text-sm font-medium">
          Nueva Contraseña
        </label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium">
          Confirmar Nueva Contraseña
        </label>
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
      </Button>
    </form>
  )
}

const formSchema = z.object({
  full_name: z.string().min(1, { message: 'El nombre no puede estar vacío' }),
})

interface ProfileFormProps {
  userId: string
  currentName: string
}

export function ProfileForm({ userId, currentName }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: currentName,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: values.full_name })
        .eq('id', userId)

      if (error) throw error

      toast.success('Perfil actualizado correctamente')
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </Form>

      {/* Change Password Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Cambiar Contraseña
        </h3>
        <ChangePasswordForm />
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Zona de Sesión
        </h3>
        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="w-full sm:w-auto"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
