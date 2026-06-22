<script setup lang="ts">
// T-H02 — Início "Minha mesa" do hunter. Slots reais (/vagas/me/usage); KPIs/mesa mock (B12).
definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Início — Hunter' })

const api = useApi()
const auth = useAuthStore()

interface Usage { used: number, limit: number, cycleStart: string, cycleEnd: string }
const { data: usage } = await useAsyncData('hunter-usage', () =>
  api.get<Usage>('/vagas/me/usage').catch(() => null))

const slotsLabel = computed(() => {
  const u = usage.value
  if (!u) return '—'
  return u.limit === -1 ? `${u.used} (ilimitado)` : `${u.used}/${u.limit}`
})
const renovaEm = computed(() => usage.value?.cycleEnd
  ? new Date(usage.value.cycleEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  : null)

// KPIs e "minha mesa" — mock até existirem agregações (B12).
const kpis = [
  { label: 'Ganhos no mês', value: 'R$ 0' },
  { label: 'Placements em andamento', value: '0' },
  { label: 'Candidatos em processos', value: '0' },
  { label: 'Indicações aguardando', value: '0' },
]
const mesa = [
  { texto: 'Crie sua primeira vaga para começar a receber candidatos.', cta: 'Nova vaga', to: '/app/hunter/vagas/nova' },
  { texto: 'Organize seus candidatos no pipeline de cada vaga.', cta: 'Ver minhas vagas', to: '/app/hunter/vagas' },
]
</script>

<template>
  <div class="inicio">
    <h1 class="inicio__title">Olá, {{ auth.user?.firstName || 'hunter' }} 👋</h1>

    <!-- KPIs (mock) -->
    <div class="inicio__kpis">
      <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" />
    </div>

    <div class="inicio__cols">
      <!-- Minha mesa -->
      <section class="inicio__mesa">
        <h2>Minha mesa</h2>
        <ul class="mesa">
          <li v-for="(m, i) in mesa" :key="i" class="mesa__item">
            <span>{{ m.texto }}</span>
            <UiButton size="sm" variant="secondary" @click="navigateTo(m.to)">{{ m.cta }}</UiButton>
          </li>
        </ul>
      </section>

      <!-- Lateral: plano/slots -->
      <aside class="inicio__side">
        <UiCard>
          <h3 class="inicio__card-title">Publicações do ciclo</h3>
          <p class="inicio__slots">{{ slotsLabel }}</p>
          <p v-if="renovaEm" class="inicio__renew">Renova em {{ renovaEm }}</p>
          <UiButton block variant="secondary" class="inicio__upgrade" @click="navigateTo('/precos')">Ver planos</UiButton>
        </UiCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.inicio__title { font-size: var(--text-22); margin-bottom: var(--sp-6); }
.inicio__kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
.inicio__cols { display: grid; grid-template-columns: 1fr 320px; gap: var(--sp-6); align-items: start; }
.inicio__mesa h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.mesa { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.mesa__item { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); font-size: var(--text-14); color: var(--ink-700); }
.inicio__card-title { font-size: var(--text-14); color: var(--ink-500); }
.inicio__slots { font-family: var(--font-display); font-size: var(--text-28); font-weight: 700; color: var(--ink-900); margin-top: var(--sp-1); }
.inicio__renew { font-size: var(--text-13); color: var(--ink-500); }
.inicio__upgrade { margin-top: var(--sp-4); }
@media (max-width: 900px) {
  .inicio__kpis { grid-template-columns: repeat(2, 1fr); }
  .inicio__cols { grid-template-columns: 1fr; }
}
</style>
