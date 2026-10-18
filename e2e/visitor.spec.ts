import { test, expect } from './fixtures'

test.describe('visitante sin sesión', () => {
  test('la portada pública enseña los eventos y ofrece entrar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Lo que viene')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()
    // Nothing that belongs to a signed-in player
    await expect(page.getByRole('link', { name: 'Perfil' })).toHaveCount(0)
  })

  test('una ruta protegida redirige al login conservando adónde iba', async ({ page }) => {
    await page.goto('/partido')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)partido/)
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })
})

test.describe('splash', () => {
  test.use({ skipSplash: false })

  test('aparece al abrir la app y se retira sola, sin esperar a que React hidrate', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    const splash = page.getByRole('status', { name: 'Cargando starpoint' })
    await expect(splash).toBeVisible()
    // 3.4 s on screen + 0.5 s of fade, driven by CSS from the first paint
    await expect(splash).toBeHidden({ timeout: 8_000 })
    await expect(page.getByText('Lo que viene')).toBeVisible()
  })

  test('solo sale una vez por sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('status', { name: 'Cargando starpoint' })).toBeHidden({ timeout: 8_000 })
    await page.reload()
    await expect(page.getByRole('status', { name: 'Cargando starpoint' })).toHaveCount(0)
  })
})

// What the public home downloads for someone with no session (PageSpeed, recruiters, new players)
test.describe('portada pública: lo que descarga y lo que enseña', () => {
  // Only what the page itself needs: the scripts in its HTML. Next also prefetches /login (the header, the locked
  // cards and a tab link to it), which does use Supabase, right after the load and without blocking anything
  test('el HTML de la portada no pide el cliente de Supabase ni los diálogos: solo los usa un jugador con sesión', async ({ page }) => {
    const html = await (await page.request.get('/')).text()
    const scripts = [...new Set(html.match(/\/_next\/static\/chunks\/[a-z0-9]+\.js/g) ?? [])]

    expect(scripts.length, 'se han encontrado los scripts de la página').toBeGreaterThan(5)
    for (const path of scripts) {
      const body = await (await page.request.get(path)).text()
      expect(body, `${path} trae el cliente de Supabase`).not.toContain('GoTrueClient')
    }
  })
})
