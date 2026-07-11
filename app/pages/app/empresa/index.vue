<script setup lang="ts">
// F2 — placeholder do workspace Empresa (Fase 3 ainda não construída).
// Sem isso, toda conta `isCompany` caía em 404 logo após o login/cadastro.
// B12 (2026-07-07): adicionados os 4 KPIs reais de GET /stats/empresa —
// ainda não há CRUD de vagas/pipeline por aqui, só visibilidade dos números.
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Workspace Empresa' })

const nav = useState<{ label: string, to: string }[]>('workspace-nav')
const label = useState<string>('workspace-label')
nav.value = [{ label: 'Início', to: '/app/empresa' }]
label.value = 'Empresa'

const auth = useAuthStore()
const api = useApi()

interface EmpresaDashboardStats {
  vagasAbertas: number
  candidatosNovos7d: number
  huntersTrabalhando: number
  contratacoesNoAno: number
}
const { data: stats, pending: statsPending } = await useAsyncData('empresa-dashboard-stats', () =>
  api.get<EmpresaDashboardStats>('/stats/empresa').catch(() => null))

const kpis = computed(() => [
  { label: 'Vagas abertas', value: String(stats.value?.vagasAbertas ?? 0) },
  { label: 'Candidatos novos (7d)', value: String(stats.value?.candidatosNovos7d ?? 0) },
  { label: 'Hunters trabalhando', value: String(stats.value?.huntersTrabalhando ?? 0) },
  { label: 'Contratações no ano', value: String(stats.value?.contratacoesNoAno ?? 0) },
])
</script>

<template>
  <div>
    <div class="empresa__kpis">
      <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :loading="statsPending" />
    </div>

    <UiEmptyState
      title="Workspace Empresa em construção"
      description="Estamos terminando as telas de vagas, pipeline e faturamento para contas empresa. Enquanto isso, você pode gerenciar sua página pública ou falar com o time."
    >
      <template #action>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <UiButton v-if="auth.user?.username" variant="secondary" @click="navigateTo(`/empresa/${auth.user.username}`)">
            Ver minha página pública
          </UiButton>
          <UiButton @click="navigateTo('/precos')">Ver planos</UiButton>
        </div>
      </template>
    </UiEmptyState>
  </div>
</template>

<style scoped>
.empresa__kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
@media (max-width: 900px) {
  .empresa__kpis { grid-template-columns: repeat(2, 1fr); }
}
</style>
