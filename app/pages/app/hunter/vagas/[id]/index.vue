<script setup lang="ts">
// T-H05 — Pipeline da vaga (kanban). Backend: /me/pipeline-template + /vagas/:id/applications + PATCH status.
import type { Vaga, PaginatedResult } from '~/types/vaga'
import type { PipelineStage } from '~/components/PipelineStagesModal.vue'
import type { Application } from '~/components/CandidateDrawer.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()

const route = useRoute()
const api = useApi()
const toast = useToast()
const vagaId = route.params.id as string

// Vaga (header) — buscada na lista do hunter.
const { data: vaga } = await useAsyncData(`pipe-vaga-${vagaId}`, async () => {
  const list = await api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 100 }).catch(() => null)
  return list?.data.find(v => v.id === vagaId) ?? null
})

// Template (colunas).
const { data: template } = await useAsyncData('pipe-template', () =>
  api.get<{ stages: PipelineStage[] }>('/me/pipeline-template').catch(() => null))
const stages = computed<PipelineStage[]>(() => (template.value?.stages ?? []).slice().sort((a, b) => a.order - b.order))

// Candidaturas.
const { data: appsResp, refresh } = await useAsyncData(`pipe-apps-${vagaId}`, () =>
  api.get<Application[]>(`/vagas/${vagaId}/applications`).catch(() => null))
const apps = computed<Application[]>(() => appsResp.value ?? [])

useSeoMeta({ title: () => vaga.value ? `Pipeline — ${vaga.value.title}` : 'Pipeline' })

function appsForStage(stage: PipelineStage): Application[] {
  if (stage.isRejected) return apps.value.filter(a => a.isRejected)
  return apps.value.filter(a => !a.isRejected && a.pipelineStage === stage.id)
}

