// Setup de autenticação: loga cada papel via API e salva o storageState.
// Roda uma vez antes dos projetos de workspace (dependency no playwright.config.ts).
//
// ⚠️ O backend limita /auth/login a **5 por 60s por IP** (AUTH_THROTTLE). Como há 7
// papéis, os logins são ESPAÇADOS (~13s) pra nunca passar de 5 na janela de 60s.
// O loginViaApi ainda tem retry-em-429 como rede de segurança. Um storageState
// gravado há < 20 min é reutilizado, deixando as re-execuções rápidas.

import fs from 'node:fs'
import { test as setup, request as playwrightRequest } from '@playwright/test'
import { ACCOUNTS, type Role } from './fixtures/accounts'
import { loginViaApi, setAuthCookie } from './fixtures/auth'
import { authFile } from './fixtures/paths'

const ROLES: Role[] = [
  'hunter',
  'empresa',
  'admin',
  'consultoria-owner',
  'consultoria-manager',
  'consultoria-recruiter',
  'candidato',
]

// Espaçamento entre logins pra respeitar o throttle de 5/60s.
const SPACING_MS = 13_000
// Reusa storageState gravado nos últimos 20 min.
const FRESH_MS = 20 * 60_000

function isFresh(role: Role): boolean {
  try {
    const stat = fs.statSync(authFile(role))
    return Date.now() - stat.mtimeMs < FRESH_MS
  }
  catch {
    return false
  }
}

setup('autenticar todos os papéis', async ({ browser }) => {
  setup.setTimeout(200_000)
  const api = await playwrightRequest.newContext()
  try {
    let loggedInThisRun = 0
    for (const role of ROLES) {
      if (isFresh(role)) continue

      // Espaça só entre logins reais (não conta os reusados).
      if (loggedInThisRun > 0) await new Promise(r => setTimeout(r, SPACING_MS))

      const token = await loginViaApi(api, ACCOUNTS[role])
      const context = await browser.newContext()
      await setAuthCookie(context, token)
      await context.storageState({ path: authFile(role) })
      await context.close()
      loggedInThisRun++
    }
  }
  finally {
    await api.dispose()
  }
})
