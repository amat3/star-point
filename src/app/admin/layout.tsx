import { requireAdmin } from '@/lib/admin'

// Every page under /admin (including the older client-side ones) requires the real admin role.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
