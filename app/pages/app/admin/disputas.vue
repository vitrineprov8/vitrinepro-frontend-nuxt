<script setup lang="ts">
// A3 — Disputas (design-spec/06 §A). Lista placements DISPUTED via o mesmo
// GET /admin/placements de A4 (filtro status=DISPUTED) e resolve via o
// endpoint já existente do B9 (POST /placements/:id/resolve-dispute).
// Fora de escopo desta rodada (gap aceito, não existe nem no backend):
// thread de mensagens das partes e "Solicitar evidência" — só o essencial
// (ver motivo da contestação + Confirmar/Cancelar) foi implementado.
import type { AdminPlacementListItem } from '~/types/admin'
import type { PlacementStatus } from '~/types/placement'
import { PLACEMENT_STATUS_LABEL, placementStatusVariant } from '~/types/placement'

interface AdminPlacementsResponse { data: AdminPlacementListItem[], total: number, page: number, lastPage: number }

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Disputas — Admin' })

const api = useApi()
const toast = useToast()

const page = ref(1)
const { data: resp, pending, refresh } = await useAsyncData('admin-disputas', () =>
  api.get<AdminPlacementsResponse>('/admin/placements', { status: 'DISPUTED', page: page.value, limit: 20 }).catch(() => null),
{ watch: [page] })
const rows = computed<AdminPlacementListItem[]>(() => resp.value?.data ?? [])

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
function fmtBRL(v: number | string | null) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const resolving = ref<AdminPlacementListItem | null>(null)
const resolution = ref<'CONFIRM' | 'CANCEL'>('CONFIRM')
const note = ref('')
const saving = ref(false)

function openResolve(p: AdminPlacementListItem) {
  resolving.value = p
  resolution.value = 'CONFIRM'
  note.value = ''
}

async function confirmResolve() {
  if (!resolving.value) return
  saving.value = true
  try {
    await api.post(`/placements/${resolving.value.id}/resolve-dispute`, {
      resolution: resolution.value,
      note: note.value.trim() || undefined,
    })
    toast.success(resolution.value === 'CONFIRM' ? 'Disputa resolvida a favor da confirmação.' : 'Placement cancelado.')
    resolving.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível resolver a disputa.')
  }
  finally { saving.value = false }
}
</script>

<template>
  <div class="dsp">
    <header class="dsp__header">
      <h1>Disputas</h1>
      <p class="dsp__sub">Placements contestados pelo hunter, aguardando decisão administrativa.</p>
    </header>

    <div v-if="pending" class="dsp__skel">
      <div v-for="n in 3" :key="n" class="skeleton dsp__skel-row" />
    </div>

    <UiEmptyState
      v-else-if="!rows.length"
      title="Nenhuma disputa aberta"
      description="Quando um hunter contestar um placement, ele aparece aqui para revisão."
    />

    <ul v-else class="dsp__list">
      <li v-for="p in rows" :key="p.id" class="dsp__item">
        <div class="dsp__item-top">
          <div>
            <strong>{{ p.candidateName ?? 'Candidato' }}</strong>
            <span class="dsp__muted"> — {{ p.vaga?.title ?? 'Vaga' }}</span>
          </div>
          <UiBadge :variant="placementStatusVariant(p.status as PlacementStatus)">{{ PLACEMENT_STATUS_LABEL[p.status as PlacementStatus] ?? p.status }}</UiBadge>
        </div>
        <p class="dsp__parties">
          Hunter: {{ p.hunter?.name ?? '—' }} · Empresa: {{ p.company?.name ?? '—' }} · Salário: {{ fmtBRL(p.finalSalary) }}
        </p>
        <div class="dsp__reason">
          <span class="dsp__label">Motivo da contestação (em {{ fmt(p.disputedAt) }})</span>
          <p>{{ p.disputeReason }}</p>
        </div>
        <div class="dsp__actions">
          <UiButton size="sm" @click="openResolve(p)">Resolver disputa</UiButton>
        </div>
      </li>
    </ul>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <UiModal :open="!!resolving" title="Resolver disputa" size="sm" @close="resolving = null">
      <div v-if="resolving" class="dsp__modal">
        <p class="text-secondary">
          <strong>{{ resolving.candidateName }}</strong> — {{ resolving.vaga?.title }}
        </p>
        <div class="dsp__resolution">
          <label class="dsp__radio">
            <input v-model="resolution" type="radio" value="CONFIRM">
            <span><strong>Confirmar a favor do hunter</strong> — o placement segue normalmente (garantia de 90 dias começa a contar).</span>
          </label>
          <label class="dsp__radio">
            <input v-model="resolution" type="radio" value="CANCEL">
            <span><strong>Cancelar placement</strong> — dados incorretos/indevidos, sem fee e sem garantia.</span>
          </label>
        </div>
        <label class="dsp__field">
          <span class="dsp__label">Nota (opcional, registrada no audit log)</span>
          <textarea v-model="note" rows="3" placeholder="Justificativa da decisão..." />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="resolving = null">Cancelar</UiButton>
        <UiButton :loading="saving" @click="confirmResolve">Confirmar decisão</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.dsp__header h1 { font-size: var(--text-22); }
.dsp__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); }
.dsp__skel { display: flex; flex-direction: column; gap: var(--sp-3); }
.dsp__skel-row { height: 120px; border-radius: var(--radius-card); }
.dsp__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.dsp__item { background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); }
.dsp__item-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.dsp__muted { color: var(--ink-500); }
.dsp__parties { font-size: var(--text-13); color: var(--ink-500); margin: 0; }
.dsp__reason { background: var(--red-100); border-radius: var(--radius-input); padding: var(--sp-3); }
.dsp__reason p { margin: 4px 0 0; font-size: var(--text-14); }
.dsp__label { font-size: var(--text-12); color: var(--ink-500); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.dsp__actions { display: flex; justify-content: flex-end; }
.dsp__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.dsp__resolution { display: flex; flex-direction: column; gap: var(--sp-2); }
.dsp__radio { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-13); }
.dsp__radio input { margin-top: 3px; }
.dsp__field { display: flex; flex-direction: column; gap: 4px; }
.dsp__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
</style>
