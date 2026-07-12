<script setup lang="ts">
// PlacementTimeline (P3 — design-spec/06 §P): stepper horizontal Contratado→
// Confirmado→Em garantia→Fee liberado, + estados de exceção (Contestado,
// Reposição, Cancelado). Busca GET /placements/:id/timeline.
import type { PlacementTimelineResponse } from '~/types/placement'

const props = defineProps<{ placementId: string }>()

const api = useApi()
const loading = ref(true)
const data = ref<PlacementTimelineResponse | null>(null)
const error = ref(false)

async function load() {
  loading.value = true
  error.value = false
  try {
    data.value = await api.get<PlacementTimelineResponse>(`/placements/${props.placementId}/timeline`)
  }
  catch { error.value = true }
  finally { loading.value = false }
}

watch(() => props.placementId, load, { immediate: true })

const stepperItems = computed(() => (data.value?.steps ?? []).map(s => ({
  label: s.label,
  description: s.at ? fmt(s.at) : undefined,
})))
const current = computed(() => (data.value?.steps ?? []).filter(s => s.done).length)

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const placement = computed(() => data.value?.placement ?? null)
</script>

<template>
  <div class="pt">
    <p v-if="loading" class="pt__loading">Carregando linha do tempo...</p>
    <p v-else-if="error" class="pt__error">Não foi possível carregar a linha do tempo.</p>
    <template v-else-if="placement">
      <UiStepper :steps="stepperItems" :current="current" />

      <div v-if="placement.status === 'DISPUTED'" class="pt__banner pt__banner--danger">
        <strong>Contestado</strong>
        <span v-if="placement.disputedAt">em {{ fmt(placement.disputedAt) }}</span>
        <p v-if="placement.disputeReason">Motivo: {{ placement.disputeReason }}</p>
        <p class="pt__hint">Aguardando resolução da disputa por um administrador.</p>
      </div>

      <div v-else-if="placement.status === 'GUARANTEE_BROKEN'" class="pt__banner pt__banner--amber">
        <strong>Garantia quebrada</strong>
        <span v-if="placement.departureDate">saída em {{ fmt(placement.departureDate) }}</span>
        <p v-if="placement.departureReason">Motivo: {{ placement.departureReason }}</p>
        <p class="pt__hint">
          {{ placement.replacedByPlacementId ? 'Reposição em andamento — nova indicação vinculada.' : 'Aguardando reposição ou estorno.' }}
        </p>
      </div>

      <div v-else-if="placement.status === 'REPLACED'" class="pt__banner pt__banner--neutral">
        <strong>Substituído</strong>
        <p class="pt__hint">Este placement foi encerrado e substituído por uma reposição.</p>
      </div>

      <div v-else-if="placement.status === 'CANCELLED'" class="pt__banner pt__banner--neutral">
        <strong>Cancelado</strong>
        <p class="pt__hint">Disputa resolvida com cancelamento do placement.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pt { display: flex; flex-direction: column; gap: var(--sp-4); }
.pt__loading, .pt__error { font-size: var(--text-13); color: var(--ink-500); }
.pt__banner {
  border-radius: var(--radius-md); padding: var(--sp-3) var(--sp-4);
  display: flex; flex-direction: column; gap: 2px; font-size: var(--text-13);
}
.pt__banner strong { font-size: var(--text-14); }
.pt__banner p { margin: 0; }
.pt__hint { color: inherit; opacity: 0.85; }
.pt__banner--danger { background: var(--red-100); color: var(--red-500); }
.pt__banner--amber { background: var(--amber-100); color: #92400E; }
.pt__banner--neutral { background: var(--ink-100); color: var(--ink-700); }
</style>
