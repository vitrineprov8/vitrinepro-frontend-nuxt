# vitrinepro-frontend-v2 (HUNTRIA) — Guia para Claude

Frontend Nuxt 4 do produto de hunters. Backend: NestJS reutilizado em `../vitrinepro-bakend` (NÃO reescrever).

## Setup inicial (uma vez)
```bash
# 1. Ativar os agentes (a pasta .claude/agents não pôde ser criada pela sessão Cowork)
mkdir -p .claude/agents && cp claude-setup/agents/*.md .claude/agents/
# 2. Instalar e rodar
npm install
npm run dev   # http://localhost:4321 (backend em :3000)
```

## Documentos-fonte (ordem de autoridade)
1. `../design-spec/00_MASTER_DESIGN_SYSTEM.md` — design system (tokens já implementados em `app/assets/css/tokens.css`)
2. `../design-spec/01..06_*.md` — spec de TODAS as telas, modais, drawers e fluxos (IDs: T01, T-C0x, T-H0x, T-T0x, T-E0x, P/M/A/N)
3. `../REGRAS_DE_NEGOCIO_VITRINEPRO.md` — regras e endpoints do backend existente (RN-*)
4. `../PROPOSTA_NEGOCIO_HUNTER.md` — visão de negócio e prioridades
5. `PLANO_DESENVOLVIMENTO.md` — fases, checklist e gaps de backend

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
