import { redirect } from 'next/navigation'

// The dashboard is now the public home.
export default function DashboardPage() {
  redirect('/')
}
