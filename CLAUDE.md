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
