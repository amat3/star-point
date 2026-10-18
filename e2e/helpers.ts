import AxeBuilder from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { expect } from './fixtures'

export const PLAYER = 'demo@example.com'
export const ADMIN = 'admin-demo@example.com'

/** Marker in the comment of every partido the tests publish, so they can be found and removed. */
export const E2E_NOTE_PREFIX = 'e2e-'

export async function login(page: Page, email: string, password = process.env.DEMO_PASSWORD ?? '') {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  // The first login after the server starts also pays its cold start and a round trip to Supabase
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}

/** YYYY-MM-DD, `days` from today, as the calendar reads in Madrid. */
export function madridDate(days: number) {
  const ms = Date.now() + days * 24 * 60 * 60 * 1000
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(ms)
}

/** Deletes every partido the tests published (global setup guarantees this is the demo database). */
export async function removeE2EMatches() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: events } = await db.from('events').select('id').eq('kind', 'match').like('notes', `${E2E_NOTE_PREFIX}%`)
  const ids = (events ?? []).map(event => event.id)
  if (ids.length === 0) return 0
  await db.from('event_participants').delete().in('event_id', ids)
  await db.from('events').delete().in('id', ids)
  return ids.length
}

/**
 * Runs axe-core on the current page with the WCAG 2.0, 2.1 and 2.2 A and AA rules and fails with
 * one readable line per problem. Automated checks cover only part of WCAG (contrast, names and
 * roles, labels, landmarks...): this guards against regressions, it is not an audit.
 */
export async function expectNoA11yViolations(page: Page, scope?: string) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  const { violations } = await (scope ? builder.include(scope) : builder).analyze()
  const lines = violations.map(violation => {
    const first = violation.nodes[0]
    const detail = first.any[0]?.message ?? first.failureSummary?.split('\n')[1]?.trim() ?? ''
    return `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${violation.help} | ${first.target.join(' ')} | ${detail}`
  })
  expect(lines, 'WCAG 2.2 AA (axe-core)').toEqual([])
}
