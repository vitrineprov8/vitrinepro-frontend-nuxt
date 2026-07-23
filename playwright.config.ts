import { defineConfig, devices } from '@playwright/test'
import { BASE_URL } from './e2e/fixtures/accounts'

// E2E da vitrinepro-frontend-v2. Exige backend em :3000 e front em :4321.
// O `webServer` sobe o dev server se ele ainda não estiver rodando (reuseExistingServer).
// O BACKEND precisa estar de pé por fora (npm run start:dev em ../vitrinepro-bakend).

export default defineConfig({
  testDir: './e2e',
  // Sequencial: os testes compartilham as mesmas contas/dados no DB de teste.
  // Um teste que muda estado (ex.: mover candidato de etapa) restaura no final,
  // mas rodar em paralelo com a mesma conta geraria corrida.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // 1 retry local absorve flakiness transitória (throttle de login 5/60s, corridas
  // dependentes de estado no DB de teste). Não mascara falha real: um bug determinístico
  // falha nas 2 tentativas. 2 no CI.
  retries: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Loga cada papel e salva storageState.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // Público/auth: sem sessão (o auth.spec dirige o login de verdade).
    {
      name: 'public',
      testMatch: /(public|auth)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Um projeto por papel — cada um usa seu storageState.
    {
      name: 'hunter',
      testMatch: /hunter\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: './e2e/.auth/hunter.json' },
    },
    {
      name: 'empresa',
      testMatch: /empresa\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: './e2e/.auth/empresa.json' },
    },
    {
      name: 'candidato',
      testMatch: /candidato\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: './e2e/.auth/candidato.json' },
    },
    {
      name: 'admin',
      testMatch: /admin\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: './e2e/.auth/admin.json' },
    },
    // Consultoria roda os 3 papéis; cada teste escolhe o storageState via `test.use`.
    {
      name: 'consultoria',
      testMatch: /consultoria\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
