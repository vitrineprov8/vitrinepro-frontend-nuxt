<script setup lang="ts">
// T05 — Listagem de vagas (usado por /vagas e /vagas/[segmento]).
// Dados reais de GET /vagas/radar. Filtro "com fee" é proxy de allowHunters (gap B4).
import type { Vaga, VagaSegment, PaginatedResult } from '~/types/vaga'
import {
  VAGA_SEGMENT_LABEL, VAGA_SEGMENTS,
  VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL,
} from '~/types/vaga'

const props = defineProps<{ lockedSegment?: VagaSegment | null }>()

const api = useApi()
const route = useRoute()
const router = useRouter()

// --- Estado dos filtros (inicializado a partir da URL) ---
const q = ref((route.query.q as string) || '')
const segment = ref<string | null>((route.query.segment as string) || null)
const city = ref((route.query.city as string) || '')
const type = ref<string | null>((route.query.type as string) || null)
const workMode = ref<string | null>((route.query.workMode as string) || null)
const salaryMin = ref<number | null>(route.query.salaryMin ? Number(route.query.salaryMin) : null)
const order = ref<string>(route.query.order === 'relevance' ? 'relevance' : 'recent')
const soFee = ref(route.query.fee === 'true') // proxy: allowHunters
const page = ref(Number(route.query.page) || 1)
const limit = 12

const filtersOpen = ref(false) // drawer mobile

const segmentOptions = VAGA_SEGMENTS.map(s => ({ value: s, label: VAGA_SEGMENT_LABEL[s] }))
const typeOptions = (Object.keys(VAGA_TYPE_LABEL) as (keyof typeof VAGA_TYPE_LABEL)[])
  .map(t => ({ value: t, label: VAGA_TYPE_LABEL[t] }))
const workModeOptions = (Object.keys(VAGA_WORK_MODE_LABEL) as (keyof typeof VAGA_WORK_MODE_LABEL)[])
  .map(m => ({ value: m, label: VAGA_WORK_MODE_LABEL[m] }))
const orderOptions = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'relevance', label: 'Relevância' },
]

// Segmento efetivo: travado pela rota tem prioridade.
const effectiveSegment = computed(() => props.lockedSegment ?? (segment.value as VagaSegment | null))

// --- Query para o backend (omite campos vazios; ofetch remove undefined) ---
const apiQuery = computed<Record<string, unknown>>(() => ({
  page: page.value,
  limit,
  q: q.value.trim() || undefined,
  segment: effectiveSegment.value || undefined,
  city: city.value.trim() || undefined,
  type: type.value || undefined,
  workMode: workMode.value || undefined,
  salaryMin: salaryMin.value ?? undefined,
  order: order.value,
}))

const { data, pending } = await useAsyncData(
  'vagas-radar',
  () => api.get<PaginatedResult<Vaga>>('/vagas/radar', apiQuery.value).catch(() => null),
  { watch: [apiQuery] },
)

// Lista exibida (filtro "com fee" aplicado no cliente — proxy allowHunters).
const vagas = computed<Vaga[]>(() => {
  const list = data.value?.data ?? []
  return soFee.value ? list.filter(v => v.allowHunters) : list
})
const total = computed(() => data.value?.total ?? 0)
const lastPage = computed(() => data.value?.lastPage ?? 1)

// Reset de página quando um filtro (exceto página) muda.
const filterSignature = computed(() =>
  JSON.stringify([q.value, segment.value, city.value, type.value, workMode.value, salaryMin.value, order.value]))
watch(filterSignature, () => { if (page.value !== 1) page.value = 1 })

// Sincroniza a URL (compartilhável) — só no cliente.
watch(apiQuery, () => {
  if (!import.meta.client) return
  const query: Record<string, string> = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (!props.lockedSegment && segment.value) query.segment = segment.value
  if (city.value.trim()) query.city = city.value.trim()
  if (type.value) query.type = type.value
  if (workMode.value) query.workMode = workMode.value
  if (salaryMin.value != null) query.salaryMin = String(salaryMin.value)
  if (order.value !== 'recent') query.order = order.value
  if (soFee.value) query.fee = 'true'
  if (page.value > 1) query.page = String(page.value)
  router.replace({ query })
}, { flush: 'post' })

