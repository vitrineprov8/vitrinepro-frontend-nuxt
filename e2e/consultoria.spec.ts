import { test, expect, type Page } from '@playwright/test'
import { BACKEND_URL } from './fixtures/accounts'
import { authFile } from './fixtures/paths'
import { getToken, expectNoRenderLeaks } from './fixtures/util'

// Workspace Consultoria — RBAC pelos 3 papéis (Time de B15).
// Cada bloco usa o storageState do papel correspondente.

/** Abre o filtro "Todas as vagas" do Pipeline Geral e conta as opções. */
async function contarOpcoesFiltroVaga(page: Page): Promise<number> {
  await page.goto('/app/consultoria/pipeline')
  await page.waitForLoadState('networkidle')
  const trigger = page.getByRole('button', { name: /Todas as vagas/i }).first()
  await expect(trigger).toBeVisible()
  await trigger.click()
  const options = page.locator('.select__option, [role=option]')
  await expect(options.first()).toBeVisible()
  return options.count()
}

test.describe('Consultoria — OWNER', () => {
  test.use({ storageState: authFile('consultoria-owner') })

  test('dashboard com KPIs e 7 seções', async ({ page }) => {
    await page.goto('/app/consultoria')
    await expect(page).toHaveTitle(/Início — Consultoria/)
    const nav = page.locator('.shell__nav-item, .shell__nav a')
    for (const label of ['Início', 'Vagas do Time', 'Pipeline Geral', 'Clientes', 'Membros', 'Faturamento & Ganhos', 'Configurações']) {
      await expect(nav.filter({ hasText: new RegExp(`^${label}$`) }).first()).toBeVisible()
    }
    await expectNoRenderLeaks(page)
  })

  test('clientes: owner vê "Novo cliente"', async ({ page }) => {
    await page.goto('/app/consultoria/clientes')
    await expect(page.getByRole('button', { name: /Novo cliente/i })).toBeVisible()
  })

  test('membros: owner tem "Convidar" e selects de papel', async ({ page }) => {
    await page.goto('/app/consultoria/membros')
    await expect(page.getByRole('button', { name: /Convidar/i })).toBeVisible()
    // Só o owner troca papel — deve haver ao menos um select/trigger de papel numa linha
    await expect(page.locator('tbody select, tbody [class*="select"] button').first()).toBeVisible()
  })

  test('REGRESSÃO F21: filtro de pipeline por vaga tem >1 opção', async ({ page, context, request }) => {
    // A request que estava quebrada: /vagas/me?limit=100 deve responder 200 (antes 200 com limit=200 dava 400)
    const token = await getToken(context)
    const res = await request.get(`${BACKEND_URL}/vagas/me?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status()).toBe(200)

    const count = await contarOpcoesFiltroVaga(page)
    // "Todas as vagas" + ao menos 1 vaga real
    expect(count).toBeGreaterThan(1)
  })

  test('faturamento e config carregam', async ({ page }) => {
    await page.goto('/app/consultoria/faturamento')
    await expect(page.getByText(/A receber/)).toBeVisible()
    await page.goto('/app/consultoria/config')
    await expect(page.getByText(/Perfil da consultoria/)).toBeVisible()
    await expectNoRenderLeaks(page)
  })
})

test.describe('Consultoria — MANAGER', () => {
  test.use({ storageState: authFile('consultoria-manager') })

  test('membros: manager vê "Convidar" mas NÃO troca papel/remove', async ({ page }) => {
    await page.goto('/app/consultoria/membros')
    await expect(page.getByRole('button', { name: /Convidar/i })).toBeVisible()
    // RBAC: sem selects de papel nem "Remover" (só owner)
    await expect(page.locator('tbody select, tbody [class*="select"] button')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Remover$/ })).toHaveCount(0)
  })

  test('clientes: manager tem acesso de escrita ("Novo cliente")', async ({ page }) => {
    await page.goto('/app/consultoria/clientes')
    await expect(page.getByRole('button', { name: /Novo cliente/i })).toBeVisible()
  })
})

test.describe('Consultoria — RECRUITER', () => {
  test.use({ storageState: authFile('consultoria-recruiter') })

  test('clientes: recruiter é SÓ LEITURA (sem "Novo cliente" nem menu)', async ({ page }) => {
    await page.goto('/app/consultoria/clientes')
    await expect(page.locator('.shell__sidebar')).toBeVisible()
    await expect(page.getByRole('button', { name: /Novo cliente/i })).toHaveCount(0)
    // Sem menu de ações "⋯" (Editar/Atribuir/Excluir) nos cards
    await expect(page.locator('details.cliente-card__menu, .cliente__menu, summary').filter({ hasText: /⋯/ })).toHaveCount(0)
  })

  test('REGRESSÃO F21: recruiter também vê o filtro de pipeline com >1 opção', async ({ page }) => {
    const count = await contarOpcoesFiltroVaga(page)
    expect(count).toBeGreaterThan(1)
  })
})
