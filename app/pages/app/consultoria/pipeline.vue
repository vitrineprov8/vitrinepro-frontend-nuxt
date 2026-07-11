<script setup lang="ts">
// T-T04 — Pipeline Geral (Workspace Consultoria). Kanban agregado de TODAS
// as vagas ativas do time, consumindo GET /applications/me-as-team.
//
// Duas simplificações v1 (documentadas em CLAUDE.md):
//  1. Colunas usam o template de pipeline do ATOR autenticado (/me/pipeline-
//     template) — o "pipeline padrão do time" é, na verdade, por usuário no
//     schema atual (mesma ressalva do T-T08). Candidaturas cujo pipelineStage
//     não bate com nenhuma etapa do template do ator caem numa coluna
//     "Outras etapas" (podem ser candidaturas em vagas de outro membro com
//     template diferente).
//  2. Clique no card NÃO abre o Drawer completo (T-H05) — navega para o
//     pipeline daquela vaga (/app/consultoria/vagas/:vagaId), onde o drawer
//     já funciona corretamente com o template do criador da vaga. Reusar o
//     drawer aqui exigiria resolver o template por vaga individualmente
//     (custo alto para o v1 — kanban agregado é sobretudo uma visão gerencial
//     de gargalos, não o lugar de trabalho candidato-a-candidato).
import type { TeamPipelineApplication, TeamPipelineResponse, Company, TeamMember } from '~/types/team'
import type { PipelineStage } from '~/components/PipelineStagesModal.vue'
import type { Vaga, PaginatedResult } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Pipeline Geral' })

const api = useApi()
const toast = useToast()

const { data: template } = await useAsyncData('consultoria-pipeline-geral-template', () =>
  api.get<{ stages: PipelineStage[] }>('/me/pipeline-template').catch(() => null))
const stages = computed<PipelineStage[]>(() => (template.value?.stages ?? []).slice().sort((a, b) => a.order - b.order))

const { data: companies } = await useAsyncData('consultoria-pipeline-geral-companies', () =>
  api.get<Company[]>('/companies').catch(() => []))
const companyOptions = computed(() => [{ value: '', label: 'Todos os clientes' }, ...(companies.value ?? []).map(c => ({ value: c.id, label: c.name }))])

const { data: members } = await useAsyncData('consultoria-pipeline-geral-members', () =>
  api.get<TeamMember[]>('/me/team/members').catch(() => []))
