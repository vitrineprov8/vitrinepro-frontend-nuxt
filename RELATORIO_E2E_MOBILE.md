# Relatório E2E — vitrinepro-frontend-v2 (HUNTRIA)

**Data:** 22/07/2026 · **Status: 8/8 corrigidos e revalidados.**
**Escopo:** varredura E2E foco mobile (375×812), com checagem em 360×800, 430×932 e regressão em 1280×800.
**Ambiente:** backend NestJS local (`:3000`) contra Neon (DB real de teste) + Nuxt dev (`:4321`). Contas de `qa-test-accounts.json`.

## Resumo

Foram encontrados **8 problemas reais** — 2 de alto impacto, ambos exclusivos de mobile e ambos novos (não pegos pela auditoria F16). **Todos corrigidos e revalidados ao vivo.**

Nenhum erro de servidor em nenhum momento: as **23 rotas públicas responderam 200** antes e depois das correções, e os 404 dinâmicos continuam reais.

| # | Problema | Severidade | Status |
|---|---|---|---|
| 1 | Navegação do site inalcançável no mobile | 🔴 Alta | ✅ Corrigido |
| 2 | "Publicar vaga" cortado fora da tela | 🔴 Alta | ✅ Corrigido |
| 3 | Selo de fee mostrando "R$ 0" | 🟠 Média | ✅ Corrigido |
| 4 | Hidratação SSR quebrada (todas as páginas públicas) | 🟠 Média | ✅ Corrigido |
| 5 | iOS dá zoom em todo formulário | 🟠 Média | ✅ Corrigido |
| 6 | "Minha mesa" com texto fixo/errado | 🟡 Baixa | ✅ Corrigido |
| 7 | Links sociais placeholder | 🟡 Baixa | ✅ Corrigido |
| 8 | Alvos de toque abaixo de 44px | 🟡 Baixa | ✅ Corrigido |

---

## 🔴 1. Navegação do site sumia no mobile

**Arquivo:** `app/layouts/default.vue`

`@media (max-width: 768px) { .mkt__nav { display: none; } }` existia **sem nenhum substituto** — não havia hambúrguer no layout de marketing. Os 6 links do site ficavam inalcançáveis pelo topo em qualquer telefone; só pelo rodapé.

- Medido antes: **0** links visíveis no header a 375px (**6** a 1280px).

**Correção:** menu mobile no mesmo padrão do drawer de `layouts/app.vue` — `.mkt__burger` + `.mkt__menu` (`position:fixed` abaixo da topbar) + backdrop, com `body{overflow:hidden}` enquanto aberto e fechamento no clique do próprio item (o `watch` de rota não dispara quando o link é a rota atual — armadilha já conhecida do F15b). "Entrar"/"Criar conta" migraram para dentro do menu no mobile, o que de quebra resolveu o alvo de toque de 32px desses botões.

**Revalidado:** burger 40×40 visível; menu abre com os **6 links**, cada um com 57px de altura e todos dentro da tela; backdrop presente; scroll do fundo travado; clicar em "Vagas" navega, fecha o menu e restaura o scroll. Desktop inalterado (burger escondido, 6 links, sem overflow).

---

## 🔴 2. Botão "Publicar vaga" cortado fora da tela

**Arquivo:** `app/components/VagaEditor.vue`

O `.editor__footer` é `position:fixed`, linha flex com `justify-content:space-between` e sem `flex-wrap`. Largura necessária ≈ **452px** (48px de padding + ~106px do texto de autosave + 298px dos dois botões).

A 375px as ações iam até **x=428** → **53px do CTA primário fora da viewport, com o rótulo cortado**. Como o footer é `fixed`, o excedente **não vira scroll** — simplesmente some.

- Só cabia a partir de ~432px, ou seja **360 / 375 / 390 / 393 / 412 (praticamente todo telefone) estavam quebrados**. Desktop sempre esteve OK — por isso passou batido em auditorias anteriores.
- **Atingia 6 páginas**, porque o componente é compartilhado: `hunter|empresa|consultoria` × `vagas/nova` e `vagas/[id]/editar`.

