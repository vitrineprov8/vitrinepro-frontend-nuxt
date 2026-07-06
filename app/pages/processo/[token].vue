<script setup lang="ts">
// T11 — Snapshot público de processo. Backend: GET /public/processo/:token.
// Página limpa (sem nav do app). 410 quando revogado/expirado.
definePageMeta({ layout: false })

interface StageHistory { stage: string, enteredAt: string, byUserName: string, note: string | null }
interface ProcessSnapshot {
  candidate: { name: string, avatarUrl: string | null, profession: string | null }
  vaga: { title: string, segment: string | null, location: string | null, companyName: string | null } | null
  pipelineStage: string
  isRejected: boolean
  generalScore: number | null
  generalNote: string | null
  stageHistory: StageHistory[]
  stageNotes: Record<string, { observacoes: string, nota: number | null, updatedAt: string }>
  appliedAt: string
}

const route = useRoute()
const api = useApi()
const token = computed(() => route.params.token as string)

const { data: snap } = await useAsyncData(`processo-${token.value}`, () =>
  api.get<ProcessSnapshot>(`/public/processo/${token.value}`).catch(() => null))

if (!snap.value && import.meta.server) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 410)
}

function prettyStage(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

// Etapas em ordem cronológica (histórico vem do mais recente → invertemos), únicas.
const stages = computed<string[]>(() => {
  const s = snap.value
  if (!s) return []
  const chrono = [...s.stageHistory].reverse()
  const seen = new Set<string>()
  const list: string[] = []
  for (const e of chrono) if (!seen.has(e.stage)) { seen.add(e.stage); list.push(e.stage) }
  if (!seen.has(s.pipelineStage)) list.push(s.pipelineStage)
  return list
})
const notasList = computed(() => {
  const s = snap.value
  if (!s) return [] as { stage: string, observacoes: string, nota: number | null }[]
  return Object.entries(s.stageNotes)
    .filter(([, v]) => v.observacoes || v.nota != null)
    .map(([stage, v]) => ({ stage, observacoes: v.observacoes, nota: v.nota }))
})

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

useSeoMeta({
  title: () => snap.value ? `Processo seletivo — ${snap.value.vaga?.title ?? 'Vaga'}` : 'Link expirado',
  robots: 'noindex',
})
</script>

<template>
  <div class="proc">
    <!-- 410 -->
    <div v-if="!snap" class="proc__expired">
      <div class="proc__logo">Vitrine<span>Pro</span></div>
      <h1>Link expirado</h1>
      <p>Este link de processo não é mais válido. Peça um novo ao recrutador.</p>
    </div>

    <template v-else>
      <header class="proc__top">
        <div class="proc__logo">Vitrine<span>Pro</span></div>
        <p class="proc__subtitle">
          Processo seletivo — <strong>{{ snap.vaga?.title ?? 'Vaga' }}</strong>
          <span v-if="snap.vaga?.location"> · {{ snap.vaga.location }}</span>
        </p>
        <p v-if="snap.vaga?.companyName" class="proc__company">{{ snap.vaga.companyName }}</p>
      </header>

      <main class="proc__body">
        <!-- Candidato (sem contato) -->
        <UiCard class="proc__candidate">
          <UiAvatar :src="snap.candidate.avatarUrl" :name="snap.candidate.name" size="lg" />
          <div>
            <h2 class="proc__cand-name">{{ snap.candidate.name }}</h2>
            <p v-if="snap.candidate.profession" class="proc__cand-role">{{ snap.candidate.profession }}</p>
            <p class="proc__applied">Candidatura em {{ fmtData(snap.appliedAt) }}</p>
          </div>
          <div class="proc__status">
            <UiBadge v-if="snap.isRejected" variant="danger">Não selecionado</UiBadge>
            <UiBadge v-else variant="success">Em andamento</UiBadge>
          </div>
        </UiCard>

        <!-- Kanban read-only (etapa atual) -->
        <section class="proc__section">
          <h3>Etapa atual</h3>
          <div class="stages">
            <div
              v-for="s in stages" :key="s"
              class="stage" :class="{ 'stage--current': s === snap.pipelineStage }"
            >
              {{ prettyStage(s) }}
            </div>
          </div>
        </section>

        <!-- Score geral -->
        <section v-if="snap.generalScore != null || snap.generalNote" class="proc__section">
          <h3>Avaliação geral</h3>
          <UiCard>
            <p v-if="snap.generalScore != null" class="proc__score">Nota: <strong>{{ snap.generalScore }}</strong></p>
            <p v-if="snap.generalNote" class="proc__note">{{ snap.generalNote }}</p>
          </UiCard>
        </section>

        <!-- Notas compartilhadas por etapa -->
        <section v-if="notasList.length" class="proc__section">
          <h3>Notas por etapa</h3>
          <UiCard v-for="n in notasList" :key="n.stage" class="proc__stage-note">
            <div class="proc__stage-note-head">
              <strong>{{ prettyStage(n.stage) }}</strong>
              <UiBadge v-if="n.nota != null" variant="neutral">Nota {{ n.nota }}</UiBadge>
            </div>
            <p v-if="n.observacoes">{{ n.observacoes }}</p>
          </UiCard>
        </section>

        <!-- Histórico (timeline) -->
        <section v-if="snap.stageHistory.length" class="proc__section">
          <h3>Histórico</h3>
          <ol class="timeline">
            <li v-for="(h, i) in snap.stageHistory" :key="i" class="timeline__item">
              <div class="timeline__dot" />
              <div>
                <p class="timeline__stage">{{ prettyStage(h.stage) }}</p>
                <p class="timeline__meta">{{ fmtData(h.enteredAt) }} · {{ h.byUserName }}</p>
                <p v-if="h.note" class="timeline__note">{{ h.note }}</p>
              </div>
            </li>
          </ol>
        </section>
      </main>

      <footer class="proc__footer">
        Gerado por VitrinePro · Snapshot somente leitura
      </footer>
    </template>
  </div>
</template>

<style scoped>
.proc { max-width: 760px; margin: 0 auto; padding: var(--sp-8) var(--sp-5) var(--sp-16); min-height: 100vh; }
.proc__logo { font-family: var(--font-display); font-size: var(--text-18); font-weight: 700; color: var(--ink-900); }
.proc__logo span { color: var(--brand-600); }

.proc__expired { text-align: center; padding-top: 18vh; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }
.proc__expired p { color: var(--ink-500); max-width: 360px; }

.proc__top { border-bottom: 1px solid var(--ink-100); padding-bottom: var(--sp-4); margin-bottom: var(--sp-6); }
.proc__subtitle { margin-top: var(--sp-2); color: var(--ink-700); font-size: var(--text-16); }
.proc__company { margin-top: var(--sp-1); color: var(--ink-500); font-size: var(--text-13); }

.proc__candidate { display: flex; align-items: center; gap: var(--sp-4); }
.proc__cand-name { font-size: var(--text-18); }
.proc__cand-role { color: var(--ink-500); font-size: var(--text-14); margin-top: 2px; }
.proc__applied { color: var(--ink-500); font-size: var(--text-12); margin-top: var(--sp-1); }
.proc__status { margin-left: auto; }

.proc__section { margin-top: var(--sp-8); }
.proc__section h3 { font-size: var(--text-16); margin-bottom: var(--sp-3); }

.stages { display: flex; gap: var(--sp-2); overflow-x: auto; padding-bottom: var(--sp-2); }
.stage {
  flex: 0 0 auto; padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-full);
  background: var(--ink-100); color: var(--ink-500); font-size: var(--text-13); white-space: nowrap;
}
.stage--current { background: var(--brand-600); color: var(--white); font-weight: 600; }

.proc__score { font-size: var(--text-16); }
.proc__note { color: var(--ink-700); margin-top: var(--sp-2); line-height: 1.5; }

.proc__stage-note { margin-bottom: var(--sp-3); }
.proc__stage-note-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.proc__stage-note p { color: var(--ink-700); line-height: 1.5; }

.timeline { list-style: none; padding: 0; margin: 0; }
.timeline__item { position: relative; padding-left: var(--sp-6); padding-bottom: var(--sp-5); border-left: 2px solid var(--ink-100); }
.timeline__item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline__dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--brand-600); }
.timeline__stage { font-weight: 600; color: var(--ink-900); font-size: var(--text-14); }
.timeline__meta { color: var(--ink-500); font-size: var(--text-12); margin-top: 2px; }
.timeline__note { color: var(--ink-700); font-size: var(--text-14); margin-top: var(--sp-2); line-height: 1.5; }

.proc__footer { margin-top: var(--sp-12); padding-top: var(--sp-5); border-top: 1px solid var(--ink-100); text-align: center; color: var(--ink-500); font-size: var(--text-12); }
</style>
