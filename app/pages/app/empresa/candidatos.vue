<script setup lang="ts">
// T-E05 — Candidatos (cross-vaga, workspace Empresa).
// Dados reais: GET /applications/me-as-owner (+ /export para CSV).
// Escopo: só vagas com createdById = actor (contas empresa não usam
// delegação de time, diferente do hunter/B15).
import type { Vaga, PaginatedResult } from '~/types/vaga'
import type { PipelineStage } from '~/components/PipelineStagesModal.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Candidatos' })

const api = useApi()
const toast = useToast()

interface OwnerApplicationRow {
  id: string
  vagaId: string
  vagaTitle: string | null
  vagaSlug: string | null
  source: 'DIRECT' | 'HUNTER'
  pipelineStage: string
  isRejected: boolean
  snapshotFullName: string
  snapshotEmail: string | null
  snapshotPhone: string | null
  snapshotLocation: string | null
  contactMasked: boolean
  generalScore: number | null
  createdAt: string
}

const q = ref('')
const vagaId = ref<string | null>(null)
const source = ref<string | null>(null)
const isRejected = ref<string | null>(null)
const pipelineStage = ref<string | null>(null)
const page = ref(1)

// Vagas do próprio dono, para popular o filtro.
const { data: vagasResp } = await useAsyncData('empresa-candidatos-vagas', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 100 }).catch(() => null))
const vagaOptions = computed(() => (vagasResp.value?.data ?? []).map(v => ({ value: v.id, label: v.title })))

// Etapas (template compartilhado do dono) para labels e filtro.
const { data: template } = await useAsyncData('empresa-candidatos-template', () =>
  api.get<{ stages: PipelineStage[] }>('/me/pipeline-template').catch(() => null))
const stages = computed<PipelineStage[]>(() => (template.value?.stages ?? []).slice().sort((a, b) => a.order - b.order))
const stageOptions = computed(() => stages.value.filter(s => !s.isRejected).map(s => ({ value: s.id, label: s.label })))
function stageLabel(id: string) {
  return stages.value.find(s => s.id === id)?.label ?? id
}

const sourceOptions = [
  { value: 'DIRECT', label: 'Direta' },
  { value: 'HUNTER', label: 'Indicado por hunter' },
]
const rejectedOptions = [
  { value: 'false', label: 'Ativos' },
  { value: 'true', label: 'Rejeitados' },
]

const { data: resp, pending, refresh } = await useAsyncData('empresa-candidatos', () =>
  api.get<PaginatedResult<OwnerApplicationRow>>('/applications/me-as-owner', {
    q: q.value || undefined,
    vagaId: vagaId.value || undefined,
    source: source.value || undefined,
    isRejected: isRejected.value ?? undefined,
    pipelineStage: pipelineStage.value || undefined,
    page: page.value,
    limit: 20,
  }).catch(() => null),
{ watch: [q, vagaId, source, isRejected, pipelineStage, page] })
const rows = computed<OwnerApplicationRow[]>(() => resp.value?.data ?? [])

// Reseta a página ao mudar qualquer filtro.
watch([q, vagaId, source, isRejected, pipelineStage], () => { page.value = 1 })

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const exporting = ref(false)
async function exportarCsv() {
  exporting.value = true
  try {
    const cfg = useRuntimeConfig()
    const token = useCookie<string | null>('vp_token').value
    const blob = await $fetch<Blob>('/applications/me-as-owner/export', {
      baseURL: cfg.public.backendUrl,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
      query: {
        q: q.value || undefined,
        vagaId: vagaId.value || undefined,
        source: source.value || undefined,
        isRejected: isRejected.value ?? undefined,
        pipelineStage: pipelineStage.value || undefined,
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'candidatos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  catch {
    toast.error('Não foi possível exportar o CSV.')
  }
  finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="cand">
    <header class="cand__header">
      <div>
        <h1>Candidatos</h1>
        <p class="cand__sub">Todos os candidatos das suas vagas, em um só lugar.</p>
      </div>
      <UiButton variant="secondary" :loading="exporting" @click="exportarCsv">Exportar CSV</UiButton>
    </header>

    <div class="cand__filters">
      <UiInput v-model="q" placeholder="Buscar por nome" class="cand__search" />
      <UiSelect v-model="vagaId" :options="vagaOptions" placeholder="Todas as vagas" />
      <UiSelect v-model="pipelineStage" :options="stageOptions" placeholder="Todas as etapas" />
      <UiSelect v-model="source" :options="sourceOptions" placeholder="Origem" />
      <UiSelect v-model="isRejected" :options="rejectedOptions" placeholder="Ativos" />
    </div>

    <div v-if="pending" class="cand__skel">
      <div v-for="n in 4" :key="n" class="skeleton cand__skel-row" />
    </div>

    <div v-else-if="rows.length" class="cand__table-wrap">
      <table class="cand__table">
        <thead>
          <tr><th>Candidato</th><th>Vaga</th><th>Etapa</th><th>Origem</th><th>Nota</th><th>Data</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="cand__row" @click="navigateTo(`/app/empresa/vagas/${r.vagaId}`)">
            <td>
              <span class="cand__name">{{ r.snapshotFullName }}</span>
              <span v-if="r.contactMasked" class="cand__masked">🔒 contato oculto</span>
              <span v-else-if="r.snapshotEmail" class="cand__masked cand__masked--visible">{{ r.snapshotEmail }}</span>
            </td>
            <td class="cand__muted">{{ r.vagaTitle ?? '—' }}</td>
            <td>
              <UiBadge :variant="r.isRejected ? 'neutral' : 'info'">
                {{ r.isRejected ? 'Rejeitado' : stageLabel(r.pipelineStage) }}
              </UiBadge>
            </td>
            <td>
              <UiBadge v-if="r.source === 'HUNTER'" variant="outline">Indicado por hunter</UiBadge>
              <UiBadge v-else variant="neutral">Direta</UiBadge>
            </td>
            <td class="cand__muted">{{ r.generalScore != null ? r.generalScore : '—' }}</td>
            <td class="cand__muted">{{ fmt(r.createdAt) }}</td>
          </tr>
        </tbody>
      </table>

      <UiPagination
        v-if="resp && resp.lastPage > 1"
        :page="page" :last-page="resp.lastPage" :total="resp.total"
        @update:page="page = $event"
      />
    </div>

    <UiEmptyState
      v-else
      title="Nenhum candidato encontrado"
      description="Ajuste os filtros ou aguarde novas candidaturas nas suas vagas."
    />
  </div>
</template>

<style scoped>
.cand__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); }
.cand__header h1 { font-size: var(--text-22); }
.cand__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.cand__filters { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr; gap: var(--sp-3); margin: var(--sp-5) 0; }
.cand__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.cand__skel-row { height: 56px; border-radius: var(--radius-input); }
.cand__table-wrap { overflow-x: auto; }
.cand__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 760px; }
.cand__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.cand__row { cursor: pointer; }
.cand__row:hover { background: var(--ink-100); }
.cand__row td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.cand__name { display: block; font-weight: 600; color: var(--ink-900); }
.cand__masked { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.cand__masked--visible { font-style: normal; }
.cand__muted { color: var(--ink-500); }
@media (max-width: 900px) {
  .cand__header { flex-direction: column; }
  .cand__filters { grid-template-columns: 1fr 1fr; }
}
</style>
