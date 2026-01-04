'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff } from 'lucide-react'
import { RATING_CONFIG } from '@/lib/config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          rating: RATING_CONFIG.INITIAL_RATING
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Force update profile just in case trigger doesn't pick up metadata rating
      if (data.user) {
        await supabase.from('profiles').update({ 
          rating: RATING_CONFIG.INITIAL_RATING 
        }).eq('id', data.user.id)
      }
      router.push('/dashboard')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu email primero')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      alert('¡Revisa tu email! Te hemos enviado un enlace para restablecer tu contraseña.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full flex-1 px-4 py-12 sm:px-6 lg:px-8 animate-in fade-in duration-1000">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Star<span className="text-lime-500">Point</span>
          </h2>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Tu app de Padel & Risas
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Bienvenido de nuevo</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales para acceder a tu cuenta.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
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
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      disabled={loading}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  {error && (
                    <div className="text-sm text-red-500">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-6">
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? 'Cargando...' : 'Iniciar Sesión'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Crea una cuenta</CardTitle>
                <CardDescription>
                  Únete a StarPoint para empezar a jugar.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="p-3 mb-4 text-sm text-yellow-800 bg-yellow-100 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/50">
                    ⚠️ El registro de nuevos usuarios está temporalmente deshabilitado. Contacta con un administrador si necesitas acceso.
                  </div>
                  <div className="space-y-2 opacity-60">
                    <Label htmlFor="register-fullname">Nombre Completo</Label>
                    <Input 
                      id="register-fullname" 
                      type="text" 
                      placeholder="Juan Pérez"
                      disabled
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="nombre@ejemplo.com"
                      disabled
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <div className="relative">
                      <Input 
                        id="register-password" 
                        type={showPassword ? "text" : "password"}
                        disabled
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        disabled
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="text-sm text-red-500">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-6">
                  <Button className="w-full" type="submit" disabled>
                    Registrarse (Deshabilitado)
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
