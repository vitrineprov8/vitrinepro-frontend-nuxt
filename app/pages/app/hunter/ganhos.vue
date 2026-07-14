<script setup lang="ts">
// T-H09 — Ganhos do hunter (design-spec/06 §P). KPIs (GET /stats/hunter/ganhos,
// B12) + lista de placements do hunter (GET /me/placements/hunter, B9) com
// confirmação bilateral (P2) e linha do tempo (P3) inline.
//
// Tab "Extrato" (B25) — configurar dados de recebimento (Pix + CPF/CNPJ) e
// acompanhar o pagamento de cada comissão. Decisão arquitetural: um admin
// revisa e aprova cada pagamento manualmente (segurança); assim que aprovado,
// o sistema executa a transferência automaticamente via Asaas — o hunter só
// vê o status evoluir (Aguardando revisão → Processando → Pago).
import { DollarSign, Wallet, Briefcase, ShieldCheck, Landmark, FileUp } from 'lucide-vue-next'
import type { Placement } from '~/types/placement'
import { PLACEMENT_STATUS_LABEL, placementStatusVariant } from '~/types/placement'
import type { Payout, PayoutConfig, PixKeyType, PayoutLegalType } from '~/types/payout'
import { PAYOUT_STATUS_LABEL, payoutStatusVariant, PIX_KEY_TYPE_OPTIONS, PAYOUT_LEGAL_TYPE_OPTIONS } from '~/types/payout'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Ganhos — Hunter' })

const api = useApi()
const toast = useToast()

const tab = ref<'placements' | 'extrato'>('placements')
const tabs = [
  { value: 'placements', label: 'Placements' },
  { value: 'extrato', label: 'Extrato' },
]

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

// ── Extrato (B25) ────────────────────────────────────────────────────────
const { data: payoutConfig, refresh: refreshConfig } = await useAsyncData('hunter-payout-config', () =>
  api.get<PayoutConfig>('/me/payout-config').catch(() => null))
const { data: payouts, pending: pendingPayouts, refresh: refreshPayouts } = await useAsyncData('hunter-payouts', () =>
  api.get<Payout[]>('/me/payouts').catch(() => []))

const configuredDisplay = computed(() => {
  const c = payoutConfig.value
  if (!c?.pixKey) return null
  const typeLabel = PIX_KEY_TYPE_OPTIONS.find(o => o.value === c.pixKeyType)?.label ?? c.pixKeyType
  return `${typeLabel}: ${c.pixKey}`
})

const configModalOpen = ref(false)
const cfgPixKey = ref('')
const cfgPixKeyType = ref<PixKeyType | null>(null)
const cfgLegalType = ref<PayoutLegalType | null>(null)
const cfgCpfCnpj = ref('')
const savingConfig = ref(false)

function openConfigModal() {
  cfgPixKey.value = payoutConfig.value?.pixKey ?? ''
  cfgPixKeyType.value = payoutConfig.value?.pixKeyType ?? null
  cfgLegalType.value = payoutConfig.value?.legalType ?? null
  cfgCpfCnpj.value = payoutConfig.value?.cpfCnpj ?? ''
  configModalOpen.value = true
}

async function saveConfig() {
  if (!cfgPixKey.value.trim() || !cfgPixKeyType.value || !cfgLegalType.value || !cfgCpfCnpj.value.trim()) {
    toast.error('Preencha todos os campos.')
    return
  }
  savingConfig.value = true
  try {
    await api.patch('/me/payout-config', {
      pixKey: cfgPixKey.value.trim(),
      pixKeyType: cfgPixKeyType.value,
      legalType: cfgLegalType.value,
      cpfCnpj: cfgCpfCnpj.value.trim(),
    })
    toast.success('Dados de recebimento salvos.')
    configModalOpen.value = false
    await Promise.all([refreshConfig(), refreshPayouts()])
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível salvar os dados de recebimento.')
  }
  finally { savingConfig.value = false }
}

// Upload de NF (obrigatório só se PJ/MEI — mas liberamos o upload sempre que
// houver payout, o backend não bloqueia, é o hunter que decide se é preciso).
const nfInputs = ref<Record<string, HTMLInputElement | undefined>>({})
const uploadingNfId = ref<string | null>(null)

function pickNf(payoutId: string) {
  nfInputs.value[payoutId]?.click()
}
async function onNfSelected(e: Event, payoutId: string) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingNfId.value = payoutId
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post(`/payouts/${payoutId}/nf`, form)
    toast.success('Nota fiscal anexada.')
    await refreshPayouts()
  }
  catch (e2) {
    const err = e2 as { message?: string }
    toast.error(err.message || 'Não foi possível enviar a nota fiscal.')
  }
  finally {
    uploadingNfId.value = null
    const input = nfInputs.value[payoutId]
    if (input) input.value = ''
  }
}

