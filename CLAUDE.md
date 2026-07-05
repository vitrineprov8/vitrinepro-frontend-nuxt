# vitrinepro-frontend-v2 (HUNTRIA) — Guia para Claude

Frontend Nuxt 4 do produto de hunters. Backend: NestJS reutilizado em `../vitrinepro-bakend` (NÃO reescrever).

> ⚠️ **REGRA — documento vivo:** ler este arquivo antes de trabalhar e **atualizá-lo no mesmo commit** ao mudar estrutura, rotas, composables de API ou convenções. Contratos de API e endpoints do backend estão em `../vitrinepro-bakend/CLAUDE.md` (também documento vivo).

## Stack técnico
- **Nuxt 4.4** (Vue 3.5, `<script setup lang="ts">`, TS estrito) — dev na porta **4321**; backend NestJS na **3000**.
- **Estado:** Pinia 3 (`@pinia/nuxt`) em `app/stores/`. **Utils:** VueUse 13. **Ícones:** `lucide-vue-next`.
- **Estilo:** CSS scoped + tokens `var(--*)` de `app/assets/css/tokens.css`. **Sem Tailwind, sem lib de UI** — UI kit próprio em `app/components/ui/`.
- **HTTP:** só via `useApi()` (JWT + erros padronizados). Nunca `$fetch`/`axios` direto.
- **Renderização:** rotas públicas = SSR + SEO; `/app/**` = client-only com middleware `auth`.
- **Lint/typecheck:** ESLint 9 (`@nuxt/eslint`) + `vue-tsc`. Idioma da UI: **PT-BR**.
- **Estrutura:** `app/pages` (rotas) · `app/components` (+ `ui/`) · `app/composables` · `app/stores` · `app/layouts` (marketing/auth/app) · `app/middleware` · `app/types`.

## Setup inicial (uma vez)
```bash
# 1. Ativar os agentes (.claude/agents/ ainda não foi populado neste checkout)
mkdir -p .claude/agents && cp claude-setup/agents/*.md .claude/agents/
# 2. Instalar e rodar
npm install
npm run dev   # http://localhost:4321 (backend em :3000)
```

## Documentos-fonte (ordem de autoridade)
1. `../design-spec/00_MASTER_DESIGN_SYSTEM.md` — design system (tokens já implementados em `app/assets/css/tokens.css`)
2. `../design-spec/01..06_*.md` — spec de TODAS as telas, modais, drawers e fluxos (IDs: T01, T-C0x, T-H0x, T-T0x, T-E0x, P/M/A/N)
3. `PLANO_DESENVOLVIMENTO.md` — fases, checklist e **regras de negócio RN-\* + gaps de backend (B1..B16)**. É a fonte viva de regras: os arquivos `REGRAS_DE_NEGOCIO_VITRINEPRO.md` e `PROPOSTA_NEGOCIO_HUNTER.md` NÃO existem mais; suas regras foram consolidadas aqui (§BACKEND) e no código do NestJS.
4. `../plano-negocio-vitrinepro.html` — visão de negócio/marketing (contexto, não regras técnicas)
5. Verdade final de contratos de API: o código em `../vitrinepro-bakend/src/**` (cada módulo = controller + service + entities)

## Agentes (usar proativamente)
- `sprint-planner` — início de sessão: o que fazer agora, dependências de backend
- `nuxt-screen-builder` — implementar telas a partir das specs
- `api-integrator` — composables/tipos da API, divergências com o NestJS
- `design-system-guardian` — revisão visual/tokens antes de concluir
- `qa-reviewer` — revisão funcional/acessibilidade depois de concluir

## Convenções (resumo — detalhes nos agentes)
- TS estrito, `<script setup lang="ts">`, CSS scoped com tokens `var(--*)`, sem Tailwind, PT-BR.
- HTTP só via `useApi()`; estado global em Pinia (`app/stores/`); toasts via `useToast()`.
- Público = SSR + SEO; `/app/**` = client-only com middleware `auth`.
- Padrão de qualidade de referência: `app/pages/login.vue` e `app/components/ui/*`.
- Nunca permitir publicar vaga via PATCH; nunca esconder recurso bloqueado por plano (mostrar cadeado + Modal Upgrade).

