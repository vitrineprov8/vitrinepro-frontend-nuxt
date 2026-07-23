import { test, expect } from '@playwright/test'
import { ACCOUNTS } from './fixtures/accounts'
import { formLoginSubmit } from './fixtures/auth'

// Fluxos de autenticação dirigindo o formulário real de login (não a API).
// Os testes toleram o throttle de 5/60s via `formLoginSubmit`; por isso o timeout maior.

test.describe('Login', () => {
  test('credencial inválida mostra erro e não desloga/navega', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/login')
    const outcome = await formLoginSubmit(page, ACCOUNTS.hunter.email, 'SENHA_ERRADA_999')
    expect(outcome).toBe('invalid')
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login válido leva ao workspace do papel', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/login')
    const outcome = await formLoginSubmit(page, ACCOUNTS.empresa.email, ACCOUNTS.empresa.password)
    expect(outcome).toBe('success')
    await expect(page).toHaveURL(/\/app\/empresa/, { timeout: 15_000 })
    await expect(page.locator('.shell__sidebar')).toBeVisible()
  })
})

test.describe('Guard de rota', () => {
  test('rota /app sem sessão redireciona a /login com ?redirect', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/app/empresa/faturas')
    // O browser exibe o redirect decodificado (?redirect=/app/empresa/faturas).
    await expect(page).toHaveURL(/\/login\?redirect=\/app\/empresa\/faturas/)
  })

  test('após login o ?redirect é respeitado', async ({ page }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()
    await page.goto('/app/empresa/faturas')
    await expect(page).toHaveURL(/\/login\?redirect=/)

    const outcome = await formLoginSubmit(page, ACCOUNTS.empresa.email, ACCOUNTS.empresa.password)
    expect(outcome).toBe('success')
    await expect(page).toHaveURL(/\/app\/empresa\/faturas/, { timeout: 15_000 })
  })
})
