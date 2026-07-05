# Plano de Desenvolvimento — vitrinepro-frontend-v2 + Gaps de Backend

> Mantido pelo agente `sprint-planner`. Specs: `../design-spec/`. Backend reutilizado: `../vitrinepro-bakend`.
> Coluna **Backend**: ✅ endpoint existe · 🟡 existe parcial/adaptar · ❌ não existe (ver §Backend)

---

## FASE 0 — Fundação (esta sessão / semana 1)
- [x] Scaffold Nuxt 4 + tokens + env copiadas do v1
- [x] UI kit base: Button, Input, Badge, Card, Modal, Drawer, Toaster
- [x] useApi (JWT, erros padronizados) + store auth + middleware
- [x] Layouts: marketing, auth, app (sidebar)
- [x] Páginas de referência: Home T01 (parcial), Login T12
- [x] `npm install` + `npm run dev` validados localmente
- [x] Completar UI kit: Select, Multi-select chips, Datepicker, campo moeda/telefone, Tabs, Stepper, Tabela, EmptyState, ConfirmDialog, Pagination, Avatar, KPI Card
- [x] Git init + primeiro commit (deploy preview Vercel: pendente — push para o remoto)

## FASE 1 — Público + Auth (aquisição/SEO) — Backend ✅ quase todo
| Tela | ID | Backend |
|---|---|---|
- [x] Cadastro 2 passos (persona) | T13 | ✅ `/auth/register` (isCompany ok; persona hunter ❌ B1)
- [x] Recuperar/redefinir senha | T14/T15 | ❌ B2 (mock dev em `auth.forgotPassword`/`resetPassword`; trocar quando B14+B2 existirem)
- [x] Home completa (prova social, depoimentos, carrossel) | T01 | 🟡 carrossel real `/vagas` + contadores reais `/stats/home` (B12 parcial); fees/placements/hunters ainda mock
- [x] /vagas + /vagas/[segmento] + filtros | T05 | ✅ `/vagas/radar` (q, segmento, cidade, tipo, modo, salário, ordem recent/relevance). Falta backend: order "maior salário/fee" e filtro fee (fee proxy=allowHunters no front) → B4
- [x] /vaga/[slug] + Modal Candidatura | T06 | ✅ apply (409/400/403), salvar, compartilhar, semelhantes, SEO JobPosting; backend: `findBySlugPublic` agora carrega `company`. Falta: valor do fee R$ + "Quero esta vaga" drawer T-H07 (B4); bloco fee mostra só "aceita hunters"
- [x] /precos | T04 | ✅ `/plans` (toggle mensal/anual, 4 cards, marketplace 25%, tabela comparativa, FAQ). CTA → /cadastro?plan=...&redirect=checkout (checkout = M2, pendente)
- [x] /para-empresas (calculadora fee), /para-candidatos | T02/T03 | — (marketing puro, calculadora client-side; sem backend)
- [x] Perfil público candidato | T09 | ✅ `/profile/:username` (+ portfolio/education/cv públicos; tabs Portfólio/Sobre/Formação; 404 oculto/empresa). Nota: banner "perfil oculto" p/ dono não dá (endpoint 404a oculto sem auth)
- [ ] /hunters + /hunter/[username] | T07/T08 | ❌ B5 (perfil/diretório hunter)
- [ ] /empresa/[slug] | T10 | ❌ B6
- [x] /processo/[token] | T11 | ✅ `/public/processo/:token` (layout limpo, etapa atual, score, notas, timeline; 410 front). Nota: snapshot não traz empresa nem expiresAt (footer sem "válido até"); backend responde 404 p/ expirado/revogado
- [ ] /convite/[token] | T16 | 🟡 aceite existe; token por URL ❌ B7
- [x] 404/410 com tombstones | T18 | ✅ `/seo/*` (error.vue 404+410; tombstone em vaga/perfil → 410/301; /termos /privacidade /cookies /ajuda; banner de cookies). Textos legais = placeholder

