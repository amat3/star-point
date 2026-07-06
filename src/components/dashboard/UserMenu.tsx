'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'

interface UserMenuProps {
  profile?: { avatar_url?: string | null } | null
  userName: string
}

export function UserMenu({ profile, userName }: UserMenuProps) {

  return (
    <Link href="/profile" className="flex items-center space-x-3 group outline-none hover:opacity-90 transition-opacity text-inherit no-underline">
      <div className="relative">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-lime-500 transition-transform group-hover:scale-105 group-active:scale-95 shadow-lg shadow-lime-500/20">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-lime-100 text-lime-800 font-bold text-xl sm:text-2xl">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 p-0.5 shadow-sm group-hover:bg-lime-50 dark:group-hover:bg-lime-900/20 transition-colors">
          <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3 text-gray-500" />
        </div>
      </div>
      <div className="text-left py-1">
        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight">
          {toTitleCase(userName)}
        </p>
      </div>
    </Link>
  )
}
