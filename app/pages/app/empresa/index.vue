<script setup lang="ts">
// T-E02 — Início do workspace Empresa. Antes era só o placeholder "em
// construção" (F2/B12); agora usa o shell real (useEmpresaWorkspace) e o
// mesmo padrão "Minha mesa" do hunter (app/hunter/index.vue), com links reais
// para as telas novas (T-E03..E09) em vez de CTAs para /precos.
definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Início — Empresa' })

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

const mesa = [
  { texto: 'Crie sua primeira vaga para começar a receber candidatos.', cta: 'Nova vaga', to: '/app/empresa/vagas/nova' },
  { texto: 'Organize seus candidatos no pipeline de cada vaga.', cta: 'Ver minhas vagas', to: '/app/empresa/vagas' },
  { texto: 'Veja hunters trabalhando suas vagas e avalie os que já entregaram.', cta: 'Ver hunters', to: '/app/empresa/hunters' },
]
</script>

<template>
  <div class="inicio">
    <h1 class="inicio__title">Olá, {{ auth.user?.companyName || auth.user?.firstName || 'empresa' }} 👋</h1>

    <div class="inicio__kpis">
      <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :loading="statsPending" />
    </div>

    <div class="inicio__cols">
      <section class="inicio__mesa">
        <h2>Minha mesa</h2>
        <ul class="mesa">
          <li v-for="(m, i) in mesa" :key="i" class="mesa__item">
            <span>{{ m.texto }}</span>
            <UiButton size="sm" variant="secondary" @click="navigateTo(m.to)">{{ m.cta }}</UiButton>
          </li>
        </ul>
      </section>

      <aside class="inicio__side">
        <UiCard>
          <h3 class="inicio__card-title">Sua página pública</h3>
          <p class="inicio__hint">Candidatos e hunters veem sua empresa aqui.</p>
          <UiButton v-if="auth.user?.username" block variant="secondary" @click="navigateTo(`/empresa/${auth.user.username}`)">
            Ver minha página
          </UiButton>
          <UiButton block variant="secondary" class="inicio__upgrade" @click="navigateTo('/app/empresa/pagina')">
            Editar página
          </UiButton>
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
.inicio__hint { font-size: var(--text-13); color: var(--ink-500); margin: var(--sp-2) 0 var(--sp-4); }
.inicio__upgrade { margin-top: var(--sp-3); }
@media (max-width: 900px) {
  .inicio__kpis { grid-template-columns: repeat(2, 1fr); }
  .inicio__cols { grid-template-columns: 1fr; }
}
</style>
