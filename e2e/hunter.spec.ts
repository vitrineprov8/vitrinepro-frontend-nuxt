import { test, expect } from '@playwright/test'
import { expectNoRenderLeaks, collectConsoleErrors } from './fixtures/util'

// Workspace Hunter (testeia@getnada.com). storageState via playwright.config.ts.

test.describe('Hunter', () => {
  test('dashboard "Minha mesa" com KPIs e mesa contextual', async ({ page }) => {
    await page.goto('/app/hunter')
    await expect(page).toHaveTitle(/Início — Hunter/)
    await expect(page.locator('.shell__sidebar')).toBeVisible()
    // KPIs reais (não os hardcoded do bug F20)
    await expect(page.locator('.kpi__label', { hasText: 'Ganhos no mês' })).toBeVisible()
    await expect(page.locator('.kpi__label', { hasText: 'Placements em andamento' })).toBeVisible()
    // "Minha mesa" é contextual: esta conta tem vagas → NÃO deve pedir "primeira vaga"
    await expect(page.getByText('Minha mesa')).toBeVisible()
    await expect(page.locator('.mesa__item').first()).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('sidebar tem as 6 seções', async ({ page }) => {
    await page.goto('/app/hunter')
    const nav = page.locator('.shell__nav-item, .shell__nav a')
    for (const label of ['Início', 'Minhas Vagas', 'Marketplace', 'Meus Candidatos', 'Ganhos', 'Meu Perfil']) {
      await expect(nav.filter({ hasText: new RegExp(`^${label}$`) }).first()).toBeVisible()
    }
  })

  test('marketplace lista vagas com fee correto (sem "R$ 0")', async ({ page }) => {
    await page.goto('/app/hunter/marketplace')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.vaga-card__head').first()).toBeVisible()
    // Regressão F20: nenhum badge de fee "R$ 0"
    await expect(page.locator('.vaga-card__head .badge', { hasText: /^R\$\s*0$/ })).toHaveCount(0)
    // Deve existir pelo menos um badge de % fee
    await expect(page.locator('.badge', { hasText: /% fee/ }).first()).toBeVisible()
  })

  test('meus candidatos: botão adicionar + pool ou vazio', async ({ page }) => {
    await page.goto('/app/hunter/candidatos')
    await expect(page.getByRole('button', { name: /Adicionar candidato/i })).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('ganhos: KPIs e abas Placements/Extrato', async ({ page }) => {
    await page.goto('/app/hunter/ganhos')
    await expect(page.getByText('A receber')).toBeVisible()
    // As abas são UiTabs → role="tab"
    await expect(page.getByRole('tab', { name: 'Placements' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Extrato' })).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('meu perfil carrega dados reais + seção de verificação', async ({ page }) => {
    await page.goto('/app/hunter/perfil')
    await expect(page.getByText(/Verificação|Verificado/).first()).toBeVisible()
    await expect(page.locator('input, textarea').first()).toBeVisible()
  })

  test('minhas vagas: botão nova vaga', async ({ page }) => {
    await page.goto('/app/hunter/vagas')
    await expect(page.getByRole('link', { name: /Nova vaga/i }).or(page.getByRole('button', { name: /Nova vaga/i })).first()).toBeVisible()
  })

  test('nenhum erro de console ao percorrer o workspace', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    for (const path of ['/app/hunter', '/app/hunter/marketplace', '/app/hunter/candidatos', '/app/hunter/ganhos', '/app/hunter/perfil', '/app/hunter/vagas']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(errors(), errors().join('\n')).toHaveLength(0)
  })
})
