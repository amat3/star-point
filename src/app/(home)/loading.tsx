import { cookies } from 'next/headers'
import HomeSkeleton from '@/components/molecules/HomeSkeleton'
import Header from '@/components/molecules/Header'
import TabBar from '@/components/molecules/TabBar'

// Streamed first, while the home waits for the database: the layout (with the splash) reaches the
// browser right away instead of after the last query. Header and tab bar are already in place so
// coming back to Inicio does not make them blink. Whether there is a session is guessed from the
// auth cookie (no network): it only decides which tabs to draw, the page then draws the real ones.
export default async function HomeLoading() {
  const hasSession = (await cookies()).getAll().some(({ name }) => /^sb-.+-auth-token/.test(name))

  return (
    <>
      <Header loading />
      <HomeSkeleton />
      <TabBar loggedIn={hasSession} />
    </>
  )
}
