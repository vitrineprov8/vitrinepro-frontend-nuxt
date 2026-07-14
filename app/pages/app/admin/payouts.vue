<script setup lang="ts">
// B25 — Pagamentos (revisão/execução da comissão do hunter). Sem precedente
// no design-spec original (só existe T-H09 do lado hunter) — desenhada
// seguindo o mesmo padrão visual de A3/A4 (tabela + modal de ação com
// motivo). Decisão arquitetural explícita do Andres: um admin precisa
// APROVAR manualmente cada pagamento (gate de segurança) — assim que
// aprovado, o próprio SISTEMA executa a transferência via Asaas Transfers
// (o admin não digita nada na Asaas). Esta tela dá visibilidade completa do
// pipeline: dados usados na transferência, ID da transferência na Asaas e o
// resultado (pago/falhou, com motivo).
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminPayoutListItem, PayoutStatus } from '~/types/admin'
import { PAYOUT_STATUS_LABEL, payoutStatusVariant } from '~/types/payout'

interface AdminPayoutsResponse { data: AdminPayoutListItem[], total: number, page: number, lastPage: number }

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Pagamentos — Admin' })

const api = useApi()
const toast = useToast()

const status = ref<string | null>(null)
const page = ref(1)

const statusOptions = Object.entries(PAYOUT_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const { data: resp, pending, refresh } = await useAsyncData('admin-payouts', () =>
  api.get<AdminPayoutsResponse>('/admin/payouts', { status: status.value || undefined, page: page.value, limit: 20 }).catch(() => null),
{ watch: [status, page] })
const rows = computed<AdminPayoutListItem[]>(() => resp.value?.data ?? [])
watch(status, () => { page.value = 1 })

const columns: TableColumn[] = [
  { key: 'hunter', label: 'Hunter / Vaga' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'pix', label: 'Dados de recebimento' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}
function fmtBRL(v: number | string | null) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// -- Aprovar/rejeitar --
const acting = ref<{ payout: AdminPayoutListItem, kind: 'approve' | 'reject' } | null>(null)
const reason = ref('')
const saving = ref(false)

function openAction(p: AdminPayoutListItem, kind: 'approve' | 'reject') {
  acting.value = { payout: p, kind }
  reason.value = ''
}

async function confirmAction() {
  if (!acting.value) return
  if (acting.value.kind === 'reject' && !reason.value.trim()) return
  saving.value = true
  try {
    if (acting.value.kind === 'approve') {
      await api.post(`/admin/payouts/${acting.value.payout.id}/approve`, { note: reason.value.trim() || undefined })
      toast.success('Pagamento aprovado — o sistema está executando a transferência via Pix.')
    } else {
      await api.post(`/admin/payouts/${acting.value.payout.id}/reject`, { reason: reason.value.trim() })
      toast.success('Pagamento rejeitado.')
    }
    acting.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível concluir a ação.')
  }
  finally { saving.value = false }
}

// -- Detalhe (visibilidade do pipeline) --
const viewing = ref<AdminPayoutListItem | null>(null)
</script>

<template>
  <div class="pay">
    <header class="pay__header">
      <h1>Pagamentos</h1>
      <p class="pay__sub">
        Revisão manual da comissão do hunter — depois de aprovado, o sistema executa a transferência via
        Pix automaticamente (Asaas Transfers). Rejeitar exige motivo (auditado).
      </p>
    </header>

    <div class="pay__filters">
      <UiSelect v-model="status" :options="statusOptions" placeholder="Todos os status" />
    </div>

    <UiTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending" empty-title="Nenhum pagamento encontrado">
      <template #cell-hunter="{ row }">
        <strong class="pay__link" @click="viewing = row as AdminPayoutListItem">{{ (row as AdminPayoutListItem).hunter?.name ?? 'Hunter' }}</strong>
        <span class="pay__muted">{{ (row as AdminPayoutListItem).vaga?.title ?? 'Vaga' }}</span>
      </template>
      <template #cell-amount="{ value }">
        {{ fmtBRL(value as string) }}
      </template>
      <template #cell-pix="{ row }">
        <span v-if="(row as AdminPayoutListItem).pixKeySnapshot" class="pay__muted">
          {{ (row as AdminPayoutListItem).pixKeyTypeSnapshot }}: {{ (row as AdminPayoutListItem).pixKeySnapshot }}
        </span>
        <span v-else class="pay__warn">Hunter não configurou ainda</span>
      </template>
      <template #cell-status="{ value }">
        <UiBadge :variant="payoutStatusVariant(value as PayoutStatus)">{{ PAYOUT_STATUS_LABEL[value as PayoutStatus] ?? value }}</UiBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="pay__btns">
          <UiButton size="sm" variant="ghost" @click="viewing = row as AdminPayoutListItem">Ver detalhe</UiButton>
          <template v-if="(row as AdminPayoutListItem).status === 'PENDING_REVIEW'">
            <UiButton size="sm" @click="openAction(row as AdminPayoutListItem, 'approve')">Aprovar</UiButton>
            <UiButton size="sm" variant="danger" @click="openAction(row as AdminPayoutListItem, 'reject')">Rejeitar</UiButton>
          </template>
        </div>
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <!-- Modal de detalhe — visibilidade completa do pipeline (pedido explícito do Andres) -->
    <UiModal :open="!!viewing" title="Detalhe do pagamento" size="md" @close="viewing = null">
      <div v-if="viewing" class="pay__detail">
        <div class="pay__detail-row">
          <span class="pay__label">Hunter</span>
          <span>{{ viewing.hunter?.name }} ({{ viewing.hunter?.email }})</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Vaga</span>
          <span>{{ viewing.vaga?.title ?? '—' }}</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Valor</span>
          <span>{{ fmtBRL(viewing.amount) }}</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Status</span>
          <UiBadge :variant="payoutStatusVariant(viewing.status)">{{ PAYOUT_STATUS_LABEL[viewing.status] }}</UiBadge>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Dados de recebimento (snapshot)</span>
          <span v-if="viewing.pixKeySnapshot">{{ viewing.pixKeyTypeSnapshot }}: {{ viewing.pixKeySnapshot }} · {{ viewing.legalTypeSnapshot }} · {{ viewing.cpfCnpjSnapshot }}</span>
          <span v-else class="pay__warn">Não configurado ainda</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Nota fiscal</span>
          <a v-if="viewing.nfUrl" :href="viewing.nfUrl" target="_blank" rel="noopener">Ver NF anexada</a>
          <span v-else>—</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">Revisado em</span>
          <span>{{ fmt(viewing.reviewedAt) }}</span>
        </div>
        <div v-if="viewing.rejectionReason" class="pay__detail-row">
          <span class="pay__label">Motivo da rejeição</span>
          <span>{{ viewing.rejectionReason }}</span>
        </div>
        <div class="pay__detail-row">
          <span class="pay__label">ID da transferência (Asaas)</span>
          <span>{{ viewing.asaasTransferId ?? '—' }}</span>
        </div>
        <div v-if="viewing.paidAt" class="pay__detail-row">
          <span class="pay__label">Pago em</span>
          <span>{{ fmt(viewing.paidAt) }}</span>
        </div>
        <div v-if="viewing.failureReason" class="pay__detail-row">
          <span class="pay__label">Motivo da falha</span>
          <span class="pay__warn">{{ viewing.failureReason }}</span>
        </div>
      </div>
    </UiModal>

    <!-- Modal de aprovar/rejeitar -->
    <UiModal
      :open="!!acting"
      :title="acting?.kind === 'approve' ? 'Aprovar pagamento' : 'Rejeitar pagamento'"
      size="sm" @close="acting = null"
    >
      <div v-if="acting" class="pay__modal">
        <p class="text-secondary">
          <strong>{{ acting.payout.hunter?.name }}</strong> — {{ fmtBRL(acting.payout.amount) }}
        </p>
        <p v-if="acting.kind === 'approve'" class="pay__hint">
          Ao aprovar, o sistema chama a Asaas automaticamente e executa a transferência via Pix agora
          mesmo — não é possível desfazer.
        </p>
        <p v-else class="pay__warn-box">
          O hunter será notificado do motivo e poderá corrigir os dados de recebimento se for o caso.
        </p>
        <label class="pay__field">
          <span class="pay__label">{{ acting.kind === 'approve' ? 'Nota (opcional, auditada)' : 'Motivo (obrigatório)' }}</span>
          <textarea v-model="reason" rows="3" placeholder="Justificativa..." />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="acting = null">Cancelar</UiButton>
        <UiButton
          :variant="acting?.kind === 'reject' ? 'danger' : 'primary'"
          :loading="saving"
          :disabled="acting?.kind === 'reject' && !reason.trim()"
          @click="confirmAction"
        >
          Confirmar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.pay__header h1 { font-size: var(--text-22); }
.pay__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); max-width: 640px; }
.pay__filters { display: grid; grid-template-columns: 1fr; max-width: 260px; margin-bottom: var(--sp-4); }
.pay__muted { display: block; font-size: var(--text-12); color: var(--ink-500); }
.pay__warn { font-size: var(--text-12); color: var(--red-500); }
.pay__link { cursor: pointer; }
.pay__link:hover { text-decoration: underline; }
.pay__btns { display: flex; gap: var(--sp-2); justify-content: flex-end; flex-wrap: wrap; }
.pay__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.pay__hint { font-size: var(--text-13); color: var(--ink-500); }
.pay__warn-box { font-size: var(--text-12); color: var(--red-500); background: var(--red-100); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); }
.pay__field { display: flex; flex-direction: column; gap: 4px; }
.pay__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.pay__detail { display: flex; flex-direction: column; gap: var(--sp-3); }
.pay__detail-row { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-14); }
.pay__label { font-size: var(--text-12); color: var(--ink-500); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
</style>