**Correção:** `@media (max-width: 560px)` esconde o texto de autosave (o estado já aparece no toast) e deixa os dois botões dividirem a linha (`flex:1` + `min-width:0`).

**Revalidado:** a 375px — "Salvar rascunho" 16→184 e "Publicar vaga" 192→359, ambos 168×40 e **inteiramente na tela**. A 360px idem (344 < 360). Desktop sem alteração.

---

## 🟠 3. Selo de fee mostrando "R$ 0"

**Arquivos:** `app/components/VagaCard.vue`, `app/pages/vaga/[slug].vue`

`feeAmount` chega como string decimal e `"0.00"` **não é `null`**, então o teste `!= null` passava e curto-circuitava antes do percentual.

A vaga real `dev-pleno` (`feeAmount:"0.00"`, `feePercent:"80.00"`) exibia **"R$ 0"** no card e o contraditório **"R$ 0 (80% do salário)"** no detalhe — em Home, `/vagas`, marketplace do hunter, dashboard do candidato e página da vaga.

**Correção:** `Number(x) || null` (zero passa a significar "sem fee") e precedência do percentual primeiro, alinhada com `MarkHiredModal.vue`, que é a que vale no cálculo real do servidor.

> **Regra geral:** campo decimal-como-string vindo do backend nunca deve ser testado só com `!= null` — `"0.00"` é um valor legítimo que aqui significa "não definido".

**Revalidado:** card agora mostra **"Dev Pleno | 80% fee"**, detalhe mostra **"80% do salário"**, e **zero** ocorrências de "R$ 0" na listagem inteira.

---

## 🟠 4. Hidratação SSR quebrada em todas as páginas públicas

**Arquivos:** `ui/Toaster.vue`, `ui/Modal.vue`, `ui/Drawer.vue`, `CommandPalette.vue`

Os quatro usavam `<Teleport to="body">` sem guarda. No SSR o Teleport deixa um comentário-âncora onde o componente está e move o conteúdo para o `<body>`; o cliente espera a div ali → `Hydration node mismatch` + `Hydration completed but contains mismatches` no console, a cada carga de página pública.

**Correção:** os 4 envolvidos em `<ClientOnly>` (overlay não tem valor de SEO).

**Revalidado:** console **limpo** numa aba nova (zero erros, zero warnings de hidratação); `class="toaster"` e `modal-overlay` sumiram do HTML de SSR (conferido por `curl`); e **modais e drawers continuam abrindo e teleportando para o `<body>`** normalmente, com dados reais.

---

## 🟠 5. iOS dava zoom em todo formulário

**Arquivo:** `app/assets/css/base.css`

O Safari iOS aplica zoom na viewport ao focar um campo com `font-size < 16px` e **não desfaz ao sair** — a regra global do projeto era 14px, afetando login, cadastro, editor de vagas, filtros, perfil e conta.

**Correção:** `@media (max-width: 768px) { input, select, textarea { font-size: var(--text-16) !important; } }`

O `!important` é necessário e foi aprendido na prática: sem ele, qualquer regra de componente com seletor de classe (`.editor__textarea`, `.field__input--currency`, os `textarea` dos modais) vence por especificidade — a 1ª tentativa deixou **5 de 9 campos** do editor ainda em 14px. Conferido antes de aplicar que **nenhum controle do app passa de 16px**, então a regra só sobe, nunca desce.

**Revalidado:** editor de vaga com os **9 campos a 16px** (antes: 5 abaixo), login a 16px, e campos dentro de modal também a 16px. Desktop volta a 14px.

---

## 🟡 6. "Minha mesa" com texto fixo

**Arquivos:** `app/pages/app/hunter/index.vue`, `app/pages/app/empresa/index.vue`

O array era fixo, então dizia "Crie sua primeira vaga" para o hunter com vagas publicadas e 3 placements, e para a empresa com o KPI "Vagas abertas: 4" logo ao lado.

**Correção:** deriva de `GET /vagas/me?limit=1` (só o `total` interessa) + os KPIs já carregados — só sugere criar a primeira vaga quem realmente não tem nenhuma, e destaca o que espera ação.