## Comandos
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`

## Validação E2E (navegador) — evita re-derivar
Gotchas de ambiente e o runbook completo estão em `../vitrinepro-bakend/CLAUDE.md` §Ambiente. Resumo:
- Validação é no Chrome contra os servers locais do Andres. **Claude não digita senha/cria conta** — o Andres faz login/cadastro; JWT em cookie sobrevive a restart. Contas de teste: `../qa-test-accounts.json`.
- `nuxt typecheck`/`dev` **não rodam no sandbox** (node_modules do Windows). Rodar na máquina do Andres.
- **T-H08 validado E2E** (pool → consentimento → publicar vaga → submeter 3 passos → 201; reenvio → 409). Consentimento sem caixa de e-mail: token dev sai no console ou concede-se via `javascript_tool` no `POST /public/candidate-consent/:token`.
- Padrão p/ menus/dropdowns em tabelas com `overflow`: **teleportar p/ body com posição fixa** (ver `pages/app/hunter/candidatos.vue`) — senão o container clipa. Ao abrir modal a partir de um drawer, fechar o drawer (senão sobrepõem por z-index).
- Página pública de consentimento (B14): `pages/consentimento/[token].vue` (`layout:false`).
- Páginas públicas de token (B2/B7), mesmo padrão `layout:false`: `pages/redefinir-senha/[token].vue` e `pages/convite/[token].vue`. `T14`/`T15` (`recuperar-senha.vue`/`redefinir-senha/[token].vue`) já usam o backend real — o mock `import.meta.dev` foi removido de `stores/auth.ts`.
- Página pública de empresa (B6): `pages/empresa/[slug].vue` (layout padrão/marketing, com nav — diferente das páginas de token acima). Backend: `GET /empresas/:slug`. Tipo `CompanyVagaSummary` em `types/vaga.ts` (projeção enxuta de vaga, não confundir com `Vaga` completo — `VagaCard.vue` espera `Vaga` completo e não deve ser reusado aqui).
- **Persona/role (B1)**: `stores/auth.ts` tem `User.personas: Persona[] | null` (`'CANDIDATO'|'HUNTER'|'EMPRESA'`), `register(payload.persona?)` envia a persona escolhida no `/cadastro` (fluxo por e-mail) e `activatePersona(persona)` chama `PATCH /profile/me/personas` (idempotente no backend, erros engolidos — não bloqueia login). `pages/cadastro.vue` manda `persona: 'HUNTER'|'CANDIDATO'|undefined` no `auth.register(...)` em vez de só salvar em `localStorage`. `pages/auth/callback.vue` (fluxo OAuth) chama `auth.activatePersona(...)` **depois** do `loginWithToken` — só dá pra persistir a persona quando a conta OAuth já existe, então o `localStorage.getItem('vp_persona_choice')` continua guardando a escolha entre o clique em "Continuar com Google/LinkedIn" e a volta do callback. `localStorage.vp_last_workspace` continua só para navegação (qual workspace abrir), não é mais a fonte de verdade da persona — isso agora é `User.personas` no backend.
- **Chrome MCP bloqueia navegação para caixas de e-mail temporárias** (`inboxes.com`, `getnada.com` deram "Navigation to this domain is not allowed"). Para ver o e-mail renderizado (reset de senha, convite de time) o Andres precisa checar a caixa manualmente.
- **B2 validado E2E completo (2026-07-05):** `forgot-password` disparado de verdade pela UI para `testeia@getnada.com` → e-mail real recebido → Andres redefiniu a senha pelo link → confirmado. Nova senha em `../qa-test-accounts.json`.
- **B7 ainda falta validar ponta a ponta**: `/convite/[token]` renderiza certo pro estado de link inválido contra o backend real, mas falta testar um convite de verdade (precisa de conta plano TEAM/ENTERPRISE — não existe ainda em `qa-test-accounts.json`).
- **B6 validado E2E completo (2026-07-06)**: conta `isCompany` real (`andresempresa@getnada.com`, ver `qa-test-accounts.json`) confirmou `/empresa/andreshernandez9975` com dados reais e estado vazio de vagas; `/empresa/slug-inexistente` confirma o 404 real. Falta só ver a listagem `vagasAbertas` com uma vaga publicada de verdade.
- **B1 validado E2E completo (2026-07-06)**: `PATCH /profile/me/personas` testado via `javascript_tool` contra o backend real (`testeia@getnada.com`) — ativar HUNTER, idempotência, acumular CANDIDATO, e os dois 403 (persona EMPRESA; conta empresa tentando ativar outra persona). `/cadastro?perfil=hunter` recarregada no Chrome após os ajustes em `auth.ts`/`cadastro.vue` — sem erros de console. **Não testado**: cadastro por e-mail completo criando uma conta nova de verdade (exigiria digitar senha num formulário — fora da política) nem o fluxo OAuth completo do `auth/callback.vue`; a lógica de `register()`/`activatePersona()` foi conferida por revisão de código + `tsc` limpo.
