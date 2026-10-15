import { test, expect } from './fixtures'
import { ADMIN, E2E_NOTE_PREFIX, PLAYER, login, madridDate, removeE2EMatches } from './helpers'

// Publishes a partido as a player, an admin joins and leaves it, and the organizer cancels it.
// It writes to the demo database: whatever is left after a failure is removed in afterAll.
test.describe.serial('partido', () => {
  const note = `${E2E_NOTE_PREFIX}${Date.now()}`
  let eventPath = ''

  test.afterAll(async () => {
    await removeE2EMatches()
  })

  test('el formulario no deja publicar sin elegir club', async ({ page }) => {
    await login(page, PLAYER)
    await page.goto('/partido')
    await page.getByRole('button', { name: 'Publicar partido' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Elige un club' })).toBeVisible()
    await expect(page).toHaveURL(/\/partido$/)
  })

  test('un jugador publica un partido y aparece en la portada', async ({ page }) => {
    await login(page, PLAYER)
    await page.goto('/partido')

    await page.getByLabel('Club').selectOption({ index: 1 })
    await page.getByLabel('Fecha').fill(madridDate(1))
    await page.getByLabel('Hora').fill('20:00')
    await page.getByRole('radio', { name: '3' }).click()
    await page.getByLabel('Comentarios (opcional)').fill(note)
    await page.getByRole('button', { name: 'Publicar partido' }).click()

    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/)
    eventPath = new URL(page.url()).pathname
    await expect(page.getByText('Faltan 3 palas para completar el partido.')).toBeVisible()
    await expect(page.getByText(note)).toBeVisible()

    await page.goto('/')
    await expect(page.locator(`a[href="${eventPath}"]`)).toBeVisible()
  })

  test('otro jugador se apunta y se desapunta', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto(eventPath)

    await page.getByRole('button', { name: /^Apuntarme/ }).click()
    await expect(page.getByRole('button', { name: 'Me borro' })).toBeVisible()
    await expect(page.getByText('Faltan 2 palas para completar el partido.')).toBeVisible()

    await page.getByRole('button', { name: 'Me borro' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, desapuntarme' }).click()
    await expect(page.getByRole('button', { name: /^Apuntarme/ })).toBeVisible()
    await expect(page.getByText('Faltan 3 palas para completar el partido.')).toBeVisible()
  })

  test('el organizador cancela el partido y desaparece de la portada', async ({ page }) => {
    await login(page, PLAYER)
    await page.goto(eventPath)

    await page.getByRole('region', { name: 'Gestionar partido' }).getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar partido' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator(`a[href="${eventPath}"]`)).toHaveCount(0)
  })
})
