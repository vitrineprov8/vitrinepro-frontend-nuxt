<script setup lang="ts">
// T-C02 — Início do workspace Candidato.
import type { MyApplication, Vaga, PaginatedResult, CV } from '~/types/vaga'
import type { ConsentRequest } from '~/components/candidato/ConsentModal.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Início — Candidato' })

const api = useApi()
const auth = useAuthStore()
const route = useRoute()

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

// ── KPIs (T-C02, GET /stats/candidato) ──────────────────────────────────────
interface CandidatoDashboardStats {
  candidaturasAtivas: number
  vagasSalvas: number
  visualizacoesPerfil7d: number | null
}
const { data: stats, pending: statsPending } = await useAsyncData('candidato-dashboard-stats', () =>
  api.get<CandidatoDashboardStats>('/stats/candidato').catch(() => null))

const kpis = computed(() => [
  { label: 'Candidaturas ativas', value: String(stats.value?.candidaturasAtivas ?? 0) },
  { label: 'Vagas salvas', value: String(stats.value?.vagasSalvas ?? 0) },
  { label: 'Visualizações do perfil (7d)', value: stats.value?.visualizacoesPerfil7d != null ? String(stats.value.visualizacoesPerfil7d) : '—' },
])

// ── Completude do perfil (para PerfilCompletionCard + wizard) ───────────────
const { data: cvs } = await useAsyncData('candidato-cvs-inicio', () => api.get<CV[]>('/cv').catch(() => []))
interface SavedFilterLite { id: string, isDefault: boolean, filters?: Record<string, unknown> }
const { data: savedFilters } = await useAsyncData('candidato-saved-filters-inicio', () =>
  api.get<SavedFilterLite[]>('/me/saved-filters').catch(() => []))

const step1Done = computed(() => !!(auth.user?.profession && auth.user?.location))
const step2Done = computed(() => (cvs.value?.length ?? 0) > 0)
const step3Done = computed(() => !!(auth.user?.phone && auth.user?.socialLinks?.linkedin))
const step4Done = computed(() => (savedFilters.value ?? []).some(f => f.isDefault))

const completionItems = computed(() => [
  { label: 'Profissão e cidade', done: step1Done.value, step: 0 },
  { label: 'Currículo', done: step2Done.value, step: 1 },
  { label: 'LinkedIn e telefone', done: step3Done.value, step: 2 },
  { label: 'Preferências do Radar', done: step4Done.value, step: 3 },
])
const completedCount = computed(() => completionItems.value.filter(i => i.done).length)
const completionPct = computed(() => Math.round((completedCount.value / 4) * 100))
const isBrandNew = computed(() => completedCount.value === 0)

// ── Wizard (T-C01) ───────────────────────────────────────────────────────────
const wizardOpen = ref(false)
const wizardStartStep = ref(0)
function openWizard(step = 0) {
  wizardStartStep.value = step
  wizardOpen.value = true
}
function onWizardFinished() {
  refreshNuxtData('candidato-cvs-inicio')
  refreshNuxtData('candidato-saved-filters-inicio')
}
// Não abrir o wizard por cima quando a página foi acessada via link de consentimento LGPD.
onMounted(() => {
  if (route.query.consentId) return
  const dismissed = import.meta.client && localStorage.getItem('candidato_onboarding_dismissed') === '1'
  if (isBrandNew.value && !dismissed) openWizard(0)
})
function closeWizard() {
  wizardOpen.value = false
  if (import.meta.client) localStorage.setItem('candidato_onboarding_dismissed', '1')
}

// ── Modal de Consentimento LGPD (via notificação, T-C09/N) ──────────────────
const consentModalOpen = ref(false)
const consentRequest = ref<ConsentRequest | null>(null)
onMounted(async () => {
  const consentId = route.query.consentId as string | undefined
  if (!consentId) return
  try {
    const list = await api.get<ConsentRequest[]>('/me/consent-requests')
    const match = list.find(r => r.id === consentId)
    if (match && match.status === 'PENDING') {
      consentRequest.value = match
      consentModalOpen.value = true
    }
  }
  catch { /* ignora — link pode estar expirado/inválido */ }
})
function closeConsentModal() {
  consentModalOpen.value = false
  navigateTo('/app/candidato', { replace: true })
}

// ── Vagas para você (preview do Radar) ──────────────────────────────────────
const defaultFilter = computed(() => (savedFilters.value ?? []).find(f => f.isDefault))
const { data: vagasPreview, pending: vagasPending } = await useAsyncData('candidato-vagas-preview', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/radar', {
    limit: 4,
    segment: defaultFilter.value?.filters?.segment,
    workMode: defaultFilter.value?.filters?.workMode,
  }).catch(() => null))
const vagasParaVoce = computed(() => vagasPreview.value?.data ?? [])

// ── Atividade recente (timeline de mudanças de etapa) ───────────────────────
const { data: applications } = await useAsyncData('candidato-applications-inicio', () =>
  api.get<MyApplication[]>('/me/applications').catch(() => []))

