// Helpers de autenticação para os testes E2E.
//
// A app guarda o JWT num cookie `vp_token` (useApi.ts: path '/', sameSite 'lax').
// Em vez de dirigir o formulário de login em todo teste (lento e sujeito ao 2FA),
// logamos UMA vez por papel via API e salvamos o storageState — o mesmo padrão do
// `useCookie` que a app lê. O `auth.spec.ts` continua exercitando o formulário real.

import { type APIRequestContext, type BrowserContext, expect } from '@playwright/test'
import { type Account, BACKEND_URL, BASE_URL } from './accounts'

interface LoginResponse {
  access_token?: string
  twoFactorRequired?: boolean
  message?: string
}

/**
 * Loga via `POST /auth/login` e devolve o access_token.
 * Retenta em 429 (ThrottlerException) com backoff — o backend limita logins por IP,
 * e o `auth.setup` loga 7 contas em sequência.
 */
export async function loginViaApi(request: APIRequestContext, account: Account): Promise<string> {
  let lastMsg = ''
  // O throttle é 5/60s: em 429, esperar ~15s libera espaço na janela deslizante.
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: account.email, password: account.password },
      // não lançar em 4xx — queremos inspecionar o 429
      failOnStatusCode: false,
    })
    const body = (await res.json().catch(() => ({}))) as LoginResponse

    if (res.status() === 200 && body.access_token) return body.access_token

    if (res.status() === 429) {
      lastMsg = 'throttled (429)'
      await new Promise(r => setTimeout(r, 15_000))
      continue
    }
    if (body.twoFactorRequired) {
      throw new Error(`[auth] ${account.role}: conta exige 2FA — o E2E não cobre login com 2FA. Desative o 2FA nessa conta ou remova-a da suite.`)
    }
    lastMsg = `status ${res.status()} — ${body.message ?? 'sem mensagem'}`
    // 401/400 (credencial errada) não adianta retentar
    if (res.status() === 401 || res.status() === 400) break
    await new Promise(r => setTimeout(r, 1500))
  }
  throw new Error(`[auth] falha ao logar ${account.role} (${account.email}): ${lastMsg}`)
}

/** Injeta o cookie `vp_token` no contexto do browser, como se o usuário tivesse logado pela UI. */
export async function setAuthCookie(context: BrowserContext, token: string): Promise<void> {
  const { hostname } = new URL(BASE_URL)
  await context.addCookies([
    {
      name: 'vp_token',
      value: token,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
  ])
}

/** Usado pelos specs de workspace: garante que a página autenticada carregou o shell. */
export async function expectAppShell(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.shell__sidebar')).toBeVisible()
}

/**
 * Preenche e envia o formulário de login que já está na tela, tolerando o throttle
 * de 5/60s (o backend retorna 429 e a UI mostra "Muitas tentativas"). Em throttle,
 * espera ~15s e reenvia. Devolve o desfecho.
 *
 * O caller já deve estar numa página de login (ex.: `/login` ou `/login?redirect=...`).
 */
export async function formLoginSubmit(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<'success' | 'invalid'> {
  const throttleMsg = page.getByText(/Muitas tentativas/i)
  const invalidMsg = page.getByText(/e-mail ou senha incorretos/i)

  for (let attempt = 0; attempt < 6; attempt++) {
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[type=password]').fill(password)
    await page.locator('form button[type=submit]').click()

    const deadline = Date.now() + 12_000
    let outcome: 'success' | 'throttle' | 'invalid' | 'pending' = 'pending'
    while (Date.now() < deadline) {
      if (!page.url().includes('/login')) { outcome = 'success'; break }
      if (await throttleMsg.isVisible().catch(() => false)) { outcome = 'throttle'; break }
      if (await invalidMsg.isVisible().catch(() => false)) { outcome = 'invalid'; break }
      await page.waitForTimeout(300)
    }

    if (outcome === 'success') return 'success'
    if (outcome === 'invalid') return 'invalid'
    if (outcome === 'throttle') { await page.waitForTimeout(15_000); continue }
    // 'pending' — reenvia
  }
  throw new Error(`[auth] formLoginSubmit não resolveu para ${email} (provável throttle persistente)`)
}