const memberOptions = computed(() => [
  { value: '', label: 'Todos os responsáveis' },
  ...(members.value ?? []).filter(m => m.userId).map(m => ({ value: m.userId as string, label: `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Membro' })),
])

const { data: vagasResp } = await useAsyncData('consultoria-pipeline-geral-vagas', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 200 }).catch(() => null))
const vagaOptions = computed(() => [
  { value: '', label: 'Todas as vagas' },
  ...(vagasResp.value?.data ?? []).map(v => ({ value: v.id, label: v.title })),
])

const sourceOptions = [
  { value: '', label: 'Todas as origens' },
  { value: 'DIRECT', label: 'Direta' },
  { value: 'HUNTER', label: 'Hunter externo' },
]

const filterVagaId = ref('')
const filterCompanyId = ref('')
const filterAssignedToId = ref('')
const filterSource = ref('')

const { data: pipelineResp, pending } = await useAsyncData('consultoria-pipeline-geral', () =>
  api.get<TeamPipelineResponse>('/applications/me-as-team', {
    vagaId: filterVagaId.value || undefined,
    companyId: filterCompanyId.value || undefined,
    assignedToId: filterAssignedToId.value || undefined,
    source: filterSource.value || undefined,
  }).catch((e) => {
    const err = e as { status?: number }
    if (err.status === 403) toast.info('Disponível apenas para workspaces de consultoria (time).')
    return null
  }),
{ watch: [filterVagaId, filterCompanyId, filterAssignedToId, filterSource] })

const items = computed<TeamPipelineApplication[]>(() => pipelineResp.value?.items ?? [])
const stageCounts = computed(() => pipelineResp.value?.stageCounts ?? {})

const knownStageIds = computed(() => new Set(stages.value.map(s => s.id)))
const outrasEtapasIds = computed(() => Object.keys(stageCounts.value).filter(id => !knownStageIds.value.has(id)))

function itemsForStage(stageId: string): TeamPipelineApplication[] {
  return items.value.filter(a => a.pipelineStage === stageId)
}
const itemsOutras = computed(() => items.value.filter(a => outrasEtapasIds.value.includes(a.pipelineStage)))

function irParaVaga(app: TeamPipelineApplication) {
  navigateTo(`/app/consultoria/vagas/${app.vagaId}`)
}

const MAX_VISIBLE = 50
</script>

<template>
  <div class="pg">
    <header class="pg__header">
      <h1>Pipeline Geral</h1>
      <p class="pg__hint">Visão agregada de todas as vagas ativas do time. Clique num card para abrir o pipeline da vaga.</p>
    </header>

    <div class="pg__filters">
      <UiSelect v-model="filterVagaId" :options="vagaOptions" placeholder="Vaga" />
      <UiSelect v-model="filterCompanyId" :options="companyOptions" placeholder="Cliente" />
      <UiSelect v-model="filterAssignedToId" :options="memberOptions" placeholder="Responsável" />
      <UiSelect v-model="filterSource" :options="sourceOptions" placeholder="Origem" />
    </div>

    <p v-if="pending" class="pg__hint">Carregando...</p>

    <UiEmptyState
      v-else-if="!items.length"
      title="Nenhum candidato no pipeline do time"
      description="Assim que candidatos entrarem no pipeline das vagas do time, eles aparecem aqui agrupados por etapa."
    />

    <div v-else class="kanban">
      <div v-for="stage in stages" :key="stage.id" class="kanban__col">
        <div class="kanban__col-head">
          <span class="kanban__dot" :style="{ background: stage.color || 'var(--ink-300)' }" />
          <span class="kanban__col-title">{{ stage.label }}</span>
          <span class="kanban__count">{{ stageCounts[stage.id] ?? 0 }}</span>
        </div>
        <div class="kanban__cards">
          <article
            v-for="app in itemsForStage(stage.id).slice(0, MAX_VISIBLE)" :key="app.id"
            class="kcard" @click="irParaVaga(app)"
          >
            <p class="kcard__vaga">{{ app.vagaTitle }}</p>
            <div class="kcard__top">
              <span class="kcard__name">{{ app.snapshotFullName }}</span>
            </div>
            <div class="kcard__tags">
              <UiBadge v-if="app.company" variant="purple">{{ app.company.name }}</UiBadge>
              <UiBadge v-if="app.source === 'HUNTER'" variant="outline">Hunter</UiBadge>
              <UiBadge v-else variant="neutral">Direta</UiBadge>
            </div>
            <p v-if="app.assignedTo" class="kcard__resp">{{ app.assignedTo.firstName }} {{ app.assignedTo.lastName }}</p>
          </article>
          <p v-if="!itemsForStage(stage.id).length" class="kanban__empty">—</p>
          <p v-if="(stageCounts[stage.id] ?? 0) > MAX_VISIBLE" class="kanban__more">+{{ (stageCounts[stage.id] ?? 0) - MAX_VISIBLE }} — refine os filtros para ver todos</p>
        </div>
      </div>

      <div v-if="outrasEtapasIds.length" class="kanban__col kanban__col--muted">
        <div class="kanban__col-head">
          <span class="kanban__dot" style="background: var(--ink-300)" />
          <span class="kanban__col-title">Outras etapas</span>
          <span class="kanban__count">{{ itemsOutras.length }}</span>
        </div>
        <div class="kanban__cards">
          <article v-for="app in itemsOutras.slice(0, MAX_VISIBLE)" :key="app.id" class="kcard" @click="irParaVaga(app)">
            <p class="kcard__vaga">{{ app.vagaTitle }}</p>
            <div class="kcard__top"><span class="kcard__name">{{ app.snapshotFullName }}</span></div>
            <p class="kcard__stage-raw">{{ app.pipelineStage }}</p>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg__header h1 { font-size: var(--text-22); }
.pg__hint { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.pg__filters { display: flex; gap: var(--sp-3); margin: var(--sp-5) 0; flex-wrap: wrap; }
.pg__filters > * { min-width: 180px; }
.kanban { display: flex; gap: var(--sp-3); overflow-x: auto; padding-bottom: var(--sp-4); align-items: flex-start; }
.kanban__col { flex: 0 0 260px; background: var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-3); min-height: 120px; }
.kanban__col--muted { background: var(--ink-100); opacity: 0.85; }
.kanban__col-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.kanban__dot { width: 10px; height: 10px; border-radius: var(--radius-full); }
.kanban__col-title { font-size: var(--text-13); font-weight: 600; color: var(--ink-700); flex: 1; }
.kanban__count { font-size: var(--text-12); color: var(--ink-500); background: var(--white); border-radius: var(--radius-full); padding: 0 var(--sp-2); }
.kanban__cards { display: flex; flex-direction: column; gap: var(--sp-2); min-height: 40px; }
.kanban__empty { text-align: center; color: var(--ink-300); font-size: var(--text-13); padding: var(--sp-3) 0; }
.kanban__more { text-align: center; color: var(--ink-500); font-size: var(--text-12); padding: var(--sp-2) 0; }
.kcard { background: var(--white); border-radius: var(--radius-input); padding: var(--sp-3); box-shadow: var(--shadow-sm); cursor: pointer; }
.kcard:hover { box-shadow: var(--shadow-md); }
.kcard__vaga { font-size: var(--text-11); color: var(--ink-500); margin-bottom: var(--sp-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kcard__top { display: flex; align-items: center; gap: var(--sp-2); }
.kcard__name { font-size: var(--text-14); font-weight: 600; color: var(--ink-900); }
.kcard__tags { display: flex; gap: var(--sp-1); margin-top: var(--sp-2); flex-wrap: wrap; }
.kcard__resp { font-size: var(--text-11); color: var(--ink-500); margin-top: var(--sp-2); }
.kcard__stage-raw { font-size: var(--text-11); color: var(--ink-300); font-style: italic; }
</style>
