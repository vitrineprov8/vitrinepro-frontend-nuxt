import { test, expect } from '@playwright/test'
import { BACKEND_URL } from './fixtures/accounts'
import { getToken, expectNoRenderLeaks, collectConsoleErrors } from './fixtures/util'

// Workspace Empresa (andresempresa@getnada.com).

test.describe('Empresa', () => {
  test('dashboard com KPIs e mesa contextual', async ({ page }) => {
    await page.goto('/app/empresa')
    await expect(page).toHaveTitle(/Início — Empresa/)
    await expect(page.getByText('Vagas abertas')).toBeVisible()
    await expect(page.getByText('Minha mesa')).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('minhas vagas: abas e tabela', async ({ page }) => {
    await page.goto('/app/empresa/vagas')
    // Abas são UiTabs (role="tab"), com contador no rótulo → match por substring.
    for (const tab of ['Ativas', 'Rascunhos', 'Encerradas']) {
      await expect(page.getByRole('tab', { name: new RegExp(tab) })).toBeVisible()
    }
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('candidatos cross-vaga: filtros + exportar CSV', async ({ page }) => {
    await page.goto('/app/empresa/candidatos')
    await expect(page.getByRole('button', { name: /Exportar CSV/i }).or(page.getByRole('link', { name: /Exportar CSV/i })).first()).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('hunters: 3 abas', async ({ page }) => {
    await page.goto('/app/empresa/hunters')
    await expect(page.getByText(/Meus hunters/)).toBeVisible()
    await expect(page.getByText(/Encontrar hunters/)).toBeVisible()
    await expect(page.getByText(/Avaliações pendentes/)).toBeVisible()
  })

  test('faturas carrega', async ({ page }) => {
    await page.goto('/app/empresa/faturas')
    await expect(page.getByRole('heading', { name: /Faturas/ })).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('config: matriz de notificações (toggles)', async ({ page }) => {
    await page.goto('/app/empresa/config')
    await expect(page.locator('input[type=checkbox]').first()).toBeVisible()
    await expectNoRenderLeaks(page)
  })

  test('página da empresa: editar bio, salvar e restaurar', async ({ page }) => {
    await page.goto('/app/empresa/pagina')
    const bioField = page.getByPlaceholder(/sobre a empresa/i)
    await expect(bioField).toBeVisible()
    const original = await bioField.inputValue()

    const marker = ` [E2E ${Date.now()}]`
    await bioField.fill(original + marker)
    await page.getByRole('button', { name: /Salvar página/i }).click()
    await expect(page.getByText(/Salva|Salvo|atualizad/i).first()).toBeVisible()

    // Restaura o valor original
    await bioField.fill(original)
    await page.getByRole('button', { name: /Salvar página/i }).click()
    await expect(bioField).toHaveValue(original)
  })

  test('pipeline: mover candidato de etapa (ida e volta)', async ({ page, request, context }) => {
    const token = await getToken(context)
    const res = await request.get(`${BACKEND_URL}/applications/me-as-owner?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    const item = (data.data ?? [])[0]
    test.skip(!item, 'nenhuma candidatura no pipeline da empresa de teste')

    await page.goto(`/app/empresa/vagas/${item.vagaId}`)
    await expect(page.locator('.kanban')).toBeVisible()

    const firstCard = page.locator('.kcard').first()
    await expect(firstCard).toBeVisible()

    // Estágio atual e colunas
    const colTitle = (i: number) => page.locator('.kanban__col').nth(i).locator('.kanban__col-title')
    const colCount = (name: string) =>
      page.locator('.kanban__col', { has: page.locator('.kanban__col-title', { hasText: new RegExp(`^${name}$`) }) })
        .locator('.kanban__count')

    await firstCard.click()
    const drawer = page.locator('.drawer')
    await expect(drawer).toBeVisible()
    const etapaText = await drawer.getByText(/Etapa:/).textContent()
    const current = (etapaText ?? '').replace(/Etapa:\s*/, '').trim()

    // Escolhe uma etapa de destino diferente da atual (a 1ª que difere)
    const allTitles = await page.locator('.kanban__col-title').allTextContents()
    const target = allTitles.map(t => t.trim()).find(t => t && t !== current && t !== 'Rejeitados')
    expect(target, 'nenhuma etapa de destino disponível').toBeTruthy()

    const targetBefore = Number((await colCount(target!).textContent())?.trim() || '0')
    const currentBefore = Number((await colCount(current).textContent())?.trim() || '0')

    // Move: abre o UiSelect (trigger = texto da etapa atual), escolhe o destino, confirma.
    await drawer.getByRole('button', { name: new RegExp(`^${current}$`) }).click()
    await page.locator('.select__option', { hasText: new RegExp(`^${target}$`) }).click()
    await drawer.getByRole('button', { name: /^Mover$/ }).click()

    await expect(colCount(target!)).toHaveText(String(targetBefore + 1), { timeout: 10_000 })

    // Fecha o drawer antes de reabrir outro (o overlay intercepta cliques).
    await drawer.locator('.drawer__close').click()
    await expect(page.locator('.drawer-overlay')).toHaveCount(0)

    // ---- Restaura: move de volta pro estágio original ----
    await page.locator('.kanban__col', { has: page.locator('.kanban__col-title', { hasText: new RegExp(`^${target}$`) }) })
      .locator('.kcard').first().click()
    const drawer2 = page.locator('.drawer')
    await expect(drawer2).toBeVisible()
    await drawer2.getByRole('button', { name: new RegExp(`^${target}$`) }).click()
    await page.locator('.select__option', { hasText: new RegExp(`^${current}$`) }).click()
    await drawer2.getByRole('button', { name: /^Mover$/ }).click()

    // Voltou ao estado original: coluna de origem com a contagem inicial de novo.
    await expect(colCount(current)).toHaveText(String(currentBefore), { timeout: 10_000 })
    await drawer2.locator('.drawer__close').click()
    void colTitle
  })

  test('nenhum erro de console ao percorrer o workspace', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    for (const path of ['/app/empresa', '/app/empresa/vagas', '/app/empresa/candidatos', '/app/empresa/hunters', '/app/empresa/faturas', '/app/empresa/pagina', '/app/empresa/config']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(errors(), errors().join('\n')).toHaveLength(0)
  })
})