interface ActivityItem { key: string, text: string, date: Date }
const activity = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = []
  for (const app of applications.value ?? []) {
    const hist = app.stageHistory ?? []
    const last = hist[hist.length - 1]
    if (!last) continue
    items.push({
      key: `${app.id}-${last.stage}`,
      text: `Sua candidatura em ${app.vaga?.title ?? 'uma vaga'} está em "${last.stage}"`,
      date: new Date(last.enteredAt),
    })
  }
  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6)
})

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `há ${mins || 1}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}
</script>

<template>
  <div class="inicio">
    <CandidatoOnboardingWizard
      :open="wizardOpen" :start-step="wizardStartStep"
      @close="closeWizard" @finished="onWizardFinished"
    />
    <CandidatoConsentModal :open="consentModalOpen" :request="consentRequest" @close="closeConsentModal" @decided="closeConsentModal" />

    <!-- Empty state: usuário totalmente novo -->
    <UiEmptyState
      v-if="isBrandNew && !wizardOpen"
      title="Configure seu Radar"
      description="Conte um pouco sobre você para começarmos a te mostrar vagas relevantes."
    >
      <template #action>
        <UiButton @click="openWizard(0)">Configurar agora</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <div class="inicio__head">
        <h1 class="inicio__title">{{ greeting }}, {{ auth.user?.firstName || 'candidato' }} 👋</h1>

        <UiCard
          v-if="completedCount < 4" class="inicio__completion" clickable
          @click="openWizard(completionItems.find(i => !i.done)?.step ?? 0)"
        >
          <div class="completion__ring" :style="{ '--pct': completionPct }">
            <span>{{ completionPct }}%</span>
          </div>
          <div class="completion__body">
            <h3>Complete seu perfil ({{ completedCount }}/4)</h3>
            <ul class="completion__list">
              <li v-for="item in completionItems" :key="item.label" :class="{ 'completion__item--done': item.done }">
                <span v-if="item.done">✓</span><span v-else>○</span> {{ item.label }}
              </li>
            </ul>
          </div>
        </UiCard>
      </div>

      <!-- KPIs -->
      <div class="inicio__kpis">
        <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :loading="statsPending" />
      </div>

      <!-- Vagas para você -->
      <section class="inicio__section">
        <div class="inicio__section-head">
          <h2>Vagas para você</h2>
          <NuxtLink to="/app/candidato/radar" class="inicio__see-all">Ver todas</NuxtLink>
        </div>
        <div v-if="vagasPending" class="inicio__vagas-grid">
          <div v-for="n in 4" :key="n" class="skeleton inicio__vaga-skel" />
        </div>
        <div v-else-if="vagasParaVoce.length" class="inicio__vagas-grid">
          <VagaCard v-for="v in vagasParaVoce" :key="v.id" :vaga="v" />
        </div>
        <UiEmptyState v-else title="Nenhuma vaga encontrada" description="Ajuste suas preferências no Radar para ver mais vagas." />
      </section>

      <!-- Atividade recente -->
      <section class="inicio__section">
        <h2>Atividade recente</h2>
        <ul v-if="activity.length" class="activity">
          <li v-for="a in activity" :key="a.key" class="activity__item">
            <span class="activity__text">{{ a.text }}</span>
            <span class="activity__time">{{ timeAgo(a.date) }}</span>
          </li>
        </ul>
        <p v-else class="text-secondary">Nenhuma atividade ainda.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.inicio__head { display: flex; flex-direction: column; gap: var(--sp-4); margin-bottom: var(--sp-6); }
.inicio__title { font-size: var(--text-22); }
.inicio__completion { display: flex; align-items: center; gap: var(--sp-5); cursor: pointer; }
.completion__ring {
  --pct: 0;
  width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: conic-gradient(var(--brand-600) calc(var(--pct) * 1%), var(--ink-100) 0);
  font-weight: 700; font-size: var(--text-13); color: var(--ink-900); position: relative;
}
.completion__ring::before {
  content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--white);
}
.completion__ring span { position: relative; z-index: 1; }
.completion__body h3 { font-size: var(--text-15); margin-bottom: var(--sp-2); }
.completion__list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-4); font-size: var(--text-13); color: var(--ink-500); }
.completion__item--done { color: var(--brand-700); }
.inicio__kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-8); }
.inicio__section { margin-bottom: var(--sp-8); }
.inicio__section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-4); }
.inicio__section h2 { font-size: var(--text-18); margin-bottom: var(--sp-4); }
.inicio__section-head h2 { margin-bottom: 0; }
.inicio__see-all { font-size: var(--text-13); color: var(--brand-700); font-weight: 600; text-decoration: none; }
.inicio__vagas-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
.inicio__vaga-skel { height: 180px; border-radius: var(--radius-card); }
.activity { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-1); }
.activity__item {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4);
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card);
  padding: var(--sp-3) var(--sp-4); font-size: var(--text-14); color: var(--ink-700);
}
.activity__time { font-size: var(--text-12); color: var(--ink-500); white-space: nowrap; }
@media (max-width: 1100px) {
  .inicio__kpis { grid-template-columns: repeat(3, 1fr); }
  .inicio__vagas-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .inicio__kpis { grid-template-columns: 1fr; }
  .inicio__vagas-grid { grid-template-columns: 1fr; }
  .inicio__completion { flex-direction: column; align-items: flex-start; }
}
</style>
