# Suite E2E — vitrinepro-frontend-v2

Testes ponta a ponta com **Playwright**, cobrindo todos os fluxos por tipo de usuário
contra os servidores locais + o backend NestJS real.

**72 testes** (7 papéis + público/auth), rodam em ~2–3 min.

## Pré-requisitos

1. **Backend de pé** em `:3000`:
   ```bash
   cd ../vitrinepro-bakend && npm run start:dev
   ```
2. **Frontend** em `:4321` — o Playwright sobe o `npm run dev` sozinho se ainda não
   estiver rodando (`reuseExistingServer`). Se já estiver, ele reaproveita.
3. As **contas de teste** de `../../qa-test-accounts.json` precisam existir no banco
   de teste (Neon). Espelhadas em `e2e/fixtures/accounts.ts` — se uma senha mudar,
   atualizar nos dois lugares.

## Rodar

```bash
npm run test:e2e            # tudo, headless
npm run test:e2e:headed     # com navegador visível
npm run test:e2e:ui         # modo UI interativo do Playwright
npm run test:e2e:report     # abre o último relatório HTML

# Um papel/arquivo só:
npx playwright test --project=empresa
npx playwright test e2e/consultoria.spec.ts
npx playwright test -g "mover candidato"
```

## Como está organizada

| Projeto | Arquivo | Cobre |
|---|---|---|
| `setup` | `auth.setup.ts` | Loga cada papel via API, salva `e2e/.auth/<papel>.json` |
| `public` | `public.spec.ts`, `auth.spec.ts` | Marketing, rotas dinâmicas, 404, login, guard, redirect |
| `hunter` | `hunter.spec.ts` | Dashboard, marketplace, candidatos, ganhos, perfil, vagas |
| `empresa` | `empresa.spec.ts` | Vagas, **pipeline (mover candidato de etapa, ida e volta)**, candidatos, hunters, faturas, **editar+salvar página**, config |
| `candidato` | `candidato.spec.ts` | Dashboard, radar, candidaturas, salvas, perfil + subpáginas |
| `admin` | `admin.spec.ts` | As 10 seções + busca de usuários |
| `consultoria` | `consultoria.spec.ts` | **RBAC pelos 3 papéis** (owner/manager/recruiter) + regressão do filtro de pipeline |

### Autenticação
O backend usa **Bearer JWT** guardado no cookie `vp_token`. Em vez de dirigir o
formulário de login em todo teste, o projeto `setup` loga cada papel **uma vez via
API** e salva o `storageState` (o mesmo cookie que a app lê). O `auth.spec.ts` é a
exceção: ele dirige o formulário real de propósito.

O login tem **throttle de 5/60s por IP** no backend. Por isso:
- `auth.setup.ts` **espaça** os logins (~13s) e reaproveita um `storageState` gravado
  há menos de 20 min (re-execuções ficam rápidas);
- `loginViaApi` e `formLoginSubmit` **retentam em 429** com espera.

### Regressões cobertas (bugs achados nas rodadas F20/F21)
- **Selo de fee "R$ 0"** — `public.spec` e `hunter/candidato` afirmam que nenhum card
  mostra `R$ 0` como fee.
- **Hidratação SSR** — `public.spec` falha se a home logar `Hydration mismatch`.
- **Filtro de pipeline da consultoria** — `consultoria.spec` afirma que o dropdown de
  vaga tem >1 opção (o bug deixava sempre só "Todas as vagas") e que `/vagas/me?limit=100`
  responde 200.

## Notas
- **Sequencial** (`workers: 1`): os testes compartilham as contas/dados do DB de teste.
  Testes que mudam estado (mover candidato de etapa, editar a página da empresa)
  **restauram** o valor original no fim.
- **1 retry local** (2 no CI): absorve flakiness transitória de throttle/timing sem
  mascarar bug determinístico.
- `e2e/.auth/` e `test-results/`/`playwright-report/` são gitignored.
- Ambiente: usa o Chromium do cache compartilhado do monorepo (mesma versão do v1).
