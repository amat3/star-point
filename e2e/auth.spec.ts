import { test, expect } from './fixtures'
import { PLAYER, login } from './helpers'

test.describe('acceso', () => {
  test('un jugador entra y ve su portada', async ({ page }) => {
    await login(page, PLAYER)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /¡Hola, .+!/ })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Perfil' })).toBeVisible()
  })

  test('una contraseña incorrecta no deja entrar y lo explica', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(PLAYER)
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
