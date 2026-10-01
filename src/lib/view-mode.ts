import { cookies } from 'next/headers'

export const VIEW_COOKIE = 'sp_view'

/**
 * Whether the admin-only UI should be shown. Admins start in the player view and
 * switch on purpose; the choice lives in a cookie so every page reads the same
 * mode. This only drives what is displayed: permissions are always checked
 * against the real role on the server.
 */
export async function isAdminView(realRole: string | null | undefined): Promise<boolean> {
  if (realRole !== 'admin') return false
  return (await cookies()).get(VIEW_COOKIE)?.value === 'admin'
}
