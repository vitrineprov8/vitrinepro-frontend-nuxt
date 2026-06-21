<script setup lang="ts">
// T02 — Landing para empresas (com calculadora de fee). Spec: design-spec/01 §T02
useSeoMeta({
  title: 'Para empresas — contrate pagando só pelo resultado',
  description: 'Contrate com a força de centenas de headhunters. Publique sua vaga e pague o fee só quando contratar. Garantia de reposição.',
})

// Calculadora (client-side, sem backend).
const salario = ref<number | null>(8000)
const feePct = ref(20) // 15–100% do salário

const feeSugerido = computed(() => {
  const s = salario.value ?? 0
  return Math.round(s * (feePct.value / 100))
})
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const comparativo = [
  { label: 'Custo inicial', consultoria: 'Alto (retainer)', jobboard: 'Mensalidade', vp: 'R$ 0' },
  { label: 'Paga só se contratar', consultoria: 'Nem sempre', jobboard: 'Não', vp: 'Sim' },
  { label: 'Alcance de hunters', consultoria: '1 consultor', jobboard: 'Nenhum', vp: 'Centenas' },
  { label: 'Garantia de reposição', consultoria: 'Às vezes', jobboard: 'Não', vp: 'Sim' },
  { label: 'Tempo até os primeiros perfis', consultoria: 'Semanas', jobboard: 'Você filtra tudo', vp: 'Dias' },
]

const faq = [
  { q: 'Quando eu pago o fee?', a: 'Somente quando você efetiva a contratação de um candidato indicado. Publicar a vaga e receber indicações é grátis.' },
  { q: 'O que é a garantia de reposição?', a: 'Se o profissional contratado sair dentro do período de garantia, os hunters trabalham a reposição sem novo fee.' },
  { q: 'Posso definir quanto pago de fee?', a: 'Sim. Você define o fee da vaga (um percentual do salário). Quanto mais atrativo, mais hunters trabalham sua vaga.' },
  { q: 'Quem são os hunters?', a: 'Recrutadores independentes verificados na plataforma, com perfil público e reputação baseada em placements.' },
]
</script>

<template>
  <div class="pe">
    <!-- HERO -->
    <section class="pe-hero container">
      <div class="pe-hero__copy">
        <h1>Contrate com a força de 100 headhunters — <span class="accent">pague só pelo resultado</span></h1>
        <p class="pe-hero__sub">Publique sua vaga, receba indicações de hunters verificados e pague o fee apenas quando contratar.</p>
        <UiButton size="lg" @click="navigateTo('/cadastro?perfil=empresa')">Publicar minha primeira vaga</UiButton>
      </div>

      <!-- Calculadora -->
      <UiCard class="calc">
        <h3 class="calc__title">Calcule seu fee</h3>
        <UiCurrencyInput v-model="salario" label="Salário da vaga (mensal)" />

        <div class="calc__slider">
          <div class="calc__slider-head">
            <label for="fee-pct">Fee sobre o salário</label>
            <strong>{{ feePct }}%</strong>
          </div>
          <input id="fee-pct" v-model.number="feePct" type="range" min="15" max="100" step="5">
        </div>

        <div class="calc__result">
          <span class="calc__result-label">Fee sugerido</span>
          <span class="calc__result-value">{{ fmtBRL(feeSugerido) }}</span>
          <span class="calc__result-note">Você só paga se contratar.</span>
        </div>
      </UiCard>
    </section>

    <!-- COMO FUNCIONA -->
    <section class="pe-how container">
      <h2>Como funciona</h2>
      <div class="pe-how__grid">
        <UiCard><span class="pe-how__step">1</span><h4>Publique a vaga</h4><p class="text-secondary">Defina o fee. Publicar é grátis.</p></UiCard>
        <UiCard><span class="pe-how__step">2</span><h4>Receba indicações</h4><p class="text-secondary">Hunters verificados trabalham sua vaga e submetem os melhores perfis.</p></UiCard>
        <UiCard><span class="pe-how__step">3</span><h4>Contrate com garantia</h4><p class="text-secondary">Pague o fee só no placement, com garantia de reposição.</p></UiCard>
      </div>
    </section>

    <!-- COMPARATIVO -->
    <section class="pe-cmp container">
      <h2>Por que não uma consultoria tradicional?</h2>
      <div class="pe-cmp__wrap">
        <table class="pe-cmp__table">
          <thead>
            <tr><th></th><th>Consultoria</th><th>Job board</th><th class="is-vp">VitrinePro</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in comparativo" :key="r.label">
              <td>{{ r.label }}</td>
              <td>{{ r.consultoria }}</td>
              <td>{{ r.jobboard }}</td>
              <td class="is-vp">{{ r.vp }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- FAQ -->
    <section class="pe-faq container">
      <h2>Perguntas frequentes</h2>
      <details v-for="(item, i) in faq" :key="i" class="faq__item">
        <summary>{{ item.q }}</summary>
        <p>{{ item.a }}</p>
      </details>
    </section>

    <!-- CTA -->
    <section class="pe-cta">
      <div class="container pe-cta__inner">
        <h2>Pronto para contratar melhor?</h2>
        <UiButton size="lg" variant="secondary" @click="navigateTo('/cadastro?perfil=empresa')">Publicar minha primeira vaga</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.accent { color: var(--brand-600); }

.pe-hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--sp-12); align-items: center; padding: var(--sp-16) var(--sp-6); }
.pe-hero h1 { font-size: var(--text-48); line-height: 1.1; }
.pe-hero__sub { font-size: var(--text-18); color: var(--ink-500); margin: var(--sp-4) 0 var(--sp-8); max-width: 520px; }

