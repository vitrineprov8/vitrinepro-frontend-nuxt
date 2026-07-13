<script setup lang="ts">
// T-C03 — Radar de Vagas. Desktop: filtros + grid (padrão T05) com barra de filtros salvos.
// Mobile: deck de swipe (threshold 30%, velocity 0.6), tutorial na 1ª vez, botões fallback.
import type { Vaga, VagaSegment, PaginatedResult } from '~/types/vaga'
import {
  VAGA_SEGMENT_LABEL, VAGA_SEGMENTS, VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL,
} from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Radar de Vagas — Candidato' })

const api = useApi()
const toast = useToast()

// ── Filtros ──────────────────────────────────────────────────────────────────
const q = ref('')
const segment = ref<string | null>(null)
const city = ref('')
const type = ref<string | null>(null)
const workMode = ref<string | null>(null)
const salaryMin = ref<number | null>(null)
const page = ref(1)
const limit = 12
const filtersOpen = ref(false)

const segmentOptions = VAGA_SEGMENTS.map(s => ({ value: s, label: VAGA_SEGMENT_LABEL[s] }))
const typeOptions = (Object.keys(VAGA_TYPE_LABEL) as (keyof typeof VAGA_TYPE_LABEL)[]).map(t => ({ value: t, label: VAGA_TYPE_LABEL[t] }))
const workModeOptions = (Object.keys(VAGA_WORK_MODE_LABEL) as (keyof typeof VAGA_WORK_MODE_LABEL)[]).map(m => ({ value: m, label: VAGA_WORK_MODE_LABEL[m] }))

const apiQuery = computed(() => ({
  page: page.value,
  limit,
  q: q.value.trim() || undefined,
  segment: segment.value || undefined,
  city: city.value.trim() || undefined,
  type: type.value || undefined,
  workMode: workMode.value || undefined,
  salaryMin: salaryMin.value ?? undefined,
}))

const { data, pending, refresh } = await useAsyncData(
  'candidato-radar-vagas',
  () => api.get<PaginatedResult<Vaga>>('/vagas/radar', apiQuery.value).catch(() => null),
  { watch: [apiQuery] },
)
const vagas = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)
const lastPage = computed(() => data.value?.lastPage ?? 1)

const filterSignature = computed(() => JSON.stringify([q.value, segment.value, city.value, type.value, workMode.value, salaryMin.value]))
watch(filterSignature, () => { if (page.value !== 1) page.value = 1 })

function clearAll() {
  q.value = ''; segment.value = null; city.value = ''; type.value = null; workMode.value = null; salaryMin.value = null
}
const hasFilters = computed(() => !!(q.value.trim() || segment.value || city.value.trim() || type.value || workMode.value || salaryMin.value != null))

// ── Filtros salvos ───────────────────────────────────────────────────────────
interface SavedFilter { id: string, name: string, filters: Record<string, unknown>, isDefault: boolean }
const { data: savedFilters, refresh: refreshSavedFilters } = await useAsyncData('candidato-radar-saved-filters', () =>
  api.get<SavedFilter[]>('/me/saved-filters').catch(() => []))

function applySavedFilter(f: SavedFilter) {
  const flt = f.filters || {}
  q.value = (flt.q as string) || ''
  segment.value = (flt.segment as string) || null
  city.value = (flt.city as string) || ''
  type.value = (flt.type as string) || null
  workMode.value = (flt.workMode as string) || null
  salaryMin.value = (flt.salaryMin as number) ?? null
}

// Aplica o filtro default automaticamente na 1ª carga.
onMounted(() => {
  const def = (savedFilters.value ?? []).find(f => f.isDefault)
  if (def) applySavedFilter(def)
})

const saveFilterOpen = ref(false)
const saveFilterName = ref('')
const saveFilterDefault = ref(false)
const savingFilter = ref(false)
async function saveCurrentFilter() {
  if (!saveFilterName.value.trim()) return
  savingFilter.value = true
  try {
    await api.post('/me/saved-filters', {
      name: saveFilterName.value.trim(),
      filters: {
        q: q.value.trim() || undefined,
        segment: segment.value || undefined,
        city: city.value.trim() || undefined,
        type: type.value || undefined,
        workMode: workMode.value || undefined,
        salaryMin: salaryMin.value ?? undefined,
      },
      isDefault: saveFilterDefault.value,
    })
    toast.success('Busca salva.')
    saveFilterOpen.value = false
    saveFilterName.value = ''
    saveFilterDefault.value = false
    refreshSavedFilters()
  }
  catch {
    toast.error('Não foi possível salvar a busca.')
  }
  finally {
    savingFilter.value = false
  }
}
async function removeSavedFilter(f: SavedFilter) {
  try {
    await api.del(`/me/saved-filters/${f.id}`)
    refreshSavedFilters()
  }
  catch {
    toast.error('Não foi possível remover.')
  }
}

