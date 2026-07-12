<script setup lang="ts">
// T-H09 — Ganhos do hunter (design-spec/06 §P). KPIs (GET /stats/hunter/ganhos,
// B12) + lista de placements do hunter (GET /me/placements/hunter, B9) com
// confirmação bilateral (P2) e linha do tempo (P3) inline.
import { DollarSign, Wallet, Briefcase, ShieldCheck } from 'lucide-vue-next'
import type { Placement } from '~/types/placement'
import { PLACEMENT_STATUS_LABEL, placementStatusVariant } from '~/types/placement'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Ganhos — Hunter' })

const api = useApi()
const toast = useToast()

interface HunterGanhosStats {
  aReceber: number
  recebidoNoAno: number
  placementsConfirmados: number
  emGarantia: number
}
const { data: stats, pending: pendingStats, refresh: refreshStats } = await useAsyncData('hunter-ganhos-stats', () =>
  api.get<HunterGanhosStats>('/stats/hunter/ganhos').catch(() => null))

const { data: placements, pending: pendingPlacements, refresh: refreshPlacements } = await useAsyncData('hunter-ganhos-placements', () =>
  api.get<Placement[]>('/me/placements/hunter').catch(() => []))

async function refresh() {
  await Promise.all([refreshStats(), refreshPlacements()])
}

const ordered = computed(() => (placements.value ?? []).slice()
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

function fmtBRL(v: number | string | null | undefined) {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—'
}

// P2 — confirmar/contestar direto na lista.
const confirmingId = ref<string | null>(null)
const contestingId = ref<string | null>(null)
const contestReason = ref('')
const sendingContest = ref(false)
const expandedId = ref<string | null>(null)

async function confirmar(p: Placement) {
  confirmingId.value = p.id
  try {
    await api.post(`/placements/${p.id}/confirm`)
    toast.success('Placement confirmado! A garantia de 90 dias começou a contar.')
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível confirmar o placement.')
  }
  finally { confirmingId.value = null }
}
function abrirContestacao(p: Placement) {
  contestingId.value = p.id
  contestReason.value = ''
}
async function enviarContestacao(p: Placement) {
  if (!contestReason.value.trim()) return
  sendingContest.value = true
  try {
    await api.post(`/placements/${p.id}/contest`, { reason: contestReason.value.trim() })
    toast.info('Contestação enviada. Um administrador vai revisar.')
    contestingId.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível enviar a contestação.')
  }
  finally { sendingContest.value = false }
}
</script>

<template>
  <div class="ganhos">
    <header class="ganhos__header">
      <h1>Ganhos</h1>
      <p class="ganhos__sub">Suas indicações contratadas, confirmações pendentes e comissões.</p>
    </header>

    <div class="ganhos__kpis">
      <UiKpiCard :icon="Wallet" label="A receber" :value="fmtBRL(stats?.aReceber)" :loading="pendingStats" />
      <UiKpiCard :icon="DollarSign" label="Recebido no ano" :value="fmtBRL(stats?.recebidoNoAno)" :loading="pendingStats" />
      <UiKpiCard :icon="Briefcase" label="Placements confirmados" :value="String(stats?.placementsConfirmados ?? 0)" :loading="pendingStats" />
      <UiKpiCard :icon="ShieldCheck" label="Em garantia" :value="String(stats?.emGarantia ?? 0)" :loading="pendingStats" />
    </div>

    <h2 class="ganhos__subtitle">Placements</h2>

    <div v-if="pendingPlacements" class="ganhos__skel">
      <div v-for="n in 3" :key="n" class="skeleton ganhos__skel-row" />
    </div>

    <UiEmptyState
      v-else-if="!ordered.length"
      title="Nenhum placement ainda"
      description="Quando uma empresa marcar sua indicação como contratada, ela aparecerá aqui."
    />

    <ul v-else class="ganhos__list">
      <li v-for="p in ordered" :key="p.id" class="ganhos__item">
        <div class="ganhos__item-row">
          <div class="ganhos__item-main">
            <strong>{{ p.vaga?.title ?? 'Vaga' }}</strong>
            <span class="ganhos__meta">Contratado em {{ fmtData(p.createdAt) }} · Salário {{ fmtBRL(p.finalSalary) }}</span>
          </div>
          <div class="ganhos__item-right">
            <span v-if="p.hunterShareAmount != null" class="ganhos__valor">{{ fmtBRL(p.hunterShareAmount) }}</span>
            <UiBadge :variant="placementStatusVariant(p.status)">{{ PLACEMENT_STATUS_LABEL[p.status] }}</UiBadge>
          </div>
        </div>

        <!-- P2 — confirmação bilateral -->
        <div v-if="p.status === 'HIRED'" class="ganhos__actions">
          <p class="ganhos__hint">
            Confirme para liberar a garantia de 90 dias — se você não responder, o placement é
            confirmado automaticamente em até 7 dias.
          </p>
          <div class="ganhos__btns">
            <UiButton size="sm" :loading="confirmingId === p.id" @click="confirmar(p)">Confirmar</UiButton>
            <UiButton size="sm" variant="secondary" @click="abrirContestacao(p)">Contestar</UiButton>
          </div>
          <div v-if="contestingId === p.id" class="ganhos__contest">
            <textarea v-model="contestReason" rows="3" placeholder="Motivo da contestação..." class="ganhos__textarea" />
            <div class="ganhos__btns">
              <UiButton size="sm" variant="ghost" @click="contestingId = null">Cancelar</UiButton>
              <UiButton size="sm" variant="danger" :loading="sendingContest" :disabled="!contestReason.trim()" @click="enviarContestacao(p)">Enviar contestação</UiButton>
            </div>
          </div>
        </div>

        <!-- P3 — linha do tempo -->
        <div v-else class="ganhos__actions">
          <UiButton size="sm" variant="ghost" @click="expandedId = expandedId === p.id ? null : p.id">
            {{ expandedId === p.id ? 'Ocultar linha do tempo' : 'Ver linha do tempo' }}
          </UiButton>
          <PlacementTimeline v-if="expandedId === p.id" :placement-id="p.id" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ganhos__header h1 { font-size: var(--text-22); }
.ganhos__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.ganhos__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--sp-4); margin: var(--sp-5) 0; }
.ganhos__subtitle { font-size: var(--text-16); font-weight: 600; margin-bottom: var(--sp-3); }
.ganhos__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.ganhos__skel-row { height: 72px; border-radius: var(--radius-input); }
.ganhos__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.ganhos__item { background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.ganhos__item-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; }
.ganhos__item-main { display: flex; flex-direction: column; gap: 2px; }
.ganhos__meta { font-size: var(--text-13); color: var(--ink-500); }
.ganhos__item-right { display: flex; align-items: center; gap: var(--sp-3); }
.ganhos__valor { font-weight: 600; color: var(--brand-700); font-size: var(--text-16); }
.ganhos__actions { display: flex; flex-direction: column; gap: var(--sp-2); background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); }
.ganhos__hint { font-size: var(--text-13); color: var(--ink-700); margin: 0; }
.ganhos__btns { display: flex; gap: var(--sp-2); }
.ganhos__contest { display: flex; flex-direction: column; gap: var(--sp-2); }
.ganhos__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.ganhos__textarea:focus { outline: none; border-color: var(--brand-600); }
</style>
