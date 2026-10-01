export const dynamic = 'force-dynamic'
export const revalidate = 0

import { CalendarPlus, ClipboardCheck, ShieldBan, Users } from 'lucide-react'
import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import NavRow from '@/components/molecules/NavRow'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

// Admin hub: entry point for everything that used to live on the old dashboard.
export default async function AdminPage() {
  const { supabase, user, profile } = await requireAdmin()

  const { count: pending } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'disputed'])

  return (
    <>
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro title="Administración" subtitle="Herramientas del grupo" />

      <Content>
        <NavRow
          href="/admin/events/new"
          icon={<CalendarPlus />}
          title="Crear evento"
          description="Convoca un mixing con club, fecha y pistas"
        />
        <NavRow
          href="/admin/matches"
          icon={<ClipboardCheck />}
          title="Partidos pendientes"
          description="Revisa, confirma o corrige resultados"
          badge={pending ?? 0}
        />
        <NavRow
          href="/admin/exclusions"
          icon={<ShieldBan />}
          title="Exclusiones del sorteo"
          description="Parejas que el algoritmo debe evitar"
        />
        <NavRow
          href="/admin/players"
          icon={<Users />}
          title="Jugadores"
          description="Niveles y posiciones de todo el grupo"
        />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
