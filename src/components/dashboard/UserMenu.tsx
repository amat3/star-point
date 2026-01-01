'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface UserMenuProps {
  profile: any
  userName: string
}

export function UserMenu({ profile, userName }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center space-x-3 group outline-none">
          <div className="relative">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-lime-500 transition-transform group-hover:scale-105 group-active:scale-95 shadow-lg shadow-lime-500/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-lime-100 text-lime-800 font-bold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 p-0.5 shadow-sm group-hover:bg-lime-50 dark:group-hover:bg-lime-900/20 transition-colors">
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </div>
          </div>
          <div className="text-left py-1">
            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight">
              Hola, {userName}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end" sideOffset={8}>
        <div className="space-y-1">
          <Link href="/profile">
            <Button variant="ghost" className="w-full justify-start text-sm h-10 px-2 hover:bg-lime-50 dark:hover:bg-lime-900/20 hover:text-lime-700 dark:hover:text-lime-400">
              <User className="mr-2 h-4 w-4" />
              Mi Perfil
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start text-sm h-10 px-2" onClick={() => toast.info('Próximamente...')}>
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </Button>
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm h-10 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
