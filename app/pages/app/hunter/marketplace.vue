<script setup lang="ts">
// T-H07 — Marketplace de vagas para hunters (B4). Reusa GET /vagas/radar
// filtrado por allowHunters=true; termos são aceitos no drawer de /vaga/[slug]
// (mesmo fluxo "Quero esta vaga" da página pública), para não duplicar lógica.
import type { Vaga, PaginatedResult } from '~/types/vaga'
import { VAGA_SEGMENTS, VAGA_SEGMENT_LABEL } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Marketplace de vagas' })

const api = useApi()
const auth = useAuthStore()
// B8 — gate do marketplace: só hunter com verificationStatus APPROVED trabalha vagas com fee.
const isVerified = computed(() => auth.user?.verificationStatus === 'APPROVED')

const q = ref('')
const segment = ref<string | null>(null)
const feeMin = ref<number | null>(null)
const order = ref<string | null>('fee')
const page = ref(1)

const segmentOptions = VAGA_SEGMENTS.map(s => ({ value: s, label: VAGA_SEGMENT_LABEL[s] }))
const orderOptions = [
  { value: 'fee', label: 'Maior fee' },
  { value: 'recent', label: 'Recentes' },
]

const { data: resp, pending, refresh } = await useAsyncData('hunter-marketplace', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/radar', {
    allowHunters: true,
    q: q.value || undefined,
    segment: segment.value || undefined,
    feeMin: feeMin.value ?? undefined,
    order: (order.value ?? 'fee') as 'fee' | 'recent',
    page: page.value,
    limit: 12,
  }).catch(() => null),
{ watch: [q, segment, feeMin, order, page] })

const vagas = computed<Vaga[]>(() => resp.value?.data ?? [])
</script>

<template>
  <div class="mkt">
    <header class="mkt__head">
      <h1>Marketplace de vagas</h1>
      <p class="text-secondary">Vagas abertas a hunters, com fee e termos de intermediação.</p>
    </header>

    <div class="mkt__gate-wrap">
      <div class="mkt__body" :class="{ 'mkt__body--locked': !isVerified }">
        <div class="mkt__filters">
          <UiInput v-model="q" placeholder="Buscar por título..." />
          <UiSelect v-model="segment" :options="segmentOptions" placeholder="Segmento" />
          <UiCurrencyInput v-model="feeMin" label="" placeholder="Fee mínimo (R$)" />
          <UiSelect v-model="order" :options="orderOptions" placeholder="Ordenar" />
        </div>

        <div v-if="pending" class="mkt__grid">
          <div v-for="i in 6" :key="i" class="skeleton mkt__skeleton" />
        </div>

        <UiEmptyState
          v-else-if="!vagas.length"
          title="Nenhuma vaga encontrada"
          description="Ajuste os filtros ou volte mais tarde — novas vagas com fee aparecem aqui assim que publicadas."
        />

        <div v-else class="mkt__grid">
          <VagaCard v-for="v in vagas" :key="v.id" :vaga="v" />
        </div>

        <UiPagination
          v-if="resp && resp.lastPage > 1"
          :page="page" :last-page="resp.lastPage" :total="resp.total"
          @update:page="page = $event"
        />
      </div>

      <!-- B8 — gate do marketplace: overlay + CTA enquanto o hunter não estiver verificado -->
      <div v-if="!isVerified" class="mkt__overlay">
        <UiCard class="mkt__gate-card">
          <h3>Verifique seu perfil para trabalhar vagas com fee</h3>
          <p class="text-secondary">
            Envie seus documentos para liberar o selo "Verificado" e poder registrar interesse e submeter candidatos
            às vagas do marketplace.
          </p>
          <UiButton @click="navigateTo('/app/hunter/perfil')">Verificar meu perfil</UiButton>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mkt__head { margin-bottom: var(--sp-6); }
.mkt__head h1 { font-size: var(--text-22); margin-bottom: var(--sp-1); }
.mkt__filters {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--sp-3);
  margin-bottom: var(--sp-6);
}
.mkt__grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4); margin-bottom: var(--sp-6);
}
.mkt__skeleton { height: 180px; border-radius: var(--radius-card); }
@media (max-width: 900px) {
  .mkt__filters { grid-template-columns: 1fr 1fr; }
}

.mkt__gate-wrap { position: relative; }
.mkt__body--locked { filter: blur(4px); pointer-events: none; user-select: none; }
.mkt__overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: var(--sp-6);
}
.mkt__gate-card { max-width: 420px; text-align: center; display: flex; flex-direction: column; gap: var(--sp-3); box-shadow: var(--shadow-md); }
.mkt__gate-card h3 { font-size: var(--text-16); }
</style>
