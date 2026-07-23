# Relatório E2E — Desktop, por tipo de usuário (vitrinepro-frontend-v2)

**Data:** 22/07/2026 · Viewport 1280×800 · backend NestJS local (`:3000`) contra Neon + Nuxt dev (`:4321`).
**Escopo:** varredura ponta a ponta de **todos os 6 tipos de usuário**, com foco em fluxos funcionais reais (não só carga de página).

## Resultado

**1 bug real encontrado e corrigido.** Fora ele, todos os 6 perfis passaram: zero erros de console, zero requests de API com falha (além do bug), zero overflow, e as ações reais testadas (mover candidato de etapa, salvar página, buscar, filtrar, RBAC) funcionaram contra o backend real.

| Perfil | Páginas | Ação real testada | Status |
|---|---|---|---|
| Público + Auth | login, guard, redirect | login inválido→erro sem logout; válido→respeita `?redirect=` | ✅ |
| Empresa | 7 seções + pipeline | mover candidato de etapa (ida/volta) + salvar página (PATCH 200) | ✅ |
| Hunter | 6 seções | timeline de placement P3, marketplace com fee correto | ✅ |
| Candidato | 8 páginas | radar, subnav de perfil (portfólio/CV/formação) | ✅ |
| Admin | 10 seções | busca de usuários (20→7 filtrando) | ✅ |
| Consultoria (owner) | 7 seções | filtro de pipeline por vaga | 🐛→✅ |
| Consultoria (manager) | RBAC | vê "Convidar" mas não troca papel/remove | ✅ |
| Consultoria (recruiter) | RBAC | não vê "Novo cliente"/menu; filtro de pipeline OK | ✅ |

---

## 🟠 Bug encontrado e corrigido: filtro de pipeline da Consultoria quebrado para todos

**Arquivo:** `app/pages/app/consultoria/pipeline.vue:45`

```ts
// ANTES
api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 200 }).catch(() => null)
```

O DTO do backend valida `limit` com teto de **100** (`limit must not be greater than 100` → **HTTP 400**). Como a página pedia `limit: 200`, a request **falhava sempre** — não em algum caso extremo, em **100% das cargas**. O `.catch(() => null)` engolia o erro silenciosamente, então `vagasResp` ficava `null` e o dropdown de filtro "Todas as vagas" da tela **Pipeline Geral** nunca tinha nenhuma opção de vaga.

**Impacto:** o filtro por vaga do pipeline da consultoria estava **permanentemente inutilizável para todos os membros** (owner, manager, recruiter) — não dava para filtrar o pipeline geral por uma vaga específica. Passava despercebido porque não gerava erro visível: só um dropdown que só listava "Todas as vagas".

**Causa raiz típica:** `.catch(() => null)` num `useAsyncData` mascara qualquer erro de API. Quando o próprio parâmetro da request é inválido, a falha é 100% determinística mas invisível.

**Fix:** `limit: 200` → `limit: 100` (o teto do backend). Confirmei que é o **único** lugar do app fora do limite — grep em todo `app/` mostrou que os outros 13 usos de `/vagas/me` e `/portfolio` já usam `limit: 100`.

**Revalidado ao vivo:** `GET /vagas/me?limit=100` → **200**, e o dropdown agora lista **2 opções** ("Todas as vagas" + "Desenvolvedor(a) Backend Pleno"). Confirmado funcionando como **owner** e como **recruiter**.

---

## Detalhe por perfil

### Público + Auth ✅
- Guard de rota: sem token, `/app/empresa/faturas` → redireciona a `/login?redirect=/app/empresa/faturas`.
- Login inválido → "E-mail ou senha incorretos", **permanece logado-out sem deslogar** nem quebrar.
- Login válido → **respeita o `?redirect=`** (caiu direto em `/app/empresa/faturas`).