const showNf = computed(() => cfgLegalType.value === 'PJ' || cfgLegalType.value === 'MEI' || payoutConfig.value?.legalType === 'PJ' || payoutConfig.value?.legalType === 'MEI')
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

    <UiTabs v-model="tab" :tabs="tabs" />

    <!-- Tab Placements -->
    <div v-if="tab === 'placements'" class="ganhos__tab">
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

    <!-- Tab Extrato (B25) -->
    <div v-else class="ganhos__tab">
      <div class="extrato__config">
        <div class="extrato__config-info">
          <Landmark :size="20" />
          <div>
            <strong>Dados de recebimento</strong>
            <p v-if="configuredDisplay" class="extrato__config-value">{{ configuredDisplay }}</p>
            <p v-else class="extrato__config-empty">Configure sua chave Pix para receber suas comissões.</p>
          </div>
        </div>
        <UiButton size="sm" variant="secondary" @click="openConfigModal">
          {{ configuredDisplay ? 'Editar' : 'Configurar recebimento' }}
        </UiButton>
      </div>

      <p class="ganhos__hint2">
        Cada comissão liberada passa por revisão de um administrador antes do pagamento — depois de
        aprovada, a transferência via Pix é feita automaticamente pelo sistema.
      </p>

      <div v-if="pendingPayouts" class="ganhos__skel">
        <div v-for="n in 2" :key="n" class="skeleton ganhos__skel-row" />
      </div>

      <UiEmptyState
        v-else-if="!payouts?.length"
        title="Nenhum pagamento ainda"
        description="Quando uma comissão for liberada, o pagamento aparecerá aqui."
      />

      <ul v-else class="ganhos__list">
        <li v-for="p in payouts" :key="p.id" class="ganhos__item">
          <div class="ganhos__item-row">
            <div class="ganhos__item-main">
              <strong>{{ p.placement?.vaga?.title ?? 'Comissão' }}</strong>
              <span class="ganhos__meta">Criado em {{ fmtData(p.createdAt) }}</span>
              <span v-if="p.status === 'REJECTED' && p.rejectionReason" class="extrato__reason">Motivo: {{ p.rejectionReason }}</span>
              <span v-if="p.status === 'FAILED' && p.failureReason" class="extrato__reason">Motivo: {{ p.failureReason }}</span>
            </div>
            <div class="ganhos__item-right">
              <span class="ganhos__valor">{{ fmtBRL(p.amount) }}</span>
              <UiBadge :variant="payoutStatusVariant(p.status)">{{ PAYOUT_STATUS_LABEL[p.status] }}</UiBadge>
            </div>
          </div>
          <div v-if="showNf" class="ganhos__actions">
            <input :ref="(el) => { nfInputs[p.id] = el as HTMLInputElement }" type="file" accept="application/pdf" class="extrato__file-input" @change="onNfSelected($event, p.id)">
            <UiButton size="sm" variant="ghost" :loading="uploadingNfId === p.id" @click="pickNf(p.id)">
              <FileUp :size="14" /> {{ p.nfUrl ? 'Substituir nota fiscal' : 'Anexar nota fiscal (PJ/MEI)' }}
            </UiButton>
            <a v-if="p.nfUrl" :href="p.nfUrl" target="_blank" rel="noopener" class="extrato__nf-link">Ver NF anexada</a>
          </div>
        </li>
      </ul>
    </div>

    <UiModal :open="configModalOpen" title="Configurar recebimento" size="sm" @close="configModalOpen = false">
      <div class="extrato__modal">
        <UiSelect v-model="cfgPixKeyType" label="Tipo de chave Pix" :options="PIX_KEY_TYPE_OPTIONS" required />
        <UiInput v-model="cfgPixKey" label="Chave Pix" placeholder="CPF, e-mail, telefone ou chave aleatória" required />
        <UiSelect v-model="cfgLegalType" label="Tipo de pessoa" :options="PAYOUT_LEGAL_TYPE_OPTIONS" required />
        <UiInput v-model="cfgCpfCnpj" label="CPF/CNPJ" placeholder="Somente números" required />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="configModalOpen = false">Cancelar</UiButton>
        <UiButton :loading="savingConfig" @click="saveConfig">Salvar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.ganhos__header h1 { font-size: var(--text-22); }
.ganhos__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.ganhos__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--sp-4); margin: var(--sp-5) 0; }
.ganhos__tab { margin-top: var(--sp-5); }
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
.ganhos__hint2 { font-size: var(--text-13); color: var(--ink-500); margin: var(--sp-4) 0; }
.ganhos__btns { display: flex; gap: var(--sp-2); }
.ganhos__contest { display: flex; flex-direction: column; gap: var(--sp-2); }
.ganhos__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.ganhos__textarea:focus { outline: none; border-color: var(--brand-600); }

.extrato__config {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4);
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card);
  padding: var(--sp-4); margin-bottom: var(--sp-3);
}
.extrato__config-info { display: flex; align-items: flex-start; gap: var(--sp-3); color: var(--ink-700); }
.extrato__config-value { font-size: var(--text-13); color: var(--ink-500); margin-top: 2px; }
.extrato__config-empty { font-size: var(--text-13); color: var(--amber-600, #b45309); margin-top: 2px; }
.extrato__reason { font-size: var(--text-12); color: var(--red-500); }
.extrato__file-input { display: none; }
.extrato__nf-link { font-size: var(--text-13); color: var(--brand-700); text-decoration: underline; }
.extrato__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
</style>