.calc__title { font-size: var(--text-18); margin-bottom: var(--sp-4); }
.calc__slider { margin-top: var(--sp-4); }
.calc__slider-head { display: flex; justify-content: space-between; align-items: baseline; font-size: var(--text-14); color: var(--ink-700); margin-bottom: var(--sp-2); }
.calc__slider input[type=range] { width: 100%; accent-color: var(--brand-600); }
.calc__result { margin-top: var(--sp-5); padding-top: var(--sp-4); border-top: 1px solid var(--ink-100); display: flex; flex-direction: column; }
.calc__result-label { font-size: var(--text-13); color: var(--ink-500); }
.calc__result-value { font-family: var(--font-display); font-size: var(--text-36); font-weight: 700; color: var(--brand-700); font-variant-numeric: tabular-nums; }
.calc__result-note { font-size: var(--text-13); color: var(--ink-500); }

.pe-how { padding: var(--sp-12) var(--sp-6); text-align: center; }
.pe-how__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); margin-top: var(--sp-6); text-align: left; }
.pe-how__step { display: grid; place-items: center; width: 32px; height: 32px; margin-bottom: var(--sp-3); border-radius: var(--radius-full); background: var(--brand-100); color: var(--brand-700); font-family: var(--font-display); font-weight: 700; }
.pe-how__grid p { margin-top: var(--sp-1); }

.pe-cmp { padding: var(--sp-12) var(--sp-6); }
.pe-cmp h2 { text-align: center; margin-bottom: var(--sp-6); }
.pe-cmp__wrap { overflow-x: auto; }
.pe-cmp__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); text-align: center; min-width: 560px; }
.pe-cmp__table th, .pe-cmp__table td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.pe-cmp__table td:first-child, .pe-cmp__table th:first-child { text-align: left; color: var(--ink-700); }
.pe-cmp__table .is-vp { background: var(--brand-100); color: var(--brand-700); font-weight: 600; }

.pe-faq { max-width: 720px; padding: var(--sp-12) var(--sp-6); margin: 0 auto; }
.pe-faq h2 { text-align: center; margin-bottom: var(--sp-6); }
.faq__item { border-bottom: 1px solid var(--ink-100); padding: var(--sp-4) 0; }
.faq__item summary { cursor: pointer; font-weight: 600; color: var(--ink-900); font-size: var(--text-16); list-style: none; }
.faq__item summary::-webkit-details-marker { display: none; }
.faq__item summary::after { content: '+'; float: right; color: var(--ink-500); }
.faq__item[open] summary::after { content: '−'; }
.faq__item p { margin: var(--sp-3) 0 0; color: var(--ink-700); line-height: 1.6; }

.pe-cta { background: var(--brand-600); color: var(--white); padding: var(--sp-12) 0; margin-top: var(--sp-8); }
.pe-cta__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-6); }
.pe-cta h2 { color: var(--white); }

@media (max-width: 900px) {
  .pe-hero { grid-template-columns: 1fr; gap: var(--sp-8); padding: var(--sp-12) var(--sp-6); }
  .pe-hero h1 { font-size: var(--text-36); }
  .pe-how__grid { grid-template-columns: 1fr; }
  .pe-cta__inner { flex-direction: column; text-align: center; }
}
</style>
