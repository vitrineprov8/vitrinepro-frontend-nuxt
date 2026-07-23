import { test, expect } from '@playwright/test'
import { expectNoRenderLeaks, collectConsoleErrors } from './fixtures/util'

// Workspace Candidato (consenttest...@getnada.com).

test.describe('Candidato', () => {
  test('dashboard: completude + vagas para você (sem "R$ 0")', async ({ page }) => {
    await page.goto('/app/candidato')
    await expect(page).toHaveTitle(/Início — Candidato/)
    await expect(page.getByText(/Complete seu perfil/)).toBeVisible()
    // Regressão F20: cards de vaga não mostram fee "R$ 0"
    await expect(page.locator('.vaga-card__head .badge', { hasText: /^R\$\s*0$/ })).toHaveCount(0)
    await expectNoRenderLeaks(page)
  })

  test('sidebar tem as 5 seções', async ({ page }) => {
    await page.goto('/app/candidato')
    const nav = page.locator('.shell__nav-item, .shell__nav a')
    for (const label of ['Início', 'Radar de Vagas', 'Minhas Candidaturas', 'Vagas Salvas', 'Meu Perfil']) {
      await expect(nav.filter({ hasText: new RegExp(`^${label}$`) }).first()).toBeVisible()
    }
  })

  test('radar: grid de vagas (desktop) com contador', async ({ page }) => {
    await page.goto('/app/candidato/radar')
    await expect(page.getByText(/vagas? encontrad/i)).toBeVisible()
    // No desktop o radar mostra `.radar__desktop` (grid de VagaCard); `.radar__mobile`
    // (deck de swipe) é display:none. Afirmamos um card no grid desktop.
    await expect(page.locator('.radar__desktop .vaga-card__head').first()).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('minhas candidaturas: tabela ou estado vazio', async ({ page }) => {
    await page.goto('/app/candidato/candidaturas')
    await expect(page.getByRole('heading', { name: /Minhas Candidaturas/ })).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('vagas salvas: abas Ativas/Encerradas', async ({ page }) => {
    await page.goto('/app/candidato/salvas')
    await expect(page.getByText(/Ativas/)).toBeVisible()
    await expect(page.getByText(/Encerradas/)).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('perfil: subnav Dados/Portfólio/Currículos/Formação', async ({ page }) => {
    await page.goto('/app/candidato/perfil')
    for (const label of ['Dados', 'Portfólio', 'Currículos', 'Formação']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}$`) }).first()).toBeVisible()
    }
  })

  test('subpáginas de perfil carregam', async ({ page }) => {
    for (const path of ['/app/candidato/portfolio', '/app/candidato/curriculos', '/app/candidato/formacao']) {
      await page.goto(path)
      await expect(page.locator('.shell__sidebar')).toBeVisible()
      await expectNoRenderLeaks(page)
    }
  })

  test('nenhum erro de console ao percorrer o workspace', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    for (const path of ['/app/candidato', '/app/candidato/radar', '/app/candidato/candidaturas', '/app/candidato/salvas', '/app/candidato/perfil']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(errors(), errors().join('\n')).toHaveLength(0)
  })
})
