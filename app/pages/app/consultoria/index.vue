<script setup lang="ts">
// T-T02 — Início do Workspace Consultoria. KPIs + Pipeline Overview + feed de
// atividade do time, consumindo GET /stats/consultoria (B12, já existia pronto
// no backend) + GET /vagas/me/usage (slots de publicação, mesmo endpoint do
// Empresa). "Vagas que precisam de atenção" é uma aproximação v1 (deadline
// próximo ou zero candidatos) — os critérios exatos do design-spec ("sem
// movimento >7d", "candidatos novos sem triagem") exigiriam rastrear estado
// de leitura por candidatura, que não existe no schema hoje.
import { AlertTriangle, ArrowRight, Building2 } from 'lucide-vue-next'
import type { ConsultoriaDashboardStats } from '~/types/team'
import type { PaginatedResult, Vaga } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Início — Consultoria' })

const api = useApi()
const auth = useAuthStore()

interface Usage { used: number, limit: number, cycleEnd: string }

const { data: stats, pending: statsPending } = await useAsyncData('consultoria-dashboard-stats', () =>
  api.get<ConsultoriaDashboardStats>('/stats/consultoria').catch(() => null))
const { data: usage } = await useAsyncData('consultoria-vagas-usage', () =>
  api.get<Usage>('/vagas/me/usage').catch(() => null))
const { data: members } = await useAsyncData('consultoria-members-mini', () =>
  api.get<Array<{ id: string, userId: string | null, user: { id: string, firstName: string | null, lastName: string | null } | null }>>('/me/team/members').catch(() => []))
const { data: vagasResp } = await useAsyncData('consultoria-atencao-vagas', () =>
  api.get<PaginatedResult<Vaga & { applicationsCount?: number }>>('/vagas/me', { status: 'PUBLISHED', limit: 100 }).catch(() => null))

const slotsLabel = computed(() => {
  const u = usage.value
  if (!u) return null
  return u.limit === -1 ? `${u.used} (ilimitado)` : `${u.used}/${u.limit}`
})
const slotsPercent = computed(() => {
  const u = usage.value
  if (!u || u.limit === -1 || u.limit === 0) return 0
  return Math.min(100, Math.round((u.used / u.limit) * 100))
})

const kpis = computed(() => [
  { label: 'Vagas ativas', value: String(stats.value?.vagasAtivas ?? 0) },
  { label: 'Candidatos em processo', value: String(stats.value?.candidatosEmProcesso ?? 0) },
  { label: 'Placements no mês', value: String(stats.value?.placementsNoMes ?? 0) },
  { label: 'Receita do mês', value: formatBRL(stats.value?.receitaDoMes ?? 0) },
])

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const pipelineMax = computed(() => Math.max(1, ...(stats.value?.pipelineOverview.map(p => p.count) ?? [1])))

