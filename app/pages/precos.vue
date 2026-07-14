<script setup lang="ts">
// T04 — Preços. Dados reais de GET /plans. Spec: design-spec/01 §T04
useSeoMeta({
  title: 'Preços',
  description: 'Planos do VitrinePro: ATS gratuito para começar e planos para escalar. Marketplace com 25% de taxa sobre o fee, sem custo adiantado.',
})

interface PlanInfo {
  tier: 'FREE' | 'RECRUITER' | 'TEAM' | 'ENTERPRISE'
  name: string
  priceBRL: number
  vagaLimit: number
  seatLimit: number
  features: string[]
}

const api = useApi()
const auth = useAuthStore()

const { data: plansResp } = await useAsyncData('plans', () =>
  api.get<PlanInfo[]>('/plans').catch(() => null))

// Ordem fixa de exibição.
const order: PlanInfo['tier'][] = ['FREE', 'RECRUITER', 'TEAM', 'ENTERPRISE']
const plans = computed<PlanInfo[]>(() => {
  const list = plansResp.value ?? []
  return order
    .map(t => list.find(p => p.tier === t))
    .filter((p): p is PlanInfo => !!p)
})

const annual = ref(false)

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}
// Preço mensal exibido (anual = -20%, equivalente mensal).
function monthlyPrice(p: PlanInfo) {
  return annual.value ? Math.round(p.priceBRL * 0.8) : p.priceBRL
}

const ctaLabel: Record<PlanInfo['tier'], string> = {
  FREE: 'Começar grátis',
  RECRUITER: 'Assinar',
  TEAM: 'Assinar',
  ENTERPRISE: 'Falar com vendas',
}

// M3 — checkout real existe (`/app/conta/assinatura/checkout`). F9 mandava
// pro app com um toast placeholder porque o checkout ainda não tinha UI;
// agora manda direto pro checkout de verdade.
function onCta(tier: PlanInfo['tier']) {
  if (tier === 'ENTERPRISE') { window.location.href = 'mailto:vendas@v8pro.com.br?subject=Plano Enterprise'; return }
  if (tier === 'FREE') { navigateTo(auth.isAuthenticated ? '/app' : '/cadastro'); return }
  const plan = tier.toLowerCase()
  if (auth.isAuthenticated) {
    navigateTo(`/app/conta/assinatura/checkout?plan=${plan}`)
  }
  else {
    // redirect leva de volta a /precos (whitelisted); depois de logar o usuário
    // ainda precisa clicar em Assinar de novo (sem plan pré-selecionado pós-cadastro)
    navigateTo(`/cadastro?plan=${plan}&redirect=${encodeURIComponent('/precos')}`)
  }
}

function priceLabel(p: PlanInfo): string {
  if (p.tier === 'ENTERPRISE') return 'Fale conosco'
  if (p.priceBRL === 0) return 'R$ 0'
  return `R$ ${fmtBRL(monthlyPrice(p))}`
}

function limitLabel(n: number) {
  return n === -1 ? 'Ilimitado' : String(n)
}

// Tabela comparativa (linhas derivadas + flags).
const showCompare = ref(false)
const compareRows = computed(() => {
  const byTier = (t: PlanInfo['tier']) => plans.value.find(p => p.tier === t)
  const vagas = (t: PlanInfo['tier']) => { const p = byTier(t); return p ? limitLabel(p.vagaLimit) : '—' }
  const seats = (t: PlanInfo['tier']) => { const p = byTier(t); return p ? limitLabel(p.seatLimit) : '—' }
  return [
    { label: 'Vagas publicadas / mês', values: [vagas('FREE'), vagas('RECRUITER'), vagas('TEAM'), vagas('ENTERPRISE')] },
    { label: 'Acessos (membros)', values: [seats('FREE'), seats('RECRUITER'), seats('TEAM'), seats('ENTERPRISE')] },
    { label: 'Painel de candidatos', values: ['—', '✓', '✓', '✓'] },
    { label: 'Compartilhamento ilimitado', values: ['—', '✓', '✓', '✓'] },
    { label: 'Gestão de clientes (Empresas)', values: ['—', '—', '✓', '✓'] },
    { label: 'Destaque nas buscas', values: ['—', '—', '✓', '✓'] },
    { label: 'Suporte prioritário', values: ['—', '—', '—', '✓'] },
  ]
})