// ── Modo swipe (mobile) ──────────────────────────────────────────────────────
const deckIndex = ref(0)
watch(vagas, () => { deckIndex.value = 0 })
const currentVaga = computed<Vaga | null>(() => vagas.value[deckIndex.value] ?? null)
const deckDone = computed(() => vagas.value.length > 0 && deckIndex.value >= vagas.value.length)

const offsetX = ref(0)
const dragging = ref(false)
let startX = 0
let startTime = 0
const cardEl = ref<HTMLElement | null>(null)

function onPointerDown(e: PointerEvent) {
  if (!currentVaga.value) return
  dragging.value = true
  startX = e.clientX
  startTime = Date.now()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  offsetX.value = e.clientX - startX
}
function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  const width = cardEl.value?.offsetWidth || 320
  const elapsed = Math.max(Date.now() - startTime, 1)
  const velocity = Math.abs(offsetX.value) / elapsed
  const pct = Math.abs(offsetX.value) / width
  if (pct > 0.3 || velocity > 0.6) {
    if (offsetX.value > 0) commitSwipe('right')
    else commitSwipe('left')
  }
  else {
    offsetX.value = 0
  }
}

const swipeTutorialSeen = ref(true)
onMounted(() => {
  swipeTutorialSeen.value = import.meta.client && localStorage.getItem('candidato_radar_swipe_tutorial_seen') === '1'
})
function dismissTutorial() {
  swipeTutorialSeen.value = true
  if (import.meta.client) localStorage.setItem('candidato_radar_swipe_tutorial_seen', '1')
}

const applyModalOpen = ref(false)
const applyModalVaga = ref<Vaga | null>(null)

function commitSwipe(dir: 'left' | 'right') {
  const vaga = currentVaga.value
  offsetX.value = 0
  if (!vaga) return
  if (dir === 'right') {
    applyModalVaga.value = vaga
    applyModalOpen.value = true
    deckIndex.value++
  }
  else {
    const removedIndex = deckIndex.value
    deckIndex.value++
    toast.info('Vaga removida', {
      actionLabel: 'Desfazer',
      onAction: () => { deckIndex.value = removedIndex },
    })
  }
}
function fallbackDiscard() { commitSwipe('left') }
function fallbackApply() { commitSwipe('right') }
async function fallbackSave() {
  const vaga = currentVaga.value
  if (!vaga) return
  try {
    await api.post(`/vagas/${vaga.id}/save`)
    toast.success('Vaga salva.')
  }
  catch {
    toast.info('Esta vaga já está salva.')
  }
}

const descTruncated = computed(() => {
  const d = currentVaga.value?.description ?? ''
  return d.length > 120 ? `${d.slice(0, 120)}…` : d
})
</script>

