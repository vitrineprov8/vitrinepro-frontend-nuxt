<script setup lang="ts">
// MarkHiredModal (P1 — design-spec/06 §P): marcar candidatura como contratada.
// Bloco de fee/garantia só aparece quando a candidatura veio de um hunter
// (marketplace) — contratações diretas confirmam na hora, sem fee.
import type { PlacementRegime } from '~/types/placement'

export interface MarkHiredApplication {
  id: string
  source?: 'DIRECT' | 'HUNTER'
  snapshotFullName: string
}
export interface MarkHiredVaga {
  id: string
  title: string
  feePercent: number | string | null
  feeAmount: number | string | null
}

const props = defineProps<{ open: boolean, application: MarkHiredApplication | null, vaga: MarkHiredVaga | null }>()
const emit = defineEmits<{ close: [], hired: [placement: { id: string, status: string }] }>()

const api = useApi()
const toast = useToast()

const finalSalary = ref<number | null>(null)
const regime = ref<PlacementRegime | null>('CLT')
const startDate = ref<string | null>(null)
const termsAccepted = ref(false)
const saving = ref(false)

const regimeOptions = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
]

const isHunterSourced = computed(() => props.application?.source === 'HUNTER')

const feeTotal = computed(() => {
  if (!props.vaga || !finalSalary.value) return 0
  const feePercent = props.vaga.feePercent != null ? Number(props.vaga.feePercent) : null
  const feeAmount = props.vaga.feeAmount != null ? Number(props.vaga.feeAmount) : null
  if (feePercent != null) return Math.round(finalSalary.value * feePercent) / 100
  if (feeAmount != null) return feeAmount
  return 0
})
// Estimativa (75%/25% é o default da plataforma — o split real pode ter sido
// negociado por acordo comercial específico da empresa, calculado no servidor).
const hunterShareEstimate = computed(() => Math.round(feeTotal.value * 0.75 * 100) / 100)

const guaranteeEndDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toLocaleDateString('pt-BR')
})

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

watch(() => props.open, (o) => {
  if (!o) return
  finalSalary.value = null
  regime.value = 'CLT'
  startDate.value = null
  termsAccepted.value = false
})

const canSubmit = computed(() => {
  if (!finalSalary.value || finalSalary.value <= 0) return false
  if (isHunterSourced.value && !termsAccepted.value) return false
  return true
})

async function confirmar() {
  if (!props.application || !canSubmit.value) return
  saving.value = true
  try {
    const placement = await api.post<{ id: string, status: string }>(`/applications/${props.application.id}/placement`, {
      finalSalary: finalSalary.value,
      regime: regime.value,
      startDate: startDate.value ?? undefined,
      termsAccepted: isHunterSourced.value ? termsAccepted.value : undefined,
    })
    toast.success('Candidato marcado como contratado! 🎉')
    emit('hired', placement)
    emit('close')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível marcar como contratado.')
  }
  finally { saving.value = false }
}
</script>

<template>
  <UiModal :open="open" title="Marcar como contratado" size="lg" @close="emit('close')">
    <div v-if="application" class="mh">
      <div class="mh__resumo">
        <span class="mh__label">Candidato</span>
        <strong>{{ application.snapshotFullName }}</strong>
        <span v-if="vaga" class="mh__vaga">{{ vaga.title }}</span>
        <UiBadge v-if="isHunterSourced" variant="outline">Indicado por hunter</UiBadge>
      </div>

      <div class="mh__fields">
        <UiDatepicker v-model="startDate" label="Data de início" />
        <UiCurrencyInput v-model="finalSalary" label="Salário final" required />
        <UiSelect v-model="regime" :options="regimeOptions" label="Regime" />
      </div>

      <div v-if="isHunterSourced" class="mh__fee">
        <h4 class="mh__fee-title">Fee &amp; garantia</h4>
        <div class="mh__fee-row"><span>Fee total ({{ vaga?.feePercent ? `${vaga.feePercent}%` : 'valor fixo' }})</span><strong>{{ fmtBRL(feeTotal) }}</strong></div>
        <div class="mh__fee-row mh__fee-row--muted"><span>Estimativa do hunter (75%)</span><span>{{ fmtBRL(hunterShareEstimate) }}</span></div>
        <p class="mh__fee-note">O split final é calculado no servidor conforme o acordo comercial vigente.</p>
        <div class="mh__fee-row"><span>Garantia</span><strong>90 dias (até {{ guaranteeEndDate }})</strong></div>
        <label class="mh__terms">
          <input v-model="termsAccepted" type="checkbox">
          <span>Li e aceito os termos do placement (fee e garantia de 90 dias).</span>
        </label>
      </div>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Cancelar</UiButton>
      <UiButton :loading="saving" :disabled="!canSubmit" @click="confirmar">Confirmar contratação</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.mh { display: flex; flex-direction: column; gap: var(--sp-5); }
.mh__resumo { display: flex; flex-direction: column; gap: 2px; padding-bottom: var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.mh__label { font-size: var(--text-12); color: var(--ink-500); }
.mh__vaga { font-size: var(--text-13); color: var(--ink-700); }
.mh__fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--sp-3); }
.mh__fee { background: var(--ink-100); border-radius: var(--radius-md); padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); }
.mh__fee-title { font-size: var(--text-14); margin: 0 0 var(--sp-1); }
.mh__fee-row { display: flex; justify-content: space-between; font-size: var(--text-14); }
.mh__fee-row--muted { color: var(--ink-500); font-size: var(--text-13); }
.mh__fee-note { font-size: var(--text-12); color: var(--ink-500); margin: 0; }
.mh__terms { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-13); margin-top: var(--sp-2); }
.mh__terms input { margin-top: 3px; }

@media (max-width: 640px) {
  .mh__fields { grid-template-columns: 1fr; }
}
</style>