const isClosed = computed(() => vaga.value?.status === 'CLOSED')
const isDraft = computed(() => vaga.value?.status === 'DRAFT')
const publicada = computed(() => {
  const base = vaga.value?.publishedAt ?? vaga.value?.createdAt
  if (!base) return null
  const d = Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000)
  return d <= 0 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`
})

// Drag & drop
const draggedId = ref<string | null>(null)
function onDragStart(id: string) { if (!isClosed.value) draggedId.value = id }
async function onDrop(stage: PipelineStage) {
  const id = draggedId.value
  draggedId.value = null
  if (!id || isClosed.value) return
  const app = apps.value.find(a => a.id === id)
  if (!app) return
  const targetRejected = !!stage.isRejected
  if (app.pipelineStage === stage.id && app.isRejected === targetRejected) return
  // otimista
  const prev = { stage: app.pipelineStage, rejected: app.isRejected }
  app.pipelineStage = targetRejected ? 'rejected' : stage.id
  app.isRejected = targetRejected
  try {
    await api.patch(`/applications/${id}/status`, { pipelineStage: app.pipelineStage, isRejected: targetRejected })
  }
  catch {
    app.pipelineStage = prev.stage; app.isRejected = prev.rejected
    toast.error('Não foi possível mover o candidato.')
  }
}

// Drawer + modal
const drawerApp = ref<Application | null>(null)
const stagesModalOpen = ref(false)
function openCard(app: Application) { drawerApp.value = app }
function onStagesSaved(newStages: PipelineStage[]) {
  if (template.value) template.value.stages = newStages
}
</script>

<template>
  <div class="pipe">
    <!-- Header -->
    <header class="pipe__header">
      <div class="pipe__head-left">
        <NuxtLink to="/app/hunter/vagas" class="pipe__back">← Minhas vagas</NuxtLink>
        <h1>{{ vaga?.title || 'Vaga' }}</h1>
        <div class="pipe__pills">
          <UiBadge :variant="vaga?.status === 'PUBLISHED' ? 'success' : vaga?.status === 'DRAFT' ? 'neutral' : 'warning'">
            {{ vaga?.status === 'PUBLISHED' ? 'Publicada' : vaga?.status === 'DRAFT' ? 'Rascunho' : 'Encerrada' }}
          </UiBadge>
          <span class="pipe__pill">{{ apps.length }} candidato{{ apps.length === 1 ? '' : 's' }}</span>
          <span v-if="publicada" class="pipe__pill">publicada {{ publicada }}</span>
        </div>
      </div>
      <div class="pipe__head-actions">
        <UiButton variant="secondary" size="sm" @click="stagesModalOpen = true">Configurar etapas</UiButton>
        <UiButton variant="secondary" size="sm" @click="navigateTo(`/app/hunter/vagas/${vagaId}/editar`)">Editar</UiButton>
      </div>
    </header>

    <div v-if="isDraft" class="pipe__banner">Vaga não publicada — candidatos só via adição manual.</div>
    <div v-else-if="isClosed" class="pipe__banner pipe__banner--muted">Vaga encerrada — pipeline somente leitura.</div>

    <!-- Kanban -->
    <div class="kanban">
      <div
        v-for="stage in stages" :key="stage.id"
        class="kanban__col" :class="{ 'kanban__col--rejected': stage.isRejected }"
        @dragover.prevent @drop="onDrop(stage)"
      >
        <div class="kanban__col-head">
          <span class="kanban__dot" :style="{ background: stage.color || (stage.isRejected ? 'var(--red-500)' : 'var(--ink-300)') }" />
          <span class="kanban__col-title">{{ stage.label }}</span>
          <span class="kanban__count">{{ appsForStage(stage).length }}</span>
        </div>

        <div class="kanban__cards">
          <article
            v-for="app in appsForStage(stage)" :key="app.id"
            class="kcard" :draggable="!isClosed" :class="{ 'kcard--rejected': app.isRejected }"
            @dragstart="onDragStart(app.id)"
            @click="openCard(app)"
          >
            <div class="kcard__top">
              <UiAvatar :src="app.user?.avatarUrl ?? null" :name="app.snapshotFullName" size="sm" />
              <span class="kcard__name">{{ app.snapshotFullName }}</span>
            </div>
            <div class="kcard__tags">
              <!-- Bug corrigido: badge de origem estava fixo em "Direta" pra
                   todo mundo, ignorando app.source (mesma info que o
                   CandidateDrawer já mostrava certo com "Indicado por hunter"). -->
              <UiBadge v-if="app.source === 'HUNTER'" variant="outline">Indicado por hunter</UiBadge>
              <UiBadge v-else variant="neutral">Direta</UiBadge>
              <UiBadge v-if="app.cv" variant="outline">CV</UiBadge>
            </div>
          </article>

          <p v-if="!appsForStage(stage).length" class="kanban__empty">—</p>
        </div>
      </div>
    </div>

    <CandidateDrawer
      :open="!!drawerApp" :application="drawerApp" :stages="stages" :vaga="vaga"
      @close="drawerApp = null" @changed="refresh"
    />
    <PipelineStagesModal
      :open="stagesModalOpen" :stages="stages"
      @close="stagesModalOpen = false" @saved="onStagesSaved"
    />
  </div>
</template>

<style scoped>
.pipe__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; }
.pipe__back { font-size: var(--text-13); color: var(--ink-500); }
.pipe__header h1 { font-size: var(--text-22); margin-top: var(--sp-1); }
.pipe__pills { display: flex; align-items: center; gap: var(--sp-2); margin-top: var(--sp-2); flex-wrap: wrap; }
.pipe__pill { font-size: var(--text-13); color: var(--ink-500); }
.pipe__head-actions { display: flex; gap: var(--sp-2); }
.pipe__banner { margin: var(--sp-4) 0; padding: var(--sp-3) var(--sp-4); background: var(--amber-100); color: #92400E; border-radius: var(--radius-input); font-size: var(--text-13); }
.pipe__banner--muted { background: var(--ink-100); color: var(--ink-500); }

.kanban { display: flex; gap: var(--sp-3); overflow-x: auto; padding: var(--sp-5) 0 var(--sp-4); align-items: flex-start; }
.kanban__col { flex: 0 0 260px; background: var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-3); min-height: 120px; }
.kanban__col--rejected { background: var(--red-100); }
.kanban__col-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.kanban__dot { width: 10px; height: 10px; border-radius: var(--radius-full); }
.kanban__col-title { font-size: var(--text-13); font-weight: 600; color: var(--ink-700); flex: 1; }
.kanban__count { font-size: var(--text-12); color: var(--ink-500); background: var(--white); border-radius: var(--radius-full); padding: 0 var(--sp-2); }
.kanban__cards { display: flex; flex-direction: column; gap: var(--sp-2); min-height: 40px; }
.kanban__empty { text-align: center; color: var(--ink-300); font-size: var(--text-13); padding: var(--sp-3) 0; }

.kcard { background: var(--white); border-radius: var(--radius-input); padding: var(--sp-3); box-shadow: var(--shadow-sm); cursor: pointer; }
.kcard:hover { box-shadow: var(--shadow-md); }
.kcard[draggable=true] { cursor: grab; }
.kcard--rejected { opacity: 0.7; }
.kcard__top { display: flex; align-items: center; gap: var(--sp-2); }
.kcard__name { font-size: var(--text-14); font-weight: 600; color: var(--ink-900); }
.kcard__tags { display: flex; gap: var(--sp-1); margin-top: var(--sp-2); }
</style>