<template>
  <div class="radar">
    <header class="radar__header">
      <h1>Radar de Vagas</h1>
      <p class="radar__count">{{ total }} vaga{{ total === 1 ? '' : 's' }} encontrada{{ total === 1 ? '' : 's' }}</p>
    </header>

    <!-- Barra de filtros salvos -->
    <div v-if="(savedFilters ?? []).length" class="saved-filters">
      <button
        v-for="f in savedFilters" :key="f.id" class="saved-filters__chip"
        :class="{ 'saved-filters__chip--default': f.isDefault }"
        @click="applySavedFilter(f)"
      >
        <span v-if="f.isDefault">★</span> {{ f.name }}
        <span class="saved-filters__remove" @click.stop="removeSavedFilter(f)">✕</span>
      </button>
      <UiButton size="sm" variant="secondary" @click="saveFilterOpen = true">Salvar busca atual</UiButton>
    </div>
    <div v-else class="saved-filters">
      <UiButton size="sm" variant="secondary" @click="saveFilterOpen = true">Salvar busca atual</UiButton>
    </div>

    <!-- ═══ Desktop: filtros + grid ═══ -->
    <div class="radar__desktop">
      <div class="radar__layout">
        <aside class="filters" :class="{ 'filters--open': filtersOpen }">
          <div class="filters__head">
            <h2>Filtrar</h2>
            <button class="filters__close" @click="filtersOpen = false">✕</button>
          </div>
          <UiInput v-model="q" label="Buscar" placeholder="Cargo, palavra-chave..." />
          <UiSelect v-model="segment" label="Segmento" :options="segmentOptions" placeholder="Todos os segmentos" />
          <UiInput v-model="city" label="Cidade" placeholder="Ex.: São Paulo" />
          <UiSelect v-model="type" label="Tipo de contrato" :options="typeOptions" placeholder="Qualquer tipo" />
          <UiSelect v-model="workMode" label="Modelo de trabalho" :options="workModeOptions" placeholder="Qualquer modelo" />
          <UiCurrencyInput v-model="salaryMin" label="Salário mínimo" />
          <UiButton v-if="hasFilters" variant="ghost" size="sm" @click="clearAll">Limpar filtros</UiButton>
          <UiButton class="filters__apply" block @click="filtersOpen = false">Ver {{ total }} vagas</UiButton>
        </aside>
        <div v-if="filtersOpen" class="filters__backdrop" @click="filtersOpen = false" />

        <section class="results">
          <UiButton variant="secondary" size="sm" class="results__filter-btn" @click="filtersOpen = true">Filtrar</UiButton>
          <div v-if="pending" class="results__grid">
            <div v-for="n in 6" :key="n" class="skeleton results__skel" />
          </div>
          <template v-else-if="vagas.length">
            <div class="results__grid">
              <VagaCard v-for="v in vagas" :key="v.id" :vaga="v" />
            </div>
            <UiPagination v-if="lastPage > 1" class="results__pagination" :page="page" :last-page="lastPage" :total="total" @update:page="page = $event" />
          </template>
          <UiEmptyState v-else title="Nenhuma vaga com esses filtros" description="Tente remover alguns filtros ou ampliar a busca.">
            <template v-if="hasFilters" #action><UiButton variant="secondary" @click="clearAll">Limpar filtros</UiButton></template>
          </UiEmptyState>
        </section>
      </div>
    </div>

    <!-- ═══ Mobile: deck de swipe ═══ -->
    <div class="radar__mobile">
      <div v-if="pending" class="skeleton deck__skel" />
      <div v-else-if="!vagas.length" class="deck__empty">
        <UiEmptyState title="Nenhuma vaga com esses filtros" description="Tente ajustar os filtros." />
      </div>
      <div v-else-if="deckDone" class="deck__empty">
        <UiEmptyState title="Você viu tudo por hoje 🎉" description="Ajuste os filtros para ver mais vagas.">
          <template #action><UiButton variant="secondary" @click="filtersOpen = true">Ajustar filtros</UiButton></template>
        </UiEmptyState>
      </div>
      <div v-else class="deck">
        <div v-if="!swipeTutorialSeen" class="deck__tutorial" @click="dismissTutorial">
          <div class="deck__tutorial-hand">👋</div>
          <p>Arraste os cards: direita para candidatar-se, esquerda para descartar.</p>
          <UiButton size="sm" @click="dismissTutorial">Entendi</UiButton>
        </div>

        <div
          ref="cardEl" class="deck__card"
          :style="{ transform: `translateX(${offsetX}px) rotate(${offsetX / 20}deg)`, transition: dragging ? 'none' : 'transform 0.25s' }"
          @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
        >
          <div class="deck__overlay deck__overlay--like" :style="{ opacity: Math.max(0, offsetX / 150) }">CANDIDATAR</div>
          <div class="deck__overlay deck__overlay--nope" :style="{ opacity: Math.max(0, -offsetX / 150) }">DESCARTAR</div>

          <UiCard v-if="currentVaga" class="deck__inner">
            <UiBadge v-if="currentVaga.segment" variant="outline">{{ VAGA_SEGMENT_LABEL[currentVaga.segment] }}</UiBadge>
            <h3 class="deck__title">{{ currentVaga.title }}</h3>
            <p v-if="currentVaga.company" class="deck__company">{{ currentVaga.company.name }}</p>
            <div class="deck__pills">
              <UiBadge v-if="currentVaga.workMode" variant="neutral">{{ VAGA_WORK_MODE_LABEL[currentVaga.workMode] }}</UiBadge>
              <UiBadge v-if="currentVaga.type" variant="neutral">{{ VAGA_TYPE_LABEL[currentVaga.type] }}</UiBadge>
            </div>
            <p class="deck__desc">{{ descTruncated }}</p>
          </UiCard>
        </div>

        <div class="deck__actions">
          <button class="deck__action deck__action--nope" aria-label="Descartar" @click="fallbackDiscard">✕</button>
          <button class="deck__action deck__action--save" aria-label="Salvar" @click="fallbackSave">♡</button>
          <button class="deck__action deck__action--like" aria-label="Candidatar-se" @click="fallbackApply">✓</button>
        </div>
      </div>
    </div>

    <UiModal :open="saveFilterOpen" title="Salvar busca atual" size="sm" @close="saveFilterOpen = false">
      <div class="save-filter">
        <UiInput v-model="saveFilterName" label="Nome da busca" placeholder="Ex.: Vagas remotas em TI" />
        <label class="save-filter__check">
          <input v-model="saveFilterDefault" type="checkbox">
          <span>Tornar padrão (carrega automaticamente ao abrir o Radar)</span>
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="saveFilterOpen = false">Cancelar</UiButton>
        <UiButton :loading="savingFilter" @click="saveCurrentFilter">Salvar</UiButton>
      </template>
    </UiModal>

    <!-- Sem v-if: o ApplyModal precisa ficar montado com open:false desde o início.
         Se ele só monta quando applyModalVaga vira truthy (ao mesmo tempo que open
         vira true), o watch(() => props.open) interno do ApplyModal nunca dispara
         (Vue só chama watchers não-immediate em MUDANÇAS pós-montagem, não no mount
         inicial) e os campos nome/e-mail ficam em branco. Bug real encontrado e
         corrigido durante a validação E2E do Radar. -->
    <ApplyModal
      :open="applyModalOpen" :vaga-slug="applyModalVaga?.slug ?? ''" :vaga-title="applyModalVaga?.title ?? ''"
      @close="applyModalOpen = false"
    />
  </div>
