import { type BrowserContext, type Page, expect } from '@playwright/test'

/** Lê o valor do cookie `vp_token` (o backend autentica por Bearer, não por cookie). */
export async function getToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies()
  const t = cookies.find(c => c.name === 'vp_token')?.value
  if (!t) throw new Error('vp_token não encontrado no contexto — storageState não carregou?')
  return t
}

/** Coleta erros de console durante a navegação; devolve um getter. Filtra ruído conhecido. */
export function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const t = msg.text()
    // Ruído irrelevante de dev/rede que não indica bug de produto.
    if (/favicon|ERR_|net::|Failed to load resource/i.test(t)) return
    errors.push(t)
  })
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
  return () => errors
}

/** Afirma que o corpo não vaza placeholders/erros de renderização. */
export async function expectNoRenderLeaks(page: Page): Promise<void> {
  const body = page.locator('body')
  await expect(body).not.toContainText('[object Object]')
  await expect(body).not.toContainText('undefinedundefined')
  await expect(body).not.toContainText('NaNNaN')
}