// --- Chips de filtros ativos ---
interface Chip { key: string, label: string, clear: () => void }
const chips = computed<Chip[]>(() => {
  const arr: Chip[] = []
  if (q.value.trim()) arr.push({ key: 'q', label: `"${q.value.trim()}"`, clear: () => { q.value = '' } })
  if (!props.lockedSegment && segment.value)
    arr.push({ key: 'segment', label: VAGA_SEGMENT_LABEL[segment.value as VagaSegment], clear: () => { segment.value = null } })
  if (city.value.trim()) arr.push({ key: 'city', label: city.value.trim(), clear: () => { city.value = '' } })
  if (type.value) arr.push({ key: 'type', label: VAGA_TYPE_LABEL[type.value as keyof typeof VAGA_TYPE_LABEL], clear: () => { type.value = null } })
  if (workMode.value) arr.push({ key: 'workMode', label: VAGA_WORK_MODE_LABEL[workMode.value as keyof typeof VAGA_WORK_MODE_LABEL], clear: () => { workMode.value = null } })
  if (salaryMin.value != null) arr.push({ key: 'salaryMin', label: `A partir de R$ ${salaryMin.value.toLocaleString('pt-BR')}`, clear: () => { salaryMin.value = null } })
  if (soFee.value) arr.push({ key: 'fee', label: 'Com fee para hunters', clear: () => { soFee.value = false } })
  return arr
})
const hasFilters = computed(() => chips.value.length > 0)
function clearAll() {
  q.value = ''; if (!props.lockedSegment) segment.value = null
  city.value = ''; type.value = null; workMode.value = null
  salaryMin.value = null; soFee.value = false
}

// --- Header ---
const heading = computed(() =>
  effectiveSegment.value ? `Vagas de ${VAGA_SEGMENT_LABEL[effectiveSegment.value]}` : 'Todas as vagas')

// --- SEO: canonical sem query + JSON-LD ItemList ---
const frontendUrl = useRuntimeConfig().public.frontendUrl
useHead(() => ({
  link: [{ rel: 'canonical', href: `${frontendUrl}${route.path}` }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'itemListElement': vagas.value.map((v, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `${frontendUrl}/vaga/${v.slug}`,
        'name': v.title,
      })),
    }),
  }],
}))
</script>

<template>
  <div class="vagas container">
    <header class="vagas__header">
      <h1>{{ heading }}</h1>
      <p class="vagas__count">{{ total }} vaga{{ total === 1 ? '' : 's' }} aberta{{ total === 1 ? '' : 's' }}</p>
    </header>

    <div class="vagas__layout">
      <!-- Sidebar de filtros (vira off-canvas no mobile) -->
      <aside class="filters" :class="{ 'filters--open': filtersOpen }">
        <div class="filters__head">
          <h2 class="filters__title">Filtrar</h2>
          <button class="filters__close" aria-label="Fechar filtros" @click="filtersOpen = false">✕</button>
        </div>

        <UiInput v-model="q" label="Buscar" placeholder="Cargo, palavra-chave..." />
        <UiSelect
          v-if="!props.lockedSegment"
          v-model="segment" label="Segmento" :options="segmentOptions" placeholder="Todos os segmentos"
        />
        <UiInput v-model="city" label="Cidade" placeholder="Ex.: São Paulo" />
        <UiSelect v-model="type" label="Tipo de contrato" :options="typeOptions" placeholder="Qualquer tipo" />
        <UiSelect v-model="workMode" label="Modelo de trabalho" :options="workModeOptions" placeholder="Qualquer modelo" />
        <UiCurrencyInput v-model="salaryMin" label="Salário mínimo" />

        <label class="filters__check">
          <input v-model="soFee" type="checkbox">
          <span>Somente vagas com fee para hunters</span>
        </label>
        <p class="filters__hint">Prévia por “aceita hunters”. O fee em R$ chega com o marketplace.</p>

        <UiButton class="filters__apply" block @click="filtersOpen = false">Ver {{ total }} vaga{{ total === 1 ? '' : 's' }}</UiButton>
      </aside>

      <div v-if="filtersOpen" class="filters__backdrop" @click="filtersOpen = false" />

      <!-- Resultados -->
      <section class="results">
        <div class="results__bar">
          <UiButton variant="secondary" size="sm" class="results__filter-btn" @click="filtersOpen = true">
            Filtrar
          </UiButton>
          <div class="results__order">
            <span class="results__order-label">Ordenar:</span>
            <UiSelect v-model="order" :options="orderOptions" />
          </div>
        </div>

        <div v-if="hasFilters" class="results__chips">
          <button v-for="c in chips" :key="c.key" class="chip" @click="c.clear()">
            {{ c.label }} <span aria-hidden="true">✕</span>
          </button>
          <button class="chip chip--clear" @click="clearAll">Limpar tudo</button>
        </div>

        <div v-if="pending" class="results__grid">
          <div v-for="n in 6" :key="n" class="skeleton results__skel" />
        </div>

        <template v-else-if="vagas.length">
          <div class="results__grid">
            <VagaCard v-for="v in vagas" :key="v.id" :vaga="v" />
          </div>
          <UiPagination
            v-if="lastPage > 1"
            class="results__pagination"
            :page="page" :last-page="lastPage" :total="total"
            @update:page="page = $event"
          />
        </template>

        <UiEmptyState
          v-else
          title="Nenhuma vaga com esses filtros"
          description="Tente remover alguns filtros ou ampliar a busca."
        >
          <template v-if="hasFilters" #action>
            <UiButton variant="secondary" @click="clearAll">Limpar filtros</UiButton>
          </template>
        </UiEmptyState>
      </section>
    </div>
  </div>
