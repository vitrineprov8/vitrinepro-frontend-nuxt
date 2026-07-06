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
- **Validação é sempre no Chrome contra os servers locais do Andres** — regra permanente, nunca marcar `[x]` no plano só por leitura de código. Banco de dev é de teste (sem dados reais) — Claude pode criar/usar/apagar dados de teste livremente (contas via fetch programático, vagas, portfólio etc.), limpando o descartável e registrando em `../qa-test-accounts.json` o que tiver valor de reuso. Detalhe completo e a nota de transparência sobre criação de conta: `../vitrinepro-bakend/CLAUDE.md` §Ambiente. JWT em cookie sobrevive a restart.
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
- **Marketplace/fee (B4)**: `types/vaga.ts` — `Vaga` ganhou `feePercent`/`feeAmount`/`maxHunters`/`exclusivityDays`/`hunterContactPhone`; novos tipos `HunterInterestVaga`/`HunterInterest`. `VagaEditor.vue` tem os 4 campos de fee/cap/exclusividade (com computeds string-proxy `feePercentStr`/`maxHuntersStr`/`exclusivityDaysStr` — **`UiInput` não aceita `v-model.number`** porque seu `modelValue` é tipado `string`, então o modificador `.number` do Vue não converte; usar um `get/set` computed entre string↔number em vez disso) e validação client-side (fee obrigatório se `allowHunters`). `pages/vaga/[slug].vue` tem o drawer de termos ("Quero esta vaga" → aceitar termos → `POST /vagas/:id/hunter-interest`) com status (ACCEPTED/PENDING/REJECTED). Nova página `pages/app/hunter/marketplace.vue` (T-H07, nav em `useHunterWorkspace.ts`) lista `GET /vagas/radar?allowHunters=true` com filtros q/segmento/feeMin/order; **nota de tipo**: `order` é `ref<string|null>` (não `ref<'fee'|'recent'>`) porque `UiSelect.modelValue` é `string|null` — cast só no ponto de uso da API. `VagaCard.vue` mostra pill de fee (`feeLabel`). `CandidateDrawer.vue` mostra badge "Indicado por hunter" e mascara e-mail/telefone (`contactMasked`) com placeholder quando a candidatura é `source==='HUNTER'` e ainda não chegou na etapa configurada.
- **B4 validado E2E completo (2026-07-06)**: fluxo completo navegado no Chrome contra os servers reais — editor de vaga com fee/cap/exclusividade, marketplace `/app/hunter/marketplace`, drawer de termos em `/vaga/[slug]`, e `CandidateDrawer` com badge+masking no pipeline. Vaga de teste `desenvolvedora-full-stack-pleno` (conta `testeia@getnada.com`) restaurada ao estado original após os testes. Confirmado visualmente: erro de "fee obrigatório" chega como toast legível; pill de fee aparece no card/marketplace; checkbox de termos bloqueia o envio até marcado; mascaramento de contato muda exatamente no limiar de etapa esperado (3ª coluna). **Dívida**: cap de `maxHunters` (409 ao exceder) não testado ponta a ponta por UI real — só via proxy de validação (`maxHunters=0` rejeitado); precisaria de uma 2ª conta hunter para gerar o cenário genuíno.
- **Perfil/diretório de hunter (B5)**: novo `types/hunter.ts` (`HunterVerificationStatus`, `HunterMetrics`, `HunterDirectoryResponse` — atenção: shape `{items,total,page,limit}`, **não** o `PaginatedResult` comum usado em outras listagens — `HunterDirectoryCard`, `HunterPublicProfile`, `VerificationDocument`, `HunterVerificationRequest`, `VERIFICATION_STATUS_LABEL`/`VERIFICATION_STATUS_VARIANT`). `stores/auth.ts` → `User` ganhou `hunterSpecialties`/`hunterYearsExperience`/`verificationStatus`/`verificationRejectionReason`/`verificationDocs`/`verificationLinkedinUrl`. Páginas: `pages/hunters.vue` (T07, diretório público, filtros specialty/city/verifiedOnly/order), `pages/hunter/[username].vue` (T08, perfil público com grid de métricas).
- **Verificação de hunter (B8)**: `pages/app/hunter/perfil.vue` (T-H11) — self-edit dos campos públicos (`PATCH /profile`) + painel de verificação (upload de PDF via `POST /profile/me/verification/documents` com `FormData`, depois `POST /profile/me/verification/submit`). **Gotcha de reatividade corrigido**: `auth.user` só é populado pelo `fetchMe()` assíncrono do `onMounted` do layout pai (`app.vue`) — inicializar os refs locais diretamente de `auth.user?.campo` no setup captura valores vazios/stale em qualquer navegação fresca (e um "Salvar perfil" sem re-digitar tudo apagaria os dados reais). Padrão usado: refs começam vazios, um `watch(() => auth.user, cb, {immediate:true})` guardado por uma flag (`profileInitialized`) popula os campos uma única vez quando `auth.user` chega, sem nunca sobrescrever edições em andamento depois. Atenção à ordem de declaração: um ref referenciado dentro do callback `immediate` precisa estar declarado **antes** do `watch` (senão erro "used before declaration"). Gates de marketplace: `pages/app/hunter/marketplace.vue` (overlay + CTA quando não verificado), `pages/app/hunter/candidatos.vue` (banner âmbar), `pages/vaga/[slug].vue` (`toast.warning` com ação "Verificar perfil" no clique de "Quero esta vaga"), `components/hunter/SubmitCandidateModal.vue` (trata `err.code==='HUNTER_NOT_VERIFIED'` com mensagem própria) — todos checam `auth.user?.verificationStatus === 'APPROVED'`. Admin: `middleware/admin.ts` (novo — checa token + `auth.user.role==='ADMIN'`), `composables/useAdminWorkspace.ts` (novo, nav "Verificações de hunter"), `pages/app/admin/verificacoes.vue` (A2 mínimo: lista `PENDING`, aprovar 1-clique, recusar com modal + motivo obrigatório).
- **B5+B8 validado E2E completo (2026-07-06)**: ciclo completo no Chrome — diretório → perfil público → self-edit → upload PDF (`file_upload` no `<input type=file>` oculto, obtido via `read_page filter:'all'`, nunca clicar no botão visível que abre o picker nativo) → submit → fila admin recusa (motivo obrigatório) → hunter reenvia → admin aprova → selo "✓ Verificado" confirmado no diretório e perfil, marketplace/candidatos desbloqueados. **Bug de reatividade encontrado e corrigido nesta rodada** (ver acima, gotcha do `auth.user` assíncrono) — sem o fix, o hunter veria seus próprios dados de perfil somem a cada reload, risco real de perda de dados ao salvar por engano. Os outros 2 bugs desta rodada foram no backend (parsing de boolean em query string, `select` faltando `personas`) — ver `../vitrinepro-bakend/CLAUDE.md` §Ambiente.
