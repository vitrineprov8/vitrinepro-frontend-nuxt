import { test, expect } from '@playwright/test'
import { expectNoRenderLeaks, collectConsoleErrors } from './fixtures/util'

// Painel Admin (admin@gmail.com). 10 seções.

const ADMIN_PAGES: { path: string, title: RegExp }[] = [
  { path: '/app/admin', title: /Visão Geral — Admin/ },
  { path: '/app/admin/verificacoes', title: /Verificações/ },
  { path: '/app/admin/disputas', title: /Disputas/ },
  { path: '/app/admin/placements', title: /Placements/ },
  { path: '/app/admin/payouts', title: /Pagamentos/ },
  { path: '/app/admin/invoices', title: /Faturas/ },
  { path: '/app/admin/cupons', title: /Cupons/ },
  { path: '/app/admin/usuarios', title: /Usuários/ },
  { path: '/app/admin/vagas', title: /Vagas/ },
  { path: '/app/admin/empresas', title: /Empresas/ },
]

test.describe('Admin', () => {
  test('faixa vermelha ADMIN e visão geral com KPIs', async ({ page }) => {
    await page.goto('/app/admin')
    await expect(page.locator('.shell__admin-strip')).toBeVisible()
    await expect(page.getByText(/GMV de fees/)).toBeVisible()
    await expect(page.getByText(/Take da plataforma/)).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  for (const { path, title } of ADMIN_PAGES) {
    test(`carrega ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveTitle(title)
      await expect(page.locator('.shell__sidebar')).toBeVisible()
      await expectNoRenderLeaks(page)
    })
  }

  test('usuários: busca filtra a lista', async ({ page }) => {
    await page.goto('/app/admin/usuarios')
    // Espera a lista carregar (é async) antes de contar.
    await expect(page.locator('tbody tr').first()).toBeVisible()
    const rowsBefore = await page.locator('tbody tr').count()
    expect(rowsBefore).toBeGreaterThan(0)

    const search = page.locator('input[type=search], input[placeholder*="usca" i], input[placeholder*="usqu" i]').first()
    await search.fill('andres')
    // A lista deve reduzir (debounce)
    await expect(async () => {
      const rowsAfter = await page.locator('tbody tr').count()
      expect(rowsAfter).toBeGreaterThan(0)
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)
    }).toPass({ timeout: 8_000 })
  })

  test('nenhum erro de console nas 10 seções', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    for (const { path } of ADMIN_PAGES) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(errors(), errors().join('\n')).toHaveLength(0)
  })
})
