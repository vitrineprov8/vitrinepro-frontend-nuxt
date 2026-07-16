<script setup lang="ts">
// A1 — Visão Geral do painel admin (§ADMIN, B12). Página nova: hoje só
// existia a fila de verificações (A2); esta é a primeira tela real do
// workspace Admin em si (Fase 5 do PLANO). KPIs reais de GET /admin/stats.
// Churn e o gráfico de linha 12m (GMV vs MRR) ficam fora — sem série
// histórica no backend ainda (ver CLAUDE.md do backend, seção B12).
definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Visão Geral — Admin' })

const api = useApi()

interface AdminDashboardStats {
  gmvMes: number
  takePlataformaMes: number
  placementsMes: number
  huntersVerificados: number
  vagasAtivas: number
  mrr: number
  disputasAbertas: number
  verificacoesPendentes: number
  cuponsAValidar: number
}
const { data: stats, pending } = await useAsyncData('admin-dashboard-stats', () =>
  api.get<AdminDashboardStats>('/admin/stats').catch(() => null))

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const kpis = computed(() => [
  { label: 'GMV de fees (mês)', value: stats.value ? fmtBRL(stats.value.gmvMes) : 'R$ 0' },
  { label: 'Take da plataforma (mês)', value: stats.value ? fmtBRL(stats.value.takePlataformaMes) : 'R$ 0' },
  { label: 'Placements (mês)', value: String(stats.value?.placementsMes ?? 0) },
  { label: 'Hunters verificados', value: String(stats.value?.huntersVerificados ?? 0) },
  { label: 'Vagas ativas', value: String(stats.value?.vagasAtivas ?? 0) },
  { label: 'MRR', value: stats.value ? fmtBRL(stats.value.mrr) : 'R$ 0' },
])

const filas = computed(() => [
  { label: 'Verificações pendentes', value: stats.value?.verificacoesPendentes ?? 0, to: '/app/admin/verificacoes' },
  { label: 'Disputas abertas', value: stats.value?.disputasAbertas ?? 0, to: null },
  { label: 'Cupons a validar', value: stats.value?.cuponsAValidar ?? 0, to: null },
])
</script>

<template>
  <div class="overview">
    <h1 class="overview__title">Visão geral</h1>

    <div class="overview__kpis">
      <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :loading="pending" />
    </div>

    <section class="overview__filas">
      <h2>Filas</h2>
      <div class="filas">
        <component
          :is="f.to ? 'NuxtLink' : 'div'"
          v-for="f in filas"
          :key="f.label"
          :to="f.to ?? undefined"
          class="filas__item"
          :class="{ 'filas__item--link': f.to }"
        >
          <span class="filas__value tabular">{{ f.value }}</span>
          <span class="filas__label">{{ f.label }}</span>
        </component>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overview__title { font-size: var(--text-22); margin-bottom: var(--sp-6); }
.overview__kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
.overview__filas h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.filas { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.filas__item { display: flex; flex-direction: column; gap: var(--sp-1); background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); text-decoration: none; }
.filas__item--link { cursor: pointer; }
.filas__item--link:hover { border-color: var(--brand-300); }
.filas__value { font-family: var(--font-display); font-size: var(--text-28); font-weight: 700; color: var(--ink-900); }
.filas__label { font-size: var(--text-13); color: var(--ink-500); }
@media (max-width: 900px) {
  .overview__kpis { grid-template-columns: repeat(2, 1fr); }
  .filas { grid-template-columns: 1fr; }
}
/* F16 — em telas bem estreitas (~375-390px) o grid de 2 colunas dos KPIs ainda
   forçava cada card a ~168px, alguns pixels mais largo que o espaço disponível
   (conteúdo interno do card não encolhia o suficiente), causando scroll
   horizontal na página inteira. Empilhando em 1 coluna abaixo de 480px. */
@media (max-width: 480px) {
  .overview__kpis { grid-template-columns: 1fr; }
}
</style>
