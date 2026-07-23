import { test, expect } from '@playwright/test'
import { BACKEND_URL } from './fixtures/accounts'

// Páginas públicas de marketing + rotas dinâmicas + 404s. Sem autenticação.

const MARKETING_PAGES: { path: string, heading: RegExp }[] = [
  { path: '/', heading: /Recrute\.\s*Indique\.\s*Receba\./i },
  { path: '/vagas', heading: /vagas/i },
  { path: '/hunters', heading: /hunters/i },
  { path: '/precos', heading: /planos|preços/i },
  { path: '/sobre', heading: /Conectamos|fazer parte/i },
  { path: '/para-empresas', heading: /empresa|contrat|hunter/i },
  { path: '/para-candidatos', heading: /perfil profissional|Encontre vagas|deslize/i },
  { path: '/guias', heading: /guia/i },
  { path: '/contato', heading: /contato|fale/i },
  { path: '/ajuda', heading: /ajuda|central/i },
  { path: '/privacidade', heading: /privacidade/i },
  { path: '/termos', heading: /termos/i },
  { path: '/cookies', heading: /cookies/i },
]

test.describe('Páginas públicas de marketing', () => {
  for (const { path, heading } of MARKETING_PAGES) {
    test(`carrega ${path} sem erro`, async ({ page }) => {
      const resp = await page.goto(path)
      expect(resp?.status(), `HTTP de ${path}`).toBeLessThan(400)
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
      // Sem vazamento de placeholders/erros no corpo
      await expect(page.locator('body')).not.toContainText('[object Object]')
      await expect(page.locator('body')).not.toContainText('undefinedundefined')
    })
  }

  test('header desktop tem os 6 links de navegação', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('.mkt__nav')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(6)
    for (const label of ['Para Empresas', 'Para Candidatos', 'Vagas', 'Hunters', 'Preços', 'Guias']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible()
    }
  })

  test('página inicial não tem erros de hidratação no console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const hydration = errors.filter(e => /hydration|mismatch/i.test(e))
    expect(hydration, `erros de hidratação: ${hydration.join(' | ')}`).toHaveLength(0)
  })
})

test.describe('Rotas dinâmicas', () => {
  test('página de vaga carrega com slug real', async ({ page, request }) => {
    const res = await request.get(`${BACKEND_URL}/vagas?limit=1`)
    const data = await res.json()
    const items = data.data ?? data.items ?? data
    const slug = items[0]?.slug
    expect(slug, 'nenhuma vaga no backend de teste').toBeTruthy()

    const resp = await page.goto(`/vaga/${slug}`)
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('vaga inexistente devolve 404', async ({ page }) => {
    const resp = await page.goto('/vaga/nao-existe-xyz-999')
    expect(resp?.status()).toBe(404)
  })

  test('hunter inexistente devolve 404', async ({ page }) => {
    const resp = await page.goto('/hunter/nao-existe-xyz-999')
    expect(resp?.status()).toBe(404)
  })

  test('empresa inexistente devolve 404', async ({ page }) => {
    const resp = await page.goto('/empresa/nao-existe-xyz-999')
    expect(resp?.status()).toBe(404)
  })
})

test.describe('Selo de fee (regressão F20)', () => {
  test('cards de vaga nunca mostram "R$ 0" como fee', async ({ page }) => {
    await page.goto('/vagas')
    await page.waitForLoadState('networkidle')
    // O badge de fee é um .badge dentro do head do card. Nenhum deve ser "R$ 0".
    const zeroFeeBadges = page.locator('.vaga-card__head .badge', { hasText: /^R\$\s*0$/ })
    await expect(zeroFeeBadges).toHaveCount(0)
  })
})