## FASE 2 — Workspace Hunter (núcleo do produto)
- [ ] Escolher perfil + onboarding hunter | T-C00/T-H01 | ❌ B1 (persona), verificação ❌ B8
- [x] Início "Minha mesa" | T-H02 | 🟡 slots reais (`/vagas/me/usage`); KPIs/mesa mock (B12)
- [x] Minhas Vagas + Editor + fluxo Publicar (slots, Modal Upgrade) | T-H03/T-H04 | ✅ `/vagas/me`, create/patch, `publish`, PLAN_LIMIT_REACHED→Modal Upgrade, autosave. Fee/maxHunters/exclusividade no editor = B4 (fora)
- [x] Pipeline kanban + drawer candidato + notas/score/histórico | T-H05 | ✅ kanban drag&drop (PATCH status), drawer (mover/rejeitar/nota etapa/histórico), estados DRAFT/CLOSED. Nota: listByVaga não retorna stageNotes/score → drawer escreve sem pré-carregar; origem sempre "Direta" (B3)
- [x] Modal Configurar Etapas | T-H06 | ✅ PATCH /me/pipeline-template (renomear, cor, reordenar, add/remover; rejected fixo)
- [x] Compartilhar processo + PDF | T-H10 | ✅ ShareProcessModal (gerar/copiar/revogar link público) + Baixar PDF, no drawer do candidato. Nota: sem endpoint de listagem → lista só os links da sessão; URL montada com frontendUrl (backend retorna domínio prod); QR pendente (sem lib)
- [ ] Marketplace de vagas + termos | T-H07 | 🟡 hunter-interests existe; fee/termos/limite submissões ❌ B4
- [x] **Meus Candidatos + Submeter candidato (3 passos)** | T-H08 | 🟡 **backend + front v1 feitos**. Front: `/app/hunter/candidatos` (lista+busca+badge LGPD+drawer detalhe), `AddCandidateModal` (cadastrar fantasma), `SubmitCandidateModal` (stepper 3 passos, trata 400/403/409). Backend: módulo `hunter-candidates`, `POST /vagas/:id/submissions` (limite 5/hunter + trava 90d), migração `1748600000000`. **Faltam (v2):** aba "Buscar na VitrinePro" (dep. B13), upload de CV, tags/filtros, fee na vaga (B4), e-mail real (B14); seletor de vaga usa só as vagas próprias publicadas (marketplace = T-H07/B4)
- [ ] Placements & Ganhos | T-H09 | ❌ B9
- [ ] Perfil de hunter (edição) | T-H11 | ❌ B5

## FASE 3 — Workspaces Candidato + Empresa
- [ ] Candidato: Início, Radar (desktop+swipe), Candidaturas, Salvas, Perfil, Portfólio, CVs, Formação | T-C01..09 | ✅ tudo existe (saved-vagas, saved-filters, cv, education, portfolio)
- [ ] Empresa: onboarding, vagas, pipeline com mascaramento, hunters (aceitar/avaliar), faturas, página | T-E01..09 | 🟡 vagas/pipeline ✅; mascaramento ❌ B4; avaliações ❌ B10; faturas ❌ B11
- [ ] Consentimento LGPD do candidato (notificação + modal) | T-C09/N | ❌ B3

## FASE 4 — Consultoria + Placement + Monetização real
- [ ] Consultoria: criação, início KPIs, vagas time, pipeline geral, clientes, membros, faturamento, config | T-T01..08 | ✅ teams/companies/seats; KPIs ❌ B12
- [ ] Fluxo Placement completo (P1–P4) | 06 §P | ❌ B9
- [ ] Assinatura + Checkout (Pix/cartão/boleto) + Modal Upgrade global | M1–M3 | 🟡 checkout/confirm MOCK → gateway ❌ B11
- [ ] Indicações (cupons) | M4 | ✅ coupons
- [ ] Conta: dados, segurança, notificações, privacidade | 06 §C | 🟡 sessões/export ❌ B13

## FASE 5 — Admin + polish
- [ ] Admin: visão geral, verificações, disputas, placements, cupons, usuários | A1–A6 | 🟡 cupons ✅; resto ❌ B8/B9/B12
- [ ] Sino de notificações + busca cmd+K | 06 §N | ❌ B13 (notificações in-app)
- [ ] E2E Playwright dos fluxos de dinheiro; Lighthouse ≥90 nas públicas

---

# §BACKEND — O que falta no NestJS (reutilizando `vitrinepro-bakend`)

**Mantém-se intacto (já serve o v2):** auth/OAuth, profile, portfolio, education, cv, tags, vagas + publish-ledger, pipeline-templates, vaga-applications (notas/score/histórico), process-share/PDF, teams/seats, companies, saved-vagas/filters, search, coupons, seo/tombstones, storage.