</template>

<style scoped>
.vagas { padding: var(--sp-8) 0 var(--sp-16); }
.vagas__header { margin-bottom: var(--sp-6); }
.vagas__count { color: var(--ink-500); font-size: var(--text-14); margin-top: var(--sp-1); }
.vagas__layout { display: grid; grid-template-columns: 260px 1fr; gap: var(--sp-8); align-items: start; }

.filters {
  display: flex; flex-direction: column; gap: var(--sp-4);
  background: var(--white); border: 1px solid var(--ink-100);
  border-radius: var(--radius-card); padding: var(--sp-5);
  position: sticky; top: calc(var(--topbar-h) + var(--sp-4));
}
.filters__head { display: flex; align-items: center; justify-content: space-between; }
.filters__title { font-size: var(--text-16); }
.filters__close { display: none; background: none; border: none; font-size: var(--text-18); cursor: pointer; color: var(--ink-500); }
.filters__check { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-13); cursor: pointer; }
.filters__check input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--brand-600); flex-shrink: 0; }
.filters__hint { font-size: var(--text-12); color: var(--ink-500); margin: 0; }
.filters__apply { display: none; }
.filters__backdrop { display: none; }

.results__bar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); margin-bottom: var(--sp-4); }
.results__filter-btn { display: none; }
.results__order { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; }
.results__order-label { font-size: var(--text-13); color: var(--ink-500); white-space: nowrap; }
.results__order :deep(.field) { min-width: 160px; }

.results__chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.chip {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  background: var(--ink-100); color: var(--ink-700); border: none;
  border-radius: var(--radius-full); padding: 4px var(--sp-3);
  font-size: var(--text-12); cursor: pointer;
}
.chip:hover { background: var(--ink-300); }
.chip--clear { background: transparent; color: var(--brand-700); font-weight: 600; }

.results__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
.results__skel { height: 150px; border-radius: var(--radius-card); }
.results__pagination { margin-top: var(--sp-8); }

@media (max-width: 900px) {
  .vagas__layout { grid-template-columns: 1fr; }
  .results__filter-btn { display: inline-flex; }
  .filters {
    position: fixed; top: 0; right: 0; bottom: 0; left: auto;
    width: 86%; max-width: 360px; z-index: 110;
    border-radius: 0; overflow-y: auto;
    transform: translateX(100%); transition: transform var(--t-overlay);
  }
  .filters--open { transform: translateX(0); }
  .filters__close { display: block; }
  .filters__apply { display: inline-flex; }
  .filters__backdrop { display: block; position: fixed; inset: 0; z-index: 105; background: rgba(11, 18, 32, 0.5); }
  .results__grid { grid-template-columns: 1fr; }
}
</style>
