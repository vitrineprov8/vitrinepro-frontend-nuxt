<script setup lang="ts">
// A4 — Placements (auditoria global, design-spec/06 §A). Backend novo nesta
// rodada: GET /admin/placements (filtros) + POST .../force-release-fee e
// .../force-refund (motivo obrigatório, ambos auditados via B23).
// "Estorno" aqui é só a régua do placement (CANCELLED) — sem gateway de
// pagamento real (B11/B25), nenhum valor é de fato devolvido; ver aviso no
// modal e nota no CLAUDE.md do backend.
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminPlacementListItem } from '~/types/admin'
import type { PlacementStatus } from '~/types/placement'
import { PLACEMENT_STATUS_LABEL, placementStatusVariant } from '~/types/placement'

interface AdminPlacementsResponse { data: AdminPlacementListItem[], total: number, page: number, lastPage: number }

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Placements — Admin' })

const api = useApi()
const toast = useToast()

const status = ref<string | null>(null)
const page = ref(1)

const statusOptions = Object.entries(PLACEMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const { data: resp, pending, refresh } = await useAsyncData('admin-placements', () =>
  api.get<AdminPlacementsResponse>('/admin/placements', { status: status.value || undefined, page: page.value, limit: 20 }).catch(() => null),
{ watch: [status, page] })
const rows = computed<AdminPlacementListItem[]>(() => resp.value?.data ?? [])
watch(status, () => { page.value = 1 })

const columns: TableColumn[] = [
  { key: 'candidateName', label: 'Candidato / Vaga' },
  { key: 'parties', label: 'Hunter / Empresa' },
  { key: 'finalSalary', label: 'Salário', align: 'right' },
  { key: 'feeAmount', label: 'Fee', align: 'right' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
function fmtBRL(v: number | string | null) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const acting = ref<{ placement: AdminPlacementListItem, kind: 'fee' | 'refund' } | null>(null)
const reason = ref('')
const saving = ref(false)

function openAction(p: AdminPlacementListItem, kind: 'fee' | 'refund') {
  acting.value = { placement: p, kind }
  reason.value = ''
}

async function confirmAction() {
  if (!acting.value || !reason.value.trim()) return
  saving.value = true
  try {
    const path = acting.value.kind === 'fee' ? 'force-release-fee' : 'force-refund'
    await api.post(`/admin/placements/${acting.value.placement.id}/${path}`, { reason: reason.value.trim() })
    toast.success(acting.value.kind === 'fee' ? 'Fee liberado.' : 'Placement marcado como estornado/cancelado.')
    acting.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível concluir a ação.')
  }
  finally { saving.value = false }
}
</script>

<template>
  <div class="plc">
    <header class="plc__header">
      <h1>Placements</h1>
      <p class="plc__sub">Auditoria global — forçar liberação de fee ou marcar estorno, sempre com motivo logado.</p>
    </header>

    <div class="plc__filters">
      <UiSelect v-model="status" :options="statusOptions" placeholder="Todos os status" />
    </div>

    <UiTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending" empty-title="Nenhum placement encontrado">
      <template #cell-candidateName="{ row }">
        <strong>{{ row.candidateName ?? 'Candidato' }}</strong>
        <span class="plc__muted">{{ (row as AdminPlacementListItem).vaga?.title ?? 'Vaga' }}</span>
      </template>
      <template #cell-parties="{ row }">
        <span class="plc__muted">Hunter: {{ (row as AdminPlacementListItem).hunter?.name ?? '—' }}</span>
        <span class="plc__muted">Empresa: {{ (row as AdminPlacementListItem).company?.name ?? '—' }}</span>
      </template>
      <template #cell-finalSalary="{ value }">
        {{ fmtBRL(value as string) }}
      </template>
      <template #cell-feeAmount="{ value }">
        {{ fmtBRL(value as string) }}
      </template>
      <template #cell-status="{ value }">
        <UiBadge :variant="placementStatusVariant(value as PlacementStatus)">{{ PLACEMENT_STATUS_LABEL[value as PlacementStatus] ?? value }}</UiBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="plc__btns">
          <UiButton
            v-if="(row as AdminPlacementListItem).status === 'CONFIRMED'"
            size="sm" variant="secondary" @click="openAction(row as AdminPlacementListItem, 'fee')"
          >
            Forçar fee
          </UiButton>
          <UiButton
            v-if="!['CANCELLED', 'REPLACED'].includes((row as AdminPlacementListItem).status)"
            size="sm" variant="danger" @click="openAction(row as AdminPlacementListItem, 'refund')"
          >
            Marcar estorno
          </UiButton>
        </div>
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <UiModal
      :open="!!acting"
      :title="acting?.kind === 'fee' ? 'Forçar liberação de fee' : 'Marcar estorno'"
      size="sm" @close="acting = null"
    >
      <div v-if="acting" class="plc__modal">
        <p class="text-secondary">
          <strong>{{ acting.placement.candidateName }}</strong> — {{ acting.placement.vaga?.title }}
        </p>
        <p v-if="acting.kind === 'fee'" class="plc__hint">
          Libera o fee antes do prazo normal de garantia (90 dias). Use para casos excepcionais aprovados pela empresa.
        </p>
        <p v-else class="plc__warn">
          Isto só marca o placement como cancelado (para a régua de fee/garantia) — não existe processamento financeiro
          real aqui (sem gateway de pagamento). Se a empresa precisa de reembolso de verdade, o time financeiro precisa agir por fora.
        </p>
        <label class="plc__field">
          <span class="plc__label">Motivo (obrigatório)</span>
          <textarea v-model="reason" rows="3" placeholder="Justificativa da ação..." />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="acting = null">Cancelar</UiButton>
        <UiButton :variant="acting?.kind === 'refund' ? 'danger' : 'primary'" :loading="saving" :disabled="!reason.trim()" @click="confirmAction">
          Confirmar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.plc__header h1 { font-size: var(--text-22); }
.plc__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); max-width: 640px; }
.plc__filters { display: grid; grid-template-columns: 1fr; max-width: 260px; margin-bottom: var(--sp-4); }
.plc__muted { display: block; font-size: var(--text-12); color: var(--ink-500); }
.plc__btns { display: flex; gap: var(--sp-2); justify-content: flex-end; }
.plc__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.plc__hint { font-size: var(--text-13); color: var(--ink-500); }
.plc__warn { font-size: var(--text-12); color: var(--red-500); background: var(--red-100); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); }
.plc__field { display: flex; flex-direction: column; gap: 4px; }
.plc__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.plc__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
</style>