| # | Gap | Descrição | Fase |
|---|---|---|---|
| **B1** | Persona/role de produto | Campo `personas: ['CANDIDATO','HUNTER','EMPRESA']` no User + endpoint para ativar persona (hoje só `isCompany`). | 1 |
| **B2** | Reset de senha | `POST /auth/forgot-password` + `POST /auth/reset-password/:token` (token 1h, anti-enumeração). Depende de B14. | 1 |
| ~~**B3**~~ ✅ | **Submissão de candidatos por hunter** | **FEITO (backend)** — módulo `hunter-candidates`: `hunter_candidates` (talent pool/CRM, candidato fantasma), consentimento LGPD por token (e-mail=**stub**, real depende de B14), `POST /vagas/:id/submissions` (limite 5/hunter + trava 90d — RN-NOVA-01/02), `source`/`submittedByHunterId`/`hunterCandidateId` na application. Migração `1748600000000`. Falta: e-mail real (B14) + upload de CV do candidato + front T-H08. | 2 |
| **B4** | Marketplace/fee na vaga | Campos `feeAmount/feePercent`, `maxHunters`, `exclusivityDays` na Vaga; aceite de termos no hunter-interest; mascaramento de contato por etapa (RN-NOVA-03); limite de submissões. | 2 |
| **B5** | Perfil público de hunter | Entidade/endpoints: headline, especialidades, métricas agregadas, diretório `/hunters` (filtros), slug público. | 2 |
| **B6** | Página pública de empresa | `GET /empresas/:slug` (conta isCompany) + vagas abertas. Hoje empresa é 404 público. | 1 |
| **B7** | Convite por token | TeamMember PENDING ganha `inviteToken` + e-mail com link `/convite/[token]` (hoje só aceita logado via listagem). Depende de B14. | 1 |
| **B8** | Verificação de hunter | Upload docs, status (PENDING/APPROVED/REJECTED), fila admin, selo. Gate do marketplace. | 2 |
| **B9** | **Placements** | Entidade placement (salário final, fee, split 75/25, garantia 60/90d), confirmação bilateral + auto-confirm 7d, estados P3, disputa, estorno/reposição. | 4 |
| **B10** | Avaliações de hunter | `reviews` (1–5 + comentário, 1 por placement, imutável — RN-NOVA-07), agregadas no perfil B5. | 3 |
| **B11** | **Pagamentos reais** | Trocar mock `POST /subscriptions/:id/confirm` por gateway com webhook (Asaas ou Pagar.me — ambos têm split nativo p/ fee do hunter). Faturas de fee, Pix/cartão/boleto, inadimplência bloqueia publish. | 4 |
| **B12** | Agregações/KPIs | Endpoints de dashboard (hunter: ganhos/mês; consultoria: pipeline overview, atividade; admin: GMV/MRR; home: contadores públicos). 🟡 **home feito:** `GET /stats/home` (openVagas, professionals, companies) em `src/stats/`. Falta: dashboards hunter/consultoria/admin. | 2–5 |
| **B13** | Notificações | Tabela `notifications` + endpoints (sino), preferências por evento; sessões ativas + export LGPD. | 3–5 |
| ~~**B14**~~ ✅ | **E-mail transacional** | **FEITO e validado E2E.** Módulo `mail` (Resend via `fetch`, sem dep.; modo STUB sem key). Consentimento de B3 envia de verdade → página pública `/consentimento/[token]`. **Domínio `send.v8pro.com.br` verificado no Resend** e `MAIL_FROM=no-reply@send.v8pro.com.br` — e-mail entregue e renderizado OK numa caixa real (getnada) em 2026-07-05. **Falta (incremental):** ligar B2 (reset) e B7 (convite) ao MailService; templates de submissão/etapa/placement/fatura. | 1 |
| B15 | Delegação de time em candidaturas | `listByVaga/updateStatus/notas` hoje exigem `createdById` — abrir para OWNER/MANAGER do time (dívida já documentada). | 2 |
| B16 | Limpeza | Remover campos de Serviços (isService etc.), PlanLimitGuard morto, enum deprecated; padronizar migrações (sem synchronize). | 0 |

**Ordem recomendada no backend:** B14 → B2/B7/B6 → B1 → B3+B4 (núcleo) → B5+B8 → B15 → B9 → B10 → B11 → B12/B13 → B16 contínuo.

---

## Dívidas / Notas
- `.claude/agents/` deve ser populado com `cp claude-setup/agents/*.md .claude/agents/` (sessão Cowork não pôde escrever em pasta protegida).
- Decidir nome/marca final (placeholder HUNTRIA; logo wordmark).
- Páginas pendentes referenciadas (T16 convite, T17 verificação e-mail, T18 utilitárias, /app/escolher-perfil de T-C00) ainda não existem — links já apontam para essas rotas.