**Revalidado, as duas ramas:**
- *com* vagas (contas reais) → "1 indicação sua aguarda resposta da empresa" + "3 placements em andamento", batendo exatamente com os KPIs; empresa → "1 candidato novo nos últimos 7 dias". Sem "primeira vaga".
- *sem* vagas → "Crie sua primeira vaga" reaparece corretamente. Exercitada com um stub de `window.fetch` forçando `total:0`, porque nenhuma conta de teste tem 0 vagas e criar conta está fora da política.

---

## 🟡 7 e 8. Links sociais e alvos de toque

- **`app/layouts/default.vue`** — rodapé apontava para `linkedin.com`/`instagram.com` genéricos; trocado pelos perfis reais da VitrinePro.
- **`app/layouts/app.vue`** — `.shell__burger` era 22×22 e os `.shell__iconbtn` (busca/sino) 20×20, contra os 44×44 de Apple HIG / WCAG 2.5.5 — e o burger é o **único** acesso à navegação no mobile. Ampliados via `padding` + margem negativa (o ícone não muda de tamanho): **agora 46×46 e 44×44**, confirmado ao vivo.
  - Cuidado que isso exigiu: o `.shell__notif-dot` é `position:absolute` contra a caixa do botão, então crescer o botão descolava o badge do sino. Os offsets viraram `calc(var(--sp-3) - 4px/6px)`; revalidado que o badge segue a 6px da quina do **ícone**, como no design original.

---

## Investigado e descartado (não são bugs)

- **Kanban do pipeline** usa drag-and-drop HTML5 puro, que não funciona em toque — **mas** o drawer do card tem "Mover de etapa" + botão "Mover" funcionando, então ninguém fica bloqueado no celular.
- **Radar por swipe** está correto: pointer events + `touch-action: pan-y` + `setPointerCapture`.
- **Tabelas largas** (565–760px) rolam dentro de `overflow-x:auto` sem vazar layout.
- **Ponto de produto, não bug:** o candidato enxerga o fee do hunter ("50% fee") nos cards do próprio dashboard. Vale decidir se essa informação comercial deve aparecer para quem se candidata.

## Regressão

- **23 rotas públicas em 200** e os 4 404 dinâmicos corretos, depois das correções.
- **Zero erros de console** em toda a sessão autenticada (hunter, empresa, admin).
- `nuxt typecheck`: **nenhum erro novo** introduzido — e um preexistente a menos (`vaga/[slug].vue`). A dívida de tipos que resta (casts nas páginas de admin, `useApi.ts`, `nuxt.config.ts`, mocks de `index.vue`) já existia e não foi tocada.
- `eslint` nos 11 arquivos alterados: só avisos preexistentes (`isEditableTarget` não usado, `require-default-prop`), nenhum novo.
- Desktop 1280px revalidado: nav com 6 links, burger escondido, footer do editor folgado, sem overflow.
- Fluxos reconferidos ao vivo: login (válido e inválido), guard de rota com `?redirect=`, dashboards de hunter/empresa/admin, pipeline + drawer, ganhos, candidatos, `/vagas`, página de vaga.

## Ressalva de ambiente (importante para a próxima rodada)

Diferente do que está documentado no F15, aqui o `resize_window` **funcionou** (`window.innerWidth` mudou de verdade), então não foi preciso o truque do iframe. O problema foi outro: **a aba roda em background** (`document.hidden === true`, **0 frames de `requestAnimationFrame`**), então screenshots dão timeout e **nenhuma transição CSS, animação ou `IntersectionObserver` avança**.

Isso gera falsos positivos muito convincentes — os contadores da Home ficam em "0" (são animados por rAF; `/stats/home` devolve `{openVagas:9, professionals:46, companies:1}` corretos), e drawers/modais aparecem "fora da tela" ou "que não fecham" porque congelam na classe `-enter-from`/`-leave-active`. **Antes de reportar overlay deslocado ou que não fecha, checar as classes de transição e a `opacity`.**

Medição de layout estático (`getBoundingClientRect` / `getComputedStyle`) continua 100% confiável — foi só com ela que os 2 bugs de alto impacto foram medidos. **Nenhuma correção desta rodada teve confirmação visual por screenshot**; se quiser essa camada extra, vale repetir num navegador em primeiro plano.