</template>

<style scoped>
.radar__header { margin-bottom: var(--sp-4); }
.radar__count { color: var(--ink-500); font-size: var(--text-14); margin-top: var(--sp-1); }

.saved-filters { display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center; margin-bottom: var(--sp-6); }
.saved-filters__chip {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  background: var(--ink-100); border: none; border-radius: var(--radius-full);
  padding: 4px var(--sp-3); font-size: var(--text-13); cursor: pointer; color: var(--ink-700);
}
.saved-filters__chip--default { background: var(--brand-100); color: var(--brand-700); }
.saved-filters__remove { margin-left: 4px; color: var(--ink-500); }

.radar__mobile { display: none; }
.radar__layout { display: grid; grid-template-columns: 260px 1fr; gap: var(--sp-8); align-items: start; }
.filters {
  display: flex; flex-direction: column; gap: var(--sp-4);
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card);
  padding: var(--sp-5); position: sticky; top: calc(var(--topbar-h) + var(--sp-4));
}
.filters__head { display: flex; align-items: center; justify-content: space-between; }
.filters__close { display: none; background: none; border: none; font-size: var(--text-18); cursor: pointer; }
.filters__apply { display: none; }
.filters__backdrop { display: none; }
.results__filter-btn { display: none; }
.results__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
.results__skel { height: 150px; border-radius: var(--radius-card); }
.results__pagination { margin-top: var(--sp-8); }

.save-filter { display: flex; flex-direction: column; gap: var(--sp-4); }
.save-filter__check { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-13); cursor: pointer; }
.save-filter__check input { margin-top: 3px; }

.deck { position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--sp-6); padding-top: var(--sp-4); }
.deck__card { width: 100%; max-width: 380px; touch-action: pan-y; cursor: grab; position: relative; user-select: none; }
.deck__inner { min-height: 320px; display: flex; flex-direction: column; gap: var(--sp-3); }
.deck__title { font-size: var(--text-20); font-weight: 700; }
.deck__company { color: var(--ink-500); font-size: var(--text-14); }
.deck__pills { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.deck__desc { color: var(--ink-700); font-size: var(--text-14); }
.deck__overlay {
  position: absolute; top: var(--sp-6); z-index: 2; font-weight: 800; font-size: var(--text-20);
  padding: var(--sp-2) var(--sp-4); border-radius: var(--radius-input); border: 3px solid;
  pointer-events: none;
}
.deck__overlay--like { left: var(--sp-4); color: var(--brand-700); border-color: var(--brand-700); transform: rotate(-12deg); }
.deck__overlay--nope { right: var(--sp-4); color: var(--red-500); border-color: var(--red-500); transform: rotate(12deg); }
.deck__actions { display: flex; gap: var(--sp-6); }
.deck__action {
  width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
  font-size: var(--text-22); display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-md);
}
.deck__action--nope { background: var(--white); color: var(--red-500); }
.deck__action--save { background: var(--white); color: var(--ink-500); }
.deck__action--like { background: var(--brand-600); color: var(--white); }
.deck__empty { padding-top: var(--sp-8); }
.deck__skel { height: 320px; max-width: 380px; margin: 0 auto; border-radius: var(--radius-card); }
.deck__tutorial {
  position: absolute; inset: 0; z-index: 5; background: rgba(11, 18, 32, 0.85); color: var(--white);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-4);
  text-align: center; padding: var(--sp-6); border-radius: var(--radius-card); cursor: pointer;
}
.deck__tutorial-hand { font-size: 48px; animation: swipe-hint 1.4s ease-in-out infinite; }
@keyframes swipe-hint { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(24px); } }

@media (max-width: 900px) {
  .radar__desktop { display: none; }
  .radar__mobile { display: block; }
}
</style>
