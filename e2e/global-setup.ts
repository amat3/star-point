// Safety net, like the demo seed script: these tests publish and delete rows, so they must never
// run against the real database, whatever .env files happen to be loaded.
const DEMO_PROJECT_REF = 'dibjelontnvnqdqaljqo'

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!url.includes(DEMO_PROJECT_REF)) {
    throw new Error(
      `The e2e tests only run against the demo project (${DEMO_PROJECT_REF}). ` +
        `NEXT_PUBLIC_SUPABASE_URL is "${url || 'not set'}": check that .env.demo.local exists and is the demo one.`,
    )
  }
  for (const name of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DEMO_PASSWORD']) {
    if (!process.env[name]) throw new Error(`${name} is missing from .env.demo.local`)
  }

  // Warm up the server (compiling the home, the first Supabase connection) so the first test does not pay for it
  const base = `http://localhost:${process.env.E2E_PORT ?? 3100}`
  await fetch(`${base}/`).catch(() => undefined)
  await fetch(`${base}/login`).catch(() => undefined)
}