const faq = [
  { q: 'Preciso pagar para começar?', a: 'Não. O plano Gratuito tem ATS completo, perfil público e 1 vaga publicada por mês. Você só assina um plano pago quando quiser publicar mais vagas ou trabalhar em time.' },
  { q: 'Como funciona a taxa do marketplace?', a: 'Quando você faz um placement por uma vaga com fee, o VitrinePro retém 25% do fee. Essa taxa já está incluída — você nunca paga nada adiantado.' },
  { q: 'O que é cobrado no plano anual?', a: 'No plano anual você paga 12 meses com 20% de desconto (equivale a 2 meses grátis), cobrados de uma vez.' },
  { q: 'Posso trocar de plano depois?', a: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento nas configurações da sua conta.' },
  { q: 'O que acontece se eu cancelar?', a: 'Você mantém o acesso até o fim do período já pago. Depois, sua conta volta ao plano Gratuito sem perder seus dados.' },
  { q: 'Os limites de vagas acumulam?', a: 'Não. Os slots de publicação são por ciclo de cobrança e não acumulam para o mês seguinte.' },
  { q: 'Quantos acessos o plano Team inclui?', a: 'O Recruiter Team inclui até 5 acessos simultâneos. Para mais, fale com vendas sobre o Enterprise.' },
  { q: 'Quais formas de pagamento são aceitas?', a: 'Pix, cartão de crédito e boleto. O processamento de pagamentos é feito de forma segura.' },
]
</script>

<template>
  <div class="precos container">
    <header class="precos__header">
      <h1>Planos simples, sem surpresa</h1>
      <p class="text-secondary">Comece grátis e pague só quando precisar escalar.</p>

      <div class="precos__toggle" role="group" aria-label="Ciclo de cobrança">
        <button :class="{ 'is-active': !annual }" @click="annual = false">Mensal</button>
        <button :class="{ 'is-active': annual }" @click="annual = true">
          Anual <span class="precos__save">2 meses grátis</span>
        </button>
      </div>
    </header>

    <div class="precos__grid">
      <article
        v-for="p in plans" :key="p.tier"
        class="plan" :class="{ 'plan--popular': p.tier === 'TEAM' }"
      >
        <span v-if="p.tier === 'TEAM'" class="plan__tag">Mais popular</span>
        <h2 class="plan__name">{{ p.name }}</h2>
        <div class="plan__price">
          <span class="plan__amount">{{ priceLabel(p) }}</span>
          <span v-if="p.tier !== 'ENTERPRISE' && p.priceBRL > 0" class="plan__period">/mês</span>
        </div>
        <p v-if="annual && p.priceBRL > 0 && p.tier !== 'ENTERPRISE'" class="plan__billed">cobrado anualmente</p>

        <ul class="plan__features">
          <li v-for="f in p.features" :key="f">{{ f }}</li>
        </ul>

        <UiButton
          block :variant="p.tier === 'TEAM' ? 'primary' : 'secondary'"
          @click="onCta(p.tier)"
        >
          {{ ctaLabel[p.tier] }}
        </UiButton>
      </article>
    </div>

    <p class="precos__marketplace">
      <strong>Marketplace:</strong> 25% de taxa sobre o fee, já incluída — você nunca paga adiantado.
    </p>

    <!-- Tabela comparativa -->
    <div class="precos__compare">
      <button class="precos__compare-toggle" @click="showCompare = !showCompare">
        {{ showCompare ? 'Ocultar comparação' : 'Comparar todos os recursos' }}
      </button>
      <div v-if="showCompare" class="compare-wrap">
        <table class="compare">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Gratuito</th>
              <th>Recruiter</th>
              <th>Team</th>
              <th>Enterprise</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.label">
              <td>{{ row.label }}</td>
              <td v-for="(val, i) in row.values" :key="i">{{ val }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- FAQ -->
    <section class="faq">
      <h2>Perguntas frequentes</h2>
      <details v-for="(item, i) in faq" :key="i" class="faq__item">
        <summary>{{ item.q }}</summary>
        <p>{{ item.a }}</p>
      </details>
    </section>
  </div>
</template>

<style scoped>
.precos { padding: var(--sp-12) 0 var(--sp-16); }
.precos__header { text-align: center; margin-bottom: var(--sp-10); }
.precos__header h1 { font-size: var(--text-36); }
.precos__header > p { margin-top: var(--sp-2); }

.precos__toggle {
  display: inline-flex; gap: 4px; margin-top: var(--sp-6);
  background: var(--ink-100); border-radius: var(--radius-full); padding: 4px;
}
.precos__toggle button {
  border: none; background: transparent; cursor: pointer;
  padding: var(--sp-2) var(--sp-5); border-radius: var(--radius-full);
  font-size: var(--text-14); color: var(--ink-500); display: inline-flex; align-items: center; gap: var(--sp-2);
}
.precos__toggle .is-active { background: var(--white); color: var(--ink-900); box-shadow: var(--shadow-sm); font-weight: 600; }
.precos__save { font-size: var(--text-12); color: var(--brand-700); background: var(--brand-100); padding: 1px var(--sp-2); border-radius: var(--radius-full); }

.precos__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); align-items: stretch; }
.plan {
  position: relative; display: flex; flex-direction: column;
  background: var(--white); border: 1px solid var(--ink-100);
  border-radius: var(--radius-card); padding: var(--sp-6); box-shadow: var(--shadow-sm);
}
.plan--popular { border-color: var(--purple-500); box-shadow: var(--shadow-md); }
.plan__tag {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: var(--purple-500); color: var(--white); font-size: var(--text-12); font-weight: 600;
  padding: 2px var(--sp-3); border-radius: var(--radius-full); white-space: nowrap;
}
.plan__name { font-size: var(--text-18); }
.plan__price { display: flex; align-items: baseline; gap: var(--sp-1); margin-top: var(--sp-3); }
.plan__amount { font-family: var(--font-display); font-size: var(--text-36); font-weight: 700; color: var(--ink-900); font-variant-numeric: tabular-nums; }
.plan__period { color: var(--ink-500); font-size: var(--text-14); }
.plan__billed { font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.plan__features { list-style: none; padding: 0; margin: var(--sp-5) 0; display: flex; flex-direction: column; gap: var(--sp-2); flex: 1; }
.plan__features li { position: relative; padding-left: var(--sp-6); font-size: var(--text-14); color: var(--ink-700); }
.plan__features li::before {
  content: '✓'; position: absolute; left: 0; top: 0;
  color: var(--brand-700); font-weight: 700;
}

.precos__marketplace {
  text-align: center; margin: var(--sp-8) auto 0; max-width: 640px;
  background: var(--ink-100); border-radius: var(--radius-card);
  padding: var(--sp-4) var(--sp-5); font-size: var(--text-14); color: var(--ink-700);
}

.precos__compare { margin-top: var(--sp-12); text-align: center; }
.precos__compare-toggle {
  background: none; border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  padding: var(--sp-3) var(--sp-5); font-size: var(--text-14); font-weight: 600; color: var(--ink-700); cursor: pointer;
}
.precos__compare-toggle:hover { background: var(--ink-100); }
.compare-wrap { overflow-x: auto; margin-top: var(--sp-5); }
.compare { width: 100%; border-collapse: collapse; font-size: var(--text-14); text-align: center; min-width: 560px; }
.compare th, .compare td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.compare th { color: var(--ink-900); font-weight: 600; }
.compare td:first-child, .compare th:first-child { text-align: left; color: var(--ink-700); }

.faq { max-width: 720px; margin: var(--sp-16) auto 0; }
.faq h2 { text-align: center; margin-bottom: var(--sp-6); }
.faq__item { border-bottom: 1px solid var(--ink-100); padding: var(--sp-4) 0; }
.faq__item summary { cursor: pointer; font-weight: 600; color: var(--ink-900); font-size: var(--text-16); list-style: none; }
.faq__item summary::-webkit-details-marker { display: none; }
.faq__item summary::after { content: '+'; float: right; color: var(--ink-500); }
.faq__item[open] summary::after { content: '−'; }
.faq__item p { margin: var(--sp-3) 0 0; color: var(--ink-700); line-height: 1.6; }

@media (max-width: 900px) {
  .precos__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .precos__grid { grid-template-columns: 1fr; }
}
</style>
