import { test, expect } from './fixtures'
import { ADMIN, PLAYER, expectNoA11yViolations, firstEventLink, login } from './helpers'

// axe-core over the main screens, in the light and the dark theme. Contrast is where this app slipped
// (muted text, brand green on dark surfaces): the theme tokens were adjusted until it reported nothing.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (${colorScheme})`, () => {
    test.use({ colorScheme })

    test('login', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('portada de un visitante', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByText('Lo que viene')).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test.describe('con sesión', () => {
      test.beforeEach(async ({ page }) => {
        await login(page, PLAYER)
      })

      for (const [name, path, ready] of [
        ['portada', '/', /¡Hola, .+!/],
        ['publicar partido', '/partido', 'Publicar partido'],
        ['mixing', '/mixing', 'Mixing'],
        ['perfil', '/profile', /./],
        ['historial', '/history', 'Historial'],
      ] as const) {
        test(name, async ({ page }) => {
          await page.goto(path)
          await expect(page.getByRole('heading', { name: ready }).first()).toBeVisible()
          await expectNoA11yViolations(page)
        })
      }

      test('un evento', async ({ page }) => {
        await page.goto('/')
        const link = await firstEventLink(page)
        test.skip(!link, 'the demo has no event to open right now')
        await page.goto((await link!.getAttribute('href'))!)
        await expect(page.getByRole('heading').first()).toBeVisible()
        await expectNoA11yViolations(page)
      })
    })

    // The manage panel (edit, add player, cancel) only exists for the organizer or an admin in the admin view,
    // so the player tests never saw it: that is where the "Cancelar" warning button hid a contrast failure
    test('un partido visto como administrador', async ({ page, context, baseURL }) => {
      await login(page, ADMIN)
      await context.addCookies([{ name: 'sp_view', value: 'admin', url: baseURL! }])
      await page.goto('/')
      const partido = await firstEventLink(page, /Partido(?!s)/) // the card runs the title into the time ("Partido19:00"); a mixing says "Partidos creados"
      test.skip(!partido, 'the demo has no partido to open right now')
      await page.goto((await partido!.getAttribute('href'))!)
      await expect(page.getByRole('region', { name: 'Gestionar partido' })).toBeVisible()
      await expectNoA11yViolations(page)
    })
  })
}

// The other tests skip the splash (it covers the page for almost 4 seconds). Its background follows the theme
// but its colors came from the light one, so in the dark theme the tagline and the credits were 3.4:1 and
// nothing here noticed: PageSpeed did.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad de la splash (${colorScheme})`, () => {
    test.use({ colorScheme, skipSplash: false })

    test('el lema y los créditos se leen', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('status', { name: 'Cargando starpoint' })).toBeVisible()
      // Put every animation at t = 3 s and hold it there: the composition is complete (the last text is in at
      // 2.8 s) and the fade-out, which starts at 3.4 s, cannot begin while axe is measuring
      await page.evaluate(() => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 3000 }))
      await expectNoA11yViolations(page, '[aria-label="Cargando starpoint"]')
    })
  })
}