const memberNameById = computed(() => {
  const map = new Map<string, string>()
  for (const m of members.value ?? []) {
    if (m.userId && m.user) map.set(m.userId, `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || 'Membro')
  }
  return map
})

function tempoAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'há 1 dia' : `há ${d} dias`
}

const vagasAtencao = computed(() => {
  const vagas = vagasResp.value?.data ?? []
  const now = Date.now()
  return vagas
    .filter((v) => {
      const deadlineProximo = !!v.deadline && new Date(v.deadline).getTime() - now <= 7 * 24 * 60 * 60 * 1000
      const semCandidatos = (v.applicationsCount ?? 0) === 0
      return deadlineProximo || semCandidatos
    })
    .slice(0, 5)
})
</script>

<template>
  <div class="inicio">
    <h1 class="inicio__title">Olá, {{ auth.user?.firstName || 'time' }} 👋</h1>

    <div class="inicio__kpis">
      <UiKpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :loading="statsPending" />
      <UiCard class="kpi kpi--slots">
        <div class="kpi__header"><span class="kpi__label">Slots de publicação</span></div>
        <p class="kpi__value tabular">{{ slotsLabel ?? '—' }}</p>
        <div v-if="usage && usage.limit !== -1" class="slots__bar">
          <div class="slots__fill" :class="{ 'slots__fill--danger': slotsPercent > 90 }" :style="{ width: `${slotsPercent}%` }" />
        </div>
      </UiCard>
    </div>

    <div class="inicio__cols">
      <section class="inicio__pipeline">
        <h2>Pipeline Overview</h2>
        <UiCard>
          <p v-if="statsPending" class="inicio__hint">Carregando...</p>
          <UiEmptyState
            v-else-if="!stats?.pipelineOverview.length"
            title="Nenhum candidato em processo ainda"
            description="Assim que candidatos entrarem no pipeline das vagas do time, o resumo por etapa aparece aqui."
          />
          <ul v-else class="pipeline">
            <li v-for="p in stats.pipelineOverview" :key="p.stage" class="pipeline__row">
              <span class="pipeline__stage">{{ p.stage }}</span>
              <div class="pipeline__track">
                <div class="pipeline__fill" :style="{ width: `${(p.count / pipelineMax) * 100}%` }" />
              </div>
              <span class="pipeline__count tabular">{{ p.count }}</span>
            </li>
          </ul>
        </UiCard>

        <h2 class="inicio__section-title">Vagas que precisam de atenção</h2>
        <UiCard>
          <UiEmptyState
            v-if="!vagasAtencao.length"
            title="Tudo em dia"
            description="Nenhuma vaga com prazo próximo ou sem candidatos no momento."
          />
          <ul v-else class="atencao">
            <li v-for="v in vagasAtencao" :key="v.id" class="atencao__item">
              <AlertTriangle :size="16" class="atencao__icon" />
              <div class="atencao__body">
                <NuxtLink :to="`/app/consultoria/vagas/${v.id}`" class="atencao__title">{{ v.title }}</NuxtLink>
                <p class="atencao__hint">
                  <span v-if="v.deadline">Prazo em {{ new Date(v.deadline).toLocaleDateString('pt-BR') }}</span>
                  <span v-if="(v.applicationsCount ?? 0) === 0"> · sem candidatos ainda</span>
                </p>
              </div>
              <ArrowRight :size="16" class="atencao__arrow" />
            </li>
          </ul>
        </UiCard>
      </section>

      <aside class="inicio__side">
        <h2>Atividade recente</h2>
        <UiCard>
          <p v-if="statsPending" class="inicio__hint">Carregando...</p>
          <UiEmptyState
            v-else-if="!stats?.atividadeRecente.length"
            :icon="Building2"
            title="Sem atividade ainda"
            description="Movimentações do time no pipeline aparecem aqui."
          />
          <ul v-else class="feed">
            <li v-for="a in stats.atividadeRecente" :key="a.applicationId + a.enteredAt" class="feed__item">
              <span class="feed__dot" />
              <div class="feed__body">
                <p class="feed__text">
                  <strong>{{ memberNameById.get(a.byUserId) ?? 'Membro do time' }}</strong>
                  moveu um candidato para <strong>{{ a.stage }}</strong>
                </p>
                <p class="feed__time">{{ tempoAtras(a.enteredAt) }}</p>
              </div>
            </li>
          </ul>
        </UiCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.inicio__title { font-size: var(--text-22); margin-bottom: var(--sp-6); }
.inicio__kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
.kpi--slots { display: flex; flex-direction: column; gap: var(--sp-2); }
.slots__bar { height: 6px; border-radius: var(--radius-full); background: var(--ink-100); overflow: hidden; }
.slots__fill { height: 100%; background: var(--brand-600); border-radius: var(--radius-full); }
.slots__fill--danger { background: var(--red-500); }
.inicio__cols { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-6); align-items: start; }
.inicio__pipeline h2, .inicio__side h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.inicio__section-title { margin-top: var(--sp-6); }
.inicio__hint { font-size: var(--text-13); color: var(--ink-500); }
.pipeline { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.pipeline__row { display: grid; grid-template-columns: 140px 1fr 32px; align-items: center; gap: var(--sp-3); }
.pipeline__stage { font-size: var(--text-13); color: var(--ink-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pipeline__track { height: 10px; border-radius: var(--radius-full); background: var(--ink-100); overflow: hidden; }
.pipeline__fill { height: 100%; background: var(--purple-500); border-radius: var(--radius-full); }
.pipeline__count { font-size: var(--text-13); color: var(--ink-500); text-align: right; }
.atencao { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.atencao__item { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2) 0; border-bottom: 1px solid var(--ink-100); }
.atencao__item:last-child { border-bottom: none; }
.atencao__icon { color: var(--amber-500, #F59E0B); flex-shrink: 0; }
.atencao__body { flex: 1; min-width: 0; }
.atencao__title { font-size: var(--text-14); font-weight: 600; color: var(--ink-900); }
.atencao__hint { font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.atencao__arrow { color: var(--ink-300); flex-shrink: 0; }
.feed { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.feed__item { display: flex; gap: var(--sp-2); }
.feed__dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--purple-500); margin-top: 6px; flex-shrink: 0; }
.feed__text { font-size: var(--text-13); color: var(--ink-700); }
.feed__time { font-size: var(--text-12); color: var(--ink-300); margin-top: 2px; }
@media (max-width: 1100px) {
  .inicio__kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .inicio__kpis { grid-template-columns: repeat(2, 1fr); }
  .inicio__cols { grid-template-columns: 1fr; }
}
</style>