### Empresa (`andresempresa@getnada.com`) ✅
- 7 seções (Início, Minhas Vagas, Candidatos, Hunters, Faturas, Página, Configurações) carregam com dados reais.
- **Minhas Vagas:** 5 ativas + filtro de tabs (Rascunhos → 1 vaga) funciona.
- **Pipeline (kanban, 8 colunas):** movi "Diego AutoConfirm" de *Para analisar* → *Analisados* e **de volta**, via o `UiSelect` "Mover de etapa" — contadores das colunas atualizaram e a API não deu erro. Estado restaurado ao original.
- **Hunters:** 3 tabs reais (Meus hunters / Encontrar hunters / Avaliações pendentes (1)).
- **Página da Empresa:** **editei a bio, salvei (PATCH /profile → 200, toast "Salva"), e restaurei** o valor original. Prova de que o fluxo de escrita funciona ponta a ponta.
- Candidatos cross-vaga (5 linhas, filtros + Exportar CSV), Faturas (1 fatura Paga), Config (matriz de 34 toggles + preferência de contato).

### Hunter (`testeia@getnada.com`) ✅
- 6 seções carregam. Dashboard "Minha mesa" contextual (bate com KPIs: 1 indicação, 3 placements).
- **Marketplace:** 45 cards, badges de fee corretos incl. **"80% fee"** (o fix do F20 confirmado em contexto autenticado), **0** badges "R$ 0".
- **Ganhos:** KPIs reais (A receber R$ 3.270), ações P2 (Confirmar/Contestar) presentes, **timeline P3** abre os passos (Contratado→Confirmado) sem erro de API.
- Candidatos (9 no pool), Perfil (dados reais + selo Verificado), Minhas Vagas (1).

### Candidato (`consenttest...@getnada.com`) ✅
- 8 páginas carregam. Dashboard (completude 0/4, 4 vagas, **0** badges "R$ 0").
- **Radar:** 9 vagas com deck de swipe. Candidaturas e Salvas com estados vazios corretos.
- Subnav de Perfil: Dados, Portfólio, Currículos, Formação — todas carregam sem erro.

### Admin (`admin@gmail.com`) ✅
- **10 seções** carregam com dados reais (GMV R$ 17.850, take R$ 4.488, 10 placements, MRR R$ 2.950).
- **Usuários:** busca funciona (20 → 7 filtrando "andres").
- Placements (11), Faturas (1), Pagamentos (1), Cupons (2 tabs), Vagas (20), Empresas (1) — todos OK.
- *Falso positivo checado:* "NaN" apareceu num scan de texto, mas era só "Her**nan**dez"; verificação precisa com `\bNaN\b` confirmou **zero** NaN real em todas as tabelas.

### Consultoria — RBAC pelos 3 papéis ✅
- **Owner** (`b15owner`): 7 seções, vê "Novo cliente", "Convidar membro" + selects de papel em Membros.
- **Manager** (`b15manager`): vê "Convidar" e "Novo cliente" (escrita em clientes), mas **sem** selects de papel/"Remover" em Membros (só owner). ✓ RBAC correto.
- **Recruiter** (`b15recruiter`): **não vê** "Novo cliente" nem menu "⋯" em Clientes (só leitura), mas vê o cliente Acme ao qual está atribuído; Pipeline e filtro funcionam. ✓ RBAC correto.

---

## Regressão do fix

- `GET /vagas/me?limit=100` → 200 (owner e recruiter); dropdown com 2 opções.
- `eslint app/pages/app/consultoria/pipeline.vue` → limpo.
- Mudança mínima e isolada (só o número `200`→`100` + comentário), sem efeito em outras telas.

## Ressalva de ambiente

Mesma da rodada mobile: a aba roda em background (`document.hidden`, 0 frames de rAF), então **screenshots e transições CSS não renderizam**. Toda a validação foi por DOM (`getBoundingClientRect`/`querySelector`/`.click()` nativo) + `read_network_requests` + `read_console_messages`, que são confiáveis. **Nenhuma confirmação visual por screenshot** — se quiser essa camada, repetir num navegador em primeiro plano.
