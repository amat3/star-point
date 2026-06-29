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
import { updateProfile } from '@/app/actions/users'
import type { Profile } from '@/types'

// Change Password Component
function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (error) {
      console.error('❌ Error changing password:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cambiar la contraseña')
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
      <Button type="submit" disabled={isLoading || success}>
        {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
      </Button>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-green-700 dark:text-green-400 text-sm font-medium animate-in fade-in duration-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Contraseña actualizada correctamente
        </div>
      )}
    </form>
  )
}

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
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
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
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el perfil')
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
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Technical Profile Section */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Perfil Técnico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_hand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mano Preferida</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="diestro">Diestro</option>
                        <option value="zurdo">Zurdo</option>
                        <option value="ambidiestro">Ambidiestro</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="court_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición en Pista</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="reves">Revés (Izquierda)</option>
                        <option value="drive">Drive (Derecha)</option>
                        <option value="ambos">Ambos Lados</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

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
