<script setup lang="ts">
// Empresas + split negociável (F13, fora do spec original — pedido do
// Andres 2026-07-06). Backend 100% pronto via B22:
// GET /admin/empresas + PATCH /admin/empresas/:id/placement-split.
// Importante: a mudança de split só vale pra placements FUTUROS — o split
// aplicado em cada placement já criado fica congelado no snapshot
// (`platformSharePercentApplied`), confirmado no B22 com número real.
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminCompanyListItem, AdminCompanySplitHistoryEntry, AdminCompanySplitUpdateResponse } from '~/types/admin'

interface AdminCompaniesResponse {
  data: AdminCompanyListItem[]
  total: number
  page: number
  lastPage: number
}

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Empresas — Admin' })

const api = useApi()
const toast = useToast()

const page = ref(1)
const { data: resp, pending, refresh } = await useAsyncData('admin-empresas', () =>
  api.get<AdminCompaniesResponse>('/admin/empresas', { page: page.value, limit: 20 }).catch(() => null),
{ watch: [page] })
const rows = computed<AdminCompanyListItem[]>(() => resp.value?.data ?? [])

const columns: TableColumn[] = [
  { key: 'companyName', label: 'Empresa' },
  { key: 'plan', label: 'Plano' },
  { key: 'vagasCount', label: 'Vagas', align: 'right' },
  { key: 'placementsCount', label: 'Placements', align: 'right' },
  { key: 'platformSharePercent', label: 'Split plataforma', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

const editing = ref<AdminCompanyListItem | null>(null)
const newPercent = ref('')
const reason = ref('')
const saving = ref(false)
const history = ref<AdminCompanySplitHistoryEntry[]>([])

function openEdit(c: AdminCompanyListItem) {
  editing.value = c
  newPercent.value = String(c.platformSharePercent)
  reason.value = ''
  history.value = []
}

async function salvar() {
  if (!editing.value || !reason.value.trim()) return
  const percent = Number(newPercent.value)
  if (Number.isNaN(percent) || percent < 0 || percent > 100) {
    toast.error('Informe um percentual entre 0 e 100.')
    return
  }
  saving.value = true
  try {
    const res = await api.patch<AdminCompanySplitUpdateResponse>(`/admin/empresas/${editing.value.id}/placement-split`, {
      platformSharePercent: percent,
      reason: reason.value.trim(),
    })
    toast.success('Split atualizado. Vale só para placements futuros.')
    history.value = res.placementSplitHistory ?? []
    reason.value = ''
    await refresh()
    const updated = rows.value.find(r => r.id === editing.value?.id)
    if (updated) editing.value = updated
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível atualizar o split.')
  }
  finally { saving.value = false }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="emp">
    <header class="emp__header">
      <h1>Empresas</h1>
      <p class="emp__sub">
        Split de placement negociável por conta (default 75% hunter / 25% plataforma). Fora do spec original — item pedido à parte.
      </p>
    </header>

    <UiTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending" empty-title="Nenhuma empresa encontrada">
      <template #cell-companyName="{ row }">
        <strong>{{ row.companyName || '—' }}</strong>
        <span class="emp__email">{{ row.email }}</span>
      </template>
      <template #cell-plan="{ value }">
        {{ value }}
      </template>
      <template #cell-platformSharePercent="{ row }">
        {{ row.platformSharePercent }}%
        <UiBadge v-if="row.isCustomSplit" variant="outline">customizado</UiBadge>
      </template>
      <template #cell-actions="{ row }">
        <UiButton size="sm" variant="secondary" @click="openEdit(row as AdminCompanyListItem)">Editar split</UiButton>
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <UiModal :open="!!editing" title="Editar split de placement" size="md" @close="editing = null">
      <div v-if="editing" class="emp__modal">
        <p class="text-secondary">
          <strong>{{ editing.companyName || editing.email }}</strong> — split atual: {{ editing.platformSharePercent }}% plataforma
          / {{ 100 - editing.platformSharePercent }}% hunter.
        </p>
        <p class="emp__warn">
          A mudança só vale para placements futuros. Contratações já registradas mantêm o percentual congelado no momento em que foram marcadas.
        </p>
        <UiInput v-model="newPercent" type="number" label="Novo % da plataforma" placeholder="25" />
        <label class="emp__field">
          <span class="emp__label">Motivo (obrigatório)</span>
          <textarea v-model="reason" rows="3" placeholder="Ex.: acordo comercial negociado com o cliente..." />
        </label>

        <div v-if="history.length" class="emp__history">
          <h4>Histórico de mudanças</h4>
          <ul>
            <li v-for="(h, i) in history.slice().reverse()" :key="i">
              {{ fmtDate(h.changedAt) }}: {{ h.previousPercent ?? 'default' }}% → {{ h.newPercent }}% — <em>{{ h.reason }}</em>
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="editing = null">Fechar</UiButton>
        <UiButton :loading="saving" :disabled="!reason.trim() || !newPercent" @click="salvar">Salvar split</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.emp__header h1 { font-size: var(--text-22); }
.emp__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); max-width: 640px; }
.emp__email { display: block; font-size: var(--text-13); color: var(--ink-500); }
.emp__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.emp__warn { font-size: var(--text-12); color: #92400E; background: var(--amber-100); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); }
.emp__field { display: flex; flex-direction: column; gap: 4px; }
.emp__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.emp__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.emp__history { background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); font-size: var(--text-13); }
.emp__history h4 { font-size: var(--text-13); margin-bottom: var(--sp-2); }
.emp__history ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
</style>
