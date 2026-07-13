<script setup lang="ts">
// A6 (parte 2) — Vagas (design-spec/06 §A). Backend pronto via B24:
// GET /vagas/admin/list (agora com owner resumido, join adicionado nesta
// rodada) + POST /admin/vagas/:id/unpublish (despublica + tombstone automático
// + notifica o dono, motivo obrigatório).
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminVagaListItem } from '~/types/admin'
import type { PaginatedResult } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Vagas — Admin' })

const api = useApi()
const toast = useToast()

const q = ref('')
const status = ref<string | null>(null)
const page = ref(1)

const statusOptions = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicada' },
  { value: 'CLOSED', label: 'Encerrada' },
]

const { data: resp, pending, refresh } = await useAsyncData('admin-vagas', () =>
  api.get<PaginatedResult<AdminVagaListItem>>('/vagas/admin/list', {
    q: q.value || undefined,
    status: status.value || undefined,
    page: page.value,
    limit: 20,
  }).catch(() => null),
{ watch: [q, status, page] })
const rows = computed<AdminVagaListItem[]>(() => resp.value?.data ?? [])
watch([q, status], () => { page.value = 1 })

const columns: TableColumn[] = [
  { key: 'title', label: 'Vaga' },
  { key: 'owner', label: 'Dono' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'createdAt', label: 'Criada em' },
  { key: 'actions', label: '', align: 'right' },
]

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function statusVariant(s: string) {
  if (s === 'PUBLISHED') return 'success'
  if (s === 'CLOSED') return 'neutral'
  return 'warning'
}
function statusLabel(s: string) {
  return statusOptions.find(o => o.value === s)?.label ?? s
}
function ownerName(v: AdminVagaListItem) {
  if (!v.createdBy) return '—'
  if (v.createdBy.isCompany) return v.createdBy.companyName || v.createdBy.email
  return `${v.createdBy.firstName ?? ''} ${v.createdBy.lastName ?? ''}`.trim() || v.createdBy.email
}

const unpublishing = ref<AdminVagaListItem | null>(null)
const unpublishReason = ref('')
const saving = ref(false)
function openUnpublish(v: AdminVagaListItem) {
  unpublishing.value = v
  unpublishReason.value = ''
}
async function confirmUnpublish() {
  if (!unpublishing.value || !unpublishReason.value.trim()) return
  saving.value = true
  try {
    await api.post(`/admin/vagas/${unpublishing.value.id}/unpublish`, { reason: unpublishReason.value.trim() })
    toast.success('Vaga despublicada. O dono foi notificado.')
    unpublishing.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível despublicar a vaga.')
  }
  finally { saving.value = false }
}
</script>

<template>
  <div class="vgs">
    <header class="vgs__header">
      <h1>Vagas</h1>
      <p class="vgs__sub">Moderação de conteúdo — despublicar vagas impróprias (gera tombstone automático e notifica o dono).</p>
    </header>

    <div class="vgs__filters">
      <UiInput v-model="q" placeholder="Buscar por título" class="vgs__search" />
      <UiSelect v-model="status" :options="statusOptions" placeholder="Todos os status" />
    </div>

    <UiTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending" empty-title="Nenhuma vaga encontrada">
      <template #cell-title="{ row }">
        <strong>{{ row.title }}</strong>
        <NuxtLink v-if="row.status === 'PUBLISHED'" :to="`/vaga/${row.slug}`" target="_blank" class="vgs__link">Ver pública ↗</NuxtLink>
      </template>
      <template #cell-owner="{ row }">
        {{ ownerName(row as AdminVagaListItem) }}
      </template>
      <template #cell-status="{ value }">
        <UiBadge :variant="statusVariant(value as string)">{{ statusLabel(value as string) }}</UiBadge>
      </template>
      <template #cell-createdAt="{ value }">
        {{ fmt(value as string) }}
      </template>
      <template #cell-actions="{ row }">
        <UiButton v-if="row.status === 'PUBLISHED'" size="sm" variant="danger" @click="openUnpublish(row as AdminVagaListItem)">
          Despublicar
        </UiButton>
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <UiModal :open="!!unpublishing" title="Despublicar vaga" size="sm" @close="unpublishing = null">
      <p class="text-secondary">
        <strong>{{ unpublishing?.title }}</strong> vai ser despublicada e virar um tombstone (410) na URL pública.
        O dono será notificado por e-mail.
      </p>
      <label class="vgs__field">
        <span class="vgs__label">Motivo (obrigatório)</span>
        <textarea v-model="unpublishReason" rows="3" placeholder="Ex.: conteúdo discriminatório, spam, vaga fraudulenta..." />
      </label>
      <template #footer>
        <UiButton variant="ghost" @click="unpublishing = null">Cancelar</UiButton>
        <UiButton variant="danger" :loading="saving" :disabled="!unpublishReason.trim()" @click="confirmUnpublish">
          Confirmar despublicação
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.vgs__header h1 { font-size: var(--text-22); }
.vgs__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); }
.vgs__filters { display: grid; grid-template-columns: 1.6fr 1fr; gap: var(--sp-3); margin-bottom: var(--sp-4); }
.vgs__link { display: block; font-size: var(--text-12); color: var(--brand-600); }
.vgs__field { display: flex; flex-direction: column; gap: 4px; margin-top: var(--sp-4); }
.vgs__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.vgs__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; width: 100%; }
@media (max-width: 700px) {
  .vgs__filters { grid-template-columns: 1fr; }
}
</style>
