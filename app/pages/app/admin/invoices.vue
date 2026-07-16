<script setup lang="ts">
// T-E07 — Faturas de fee (visão admin). Mesmo padrão visual de admin/payouts.vue:
// tabela + modal de resolução de disputa (motivo auditado). Disputa é resolvida
// com MARK_PAID (aceita a contestação) ou REOPEN (recusa — fatura volta a cobrar).
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminInvoiceListItem, InvoiceStatus } from '~/types/admin'
import { INVOICE_STATUS_LABEL, invoiceStatusVariant } from '~/types/invoice'

interface AdminInvoicesResponse { data: AdminInvoiceListItem[], total: number, page: number, lastPage: number }

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Faturas — Admin' })

const api = useApi()
const toast = useToast()

const status = ref<string | null>(null)
const page = ref(1)

const statusOptions = Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const { data: resp, pending, refresh } = await useAsyncData('admin-invoices', () =>
  api.get<AdminInvoicesResponse>('/admin/invoices', { status: status.value || undefined, page: page.value, limit: 20 }).catch(() => null),
{ watch: [status, page] })
const rows = computed<AdminInvoiceListItem[]>(() => resp.value?.data ?? [])
watch(status, () => { page.value = 1 })

const columns: TableColumn[] = [
  { key: 'company', label: 'Empresa / Vaga' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'dueDate', label: 'Vencimento' },
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

// -- Resolver disputa --
const resolving = ref<AdminInvoiceListItem | null>(null)
const resolution = ref<'MARK_PAID' | 'REOPEN' | null>(null)
const note = ref('')
const saving = ref(false)

function openResolve(inv: AdminInvoiceListItem) {
  resolving.value = inv
  resolution.value = null
  note.value = ''
}

async function confirmResolve() {
  if (!resolving.value || !resolution.value) return
  saving.value = true
  try {
    await api.post(`/admin/invoices/${resolving.value.id}/resolve-dispute`, {
      resolution: resolution.value,
      note: note.value.trim() || undefined,
    })
    toast.success(resolution.value === 'MARK_PAID' ? 'Disputa aceita — fatura marcada como paga.' : 'Disputa recusada — fatura reaberta.')
    resolving.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível concluir a ação.')
  }
  finally { saving.value = false }
}

// -- Detalhe --
const viewing = ref<AdminInvoiceListItem | null>(null)
</script>

<template>
  <div class="inv">
    <header class="inv__header">
      <h1>Faturas</h1>
      <p class="inv__sub">
        Cobrança do fee de placements via hunter. Faturas vencidas há mais de 7 dias bloqueiam novas
        publicações da empresa — disputas exigem resolução manual (aceitar ou reabrir).
      </p>
    </header>

    <div class="inv__filters">
      <UiSelect v-model="status" :options="statusOptions" placeholder="Todos os status" />
    </div>

    <UiTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending" empty-title="Nenhuma fatura encontrada">
      <template #cell-company="{ row }">
        <strong class="inv__link" @click="viewing = row as AdminInvoiceListItem">{{ (row as AdminInvoiceListItem).company?.name ?? 'Empresa' }}</strong>
        <span class="inv__muted">{{ (row as AdminInvoiceListItem).vaga?.title ?? 'Fee de placement' }}</span>
      </template>
      <template #cell-amount="{ value }">{{ fmtBRL(value as string) }}</template>
      <template #cell-dueDate="{ value }">{{ fmt(value as string) }}</template>
      <template #cell-status="{ value }">
        <UiBadge :variant="invoiceStatusVariant(value as InvoiceStatus)">{{ INVOICE_STATUS_LABEL[value as InvoiceStatus] ?? value }}</UiBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="inv__btns">
          <UiButton size="sm" variant="ghost" @click="viewing = row as AdminInvoiceListItem">Ver detalhe</UiButton>
          <UiButton v-if="(row as AdminInvoiceListItem).status === 'DISPUTED'" size="sm" @click="openResolve(row as AdminInvoiceListItem)">Resolver disputa</UiButton>
        </div>
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <!-- Modal de detalhe -->
    <UiModal :open="!!viewing" title="Detalhe da fatura" size="md" @close="viewing = null">
      <div v-if="viewing" class="inv__detail">
        <div class="inv__detail-row">
          <span class="inv__label">Empresa</span>
          <span>{{ viewing.company?.name }} ({{ viewing.company?.email }})</span>
        </div>
        <div class="inv__detail-row">
          <span class="inv__label">Vaga</span>
          <span>{{ viewing.vaga?.title ?? '—' }}</span>
        </div>
        <div class="inv__detail-row">
          <span class="inv__label">Valor</span>
          <span>{{ fmtBRL(viewing.amount) }}</span>
        </div>
        <div class="inv__detail-row">
          <span class="inv__label">Status</span>
          <UiBadge :variant="invoiceStatusVariant(viewing.status)">{{ INVOICE_STATUS_LABEL[viewing.status] }}</UiBadge>
        </div>
        <div class="inv__detail-row">
          <span class="inv__label">Vencimento</span>
          <span>{{ fmt(viewing.dueDate) }}</span>
        </div>
        <div v-if="viewing.paidAt" class="inv__detail-row">
          <span class="inv__label">Paga em</span>
          <span>{{ fmt(viewing.paidAt) }}</span>
        </div>
        <div v-if="viewing.disputeReason" class="inv__detail-row">
          <span class="inv__label">Motivo da contestação</span>
          <span>{{ viewing.disputeReason }}</span>
        </div>
        <div v-if="viewing.disputedAt" class="inv__detail-row">
          <span class="inv__label">Contestada em</span>
          <span>{{ fmt(viewing.disputedAt) }}</span>
        </div>
        <div v-if="viewing.disputeResolvedAt" class="inv__detail-row">
          <span class="inv__label">Disputa resolvida em</span>
          <span>{{ fmt(viewing.disputeResolvedAt) }}</span>
        </div>
      </div>
    </UiModal>

    <!-- Modal de resolução de disputa -->
    <UiModal :open="!!resolving" title="Resolver disputa" size="sm" @close="resolving = null">
      <div v-if="resolving" class="inv__modal">
        <p class="text-secondary">
          <strong>{{ resolving.company?.name }}</strong> — {{ fmtBRL(resolving.amount) }}
        </p>
        <p class="inv__reason"><strong>Motivo da empresa:</strong> {{ resolving.disputeReason }}</p>
        <div class="inv__choices">
          <label class="inv__choice">
            <input v-model="resolution" type="radio" value="MARK_PAID">
            <span><strong>Aceitar</strong> — marca a fatura como paga.</span>
          </label>
          <label class="inv__choice">
            <input v-model="resolution" type="radio" value="REOPEN">
            <span><strong>Recusar</strong> — reabre a cobrança (a empresa precisa pagar).</span>
          </label>
        </div>
        <label class="inv__field">
          <span class="inv__label">Nota (opcional, auditada)</span>
          <textarea v-model="note" rows="3" placeholder="Justificativa..." />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="resolving = null">Cancelar</UiButton>
        <UiButton :loading="saving" :disabled="!resolution" @click="confirmResolve">Confirmar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.inv__header h1 { font-size: var(--text-22); }
.inv__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); max-width: 640px; }
.inv__filters { display: grid; grid-template-columns: 1fr; max-width: 260px; margin-bottom: var(--sp-4); }
.inv__muted { display: block; font-size: var(--text-12); color: var(--ink-500); }
.inv__link { cursor: pointer; }
.inv__link:hover { text-decoration: underline; }
.inv__btns { display: flex; gap: var(--sp-2); justify-content: flex-end; flex-wrap: wrap; }
.inv__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.inv__reason { font-size: var(--text-13); color: var(--ink-700); background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); }
.inv__choices { display: flex; flex-direction: column; gap: var(--sp-2); }
.inv__choice { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-14); cursor: pointer; }
.inv__choice input { margin-top: 3px; }
.inv__field { display: flex; flex-direction: column; gap: 4px; }
.inv__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.inv__detail { display: flex; flex-direction: column; gap: var(--sp-3); }
.inv__detail-row { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-14); }
.inv__label { font-size: var(--text-12); color: var(--ink-500); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
</style>
