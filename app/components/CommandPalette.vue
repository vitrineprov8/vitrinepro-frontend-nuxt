<script setup lang="ts">
// Busca global cmd+K (design-spec 00 §3.9/§5.6): "Input + resultados
// agrupados (Vagas · Candidatos · Hunters · Clientes · Ações rápidas),
// navegação por setas, escopo = workspace ativo. Recentes quando vazio."
//
// Escopo reduzido desta rodada (documentado, não é o spec 100%): sem um
// índice de busca unificado no backend, implementar as 4 categorias de
// dados exigiria endpoints novos de busca por texto em Candidatos/Hunters/
// Clientes (nenhum dos três aceita `q` hoje — só filtros específicos tipo
// specialty/city). Pra não estourar o escopo desta tanda, ficou:
//   - Ações rápidas: sempre disponível, client-side, contextual por workspace.
//   - Vagas: busca real via GET /vagas/radar?q= (já suporta texto livre).
//   - Recentes: últimas 5 seleções, guardadas em localStorage.
// Candidatos/Hunters/Clientes ficam como gap conhecido — ver PLANO_DESENVOLVIMENTO.md.
import { Search, ArrowRight } from 'lucide-vue-next'
import type { PaginatedResult, Vaga } from '~/types/vaga'

const route = useRoute()
const router = useRouter()
const api = useApi()

// useState (não ref local) pra poder ser aberto também pelo botão de busca
// na topbar (layouts/app.vue), não só pelo atalho de teclado.
const open = useState<boolean>('cmdk-open', () => false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

function isEditableTarget(el: EventTarget | null) {
  const tag = (el as HTMLElement | null)?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement | null)?.isContentEditable
}

function onKeydown(e: KeyboardEvent) {
  const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
  if (isCmdK) {
    e.preventDefault()
    open.value = !open.value
    return
  }
  if (e.key === 'Escape' && open.value) { open.value = false }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

watch(open, (o) => {
  if (o) {
    query.value = ''
    activeIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

// ── Ações rápidas por workspace ─────────────────────────────────────────────
interface ResultItem { key: string, label: string, sublabel?: string, to: string, group: string }

const quickActions = computed<ResultItem[]>(() => {
  const p = route.path
  const items: ResultItem[] = []
  if (p.startsWith('/app/candidato')) {
    items.push(
      { key: 'qa-radar', label: 'Ver Radar de Vagas', to: '/app/candidato/radar', group: 'Ações rápidas' },
      { key: 'qa-cands', label: 'Minhas Candidaturas', to: '/app/candidato/candidaturas', group: 'Ações rápidas' },
      { key: 'qa-perfil', label: 'Editar Meu Perfil', to: '/app/candidato/perfil', group: 'Ações rápidas' },
    )
  }
  else if (p.startsWith('/app/hunter')) {
    items.push(
      { key: 'qa-nova-vaga', label: 'Nova vaga', to: '/app/hunter/vagas/nova', group: 'Ações rápidas' },
      { key: 'qa-candidatos', label: 'Meus Candidatos', to: '/app/hunter/candidatos', group: 'Ações rápidas' },
      { key: 'qa-marketplace', label: 'Marketplace de vagas', to: '/app/hunter/marketplace', group: 'Ações rápidas' },
      { key: 'qa-ganhos', label: 'Ganhos', to: '/app/hunter/ganhos', group: 'Ações rápidas' },
    )
  }
  else if (p.startsWith('/app/empresa')) {
    items.push(
      { key: 'qa-nova-vaga', label: 'Nova vaga', to: '/app/empresa/vagas/nova', group: 'Ações rápidas' },
      { key: 'qa-candidatos', label: 'Candidatos', to: '/app/empresa/candidatos', group: 'Ações rápidas' },
      { key: 'qa-hunters', label: 'Hunters', to: '/app/empresa/hunters', group: 'Ações rápidas' },
    )
  }
  else if (p.startsWith('/app/consultoria')) {
    items.push(
      { key: 'qa-nova-vaga', label: 'Nova vaga do time', to: '/app/consultoria/vagas/nova', group: 'Ações rápidas' },
      { key: 'qa-convidar', label: 'Convidar membro', to: '/app/consultoria/membros', group: 'Ações rápidas' },
      { key: 'qa-clientes', label: 'Clientes', to: '/app/consultoria/clientes', group: 'Ações rápidas' },
    )
  }
  else if (p.startsWith('/app/admin')) {
    items.push(
      { key: 'qa-verificacoes', label: 'Verificações pendentes', to: '/app/admin/verificacoes', group: 'Ações rápidas' },
      { key: 'qa-disputas', label: 'Disputas', to: '/app/admin/disputas', group: 'Ações rápidas' },
    )
  }
  items.push({ key: 'qa-conta', label: 'Minha Conta', to: '/app/conta', group: 'Ações rápidas' })
  return items
})

const filteredQuickActions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return quickActions.value
  return quickActions.value.filter(i => i.label.toLowerCase().includes(q))
})

// ── Vagas (busca real) ───────────────────────────────────────────────────────
const vagaResults = ref<ResultItem[]>([])
const searching = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(query, (q) => {
  clearTimeout(debounceTimer)
  if (q.trim().length < 2) { vagaResults.value = []; return }
  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await api.get<PaginatedResult<Vaga>>('/vagas/radar', { q: q.trim(), limit: 5 })
      vagaResults.value = res.data.map(v => ({
        key: `vaga-${v.id}`, label: v.title, sublabel: v.location ?? undefined,
        to: `/vaga/${v.slug}`, group: 'Vagas',
      }))
    }
    catch { vagaResults.value = [] }
    finally { searching.value = false }
  }, 300)
})

// ── Recentes ─────────────────────────────────────────────────────────────────
const RECENTS_KEY = 'vp_cmdk_recentes'
const recents = ref<ResultItem[]>([])
function loadRecents() {
  if (!import.meta.client) return
  try { recents.value = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') }
  catch { recents.value = [] }
}
function pushRecent(item: ResultItem) {
  if (!import.meta.client) return
  const next = [item, ...recents.value.filter(r => r.key !== item.key)].slice(0, 5)
  recents.value = next
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
}
onMounted(loadRecents)

const results = computed<ResultItem[]>(() => {
  if (!query.value.trim()) {
    return recents.value.length
      ? [...recents.value.map(r => ({ ...r, group: 'Recentes' })), ...quickActions.value]
      : quickActions.value
  }
  return [...filteredQuickActions.value, ...vagaResults.value]
})

const groupedResults = computed(() => {
  const groups = new Map<string, ResultItem[]>()
  for (const item of results.value) {
    if (!groups.has(item.group)) groups.set(item.group, [])
    groups.get(item.group)!.push(item)
  }
  return Array.from(groups.entries())
})

watch(results, () => { activeIndex.value = 0 })

function select(item: ResultItem) {
  open.value = false
  pushRecent(item)
  if (item.to.startsWith('http')) window.location.href = item.to
  else router.push(item.to)
}

function onArrow(dir: 1 | -1) {
  const len = results.value.length
  if (!len) return
  activeIndex.value = (activeIndex.value + dir + len) % len
}
function onEnter() {
  const item = results.value[activeIndex.value]
  if (item) select(item)
}
</script>

<template>
  <!-- ClientOnly: evita o mismatch de hidratação do Teleport (ver `ui/Toaster.vue`). -->
  <ClientOnly>
    <Teleport to="body">
      <div v-if="open" class="cmdk-overlay" @click.self="open = false">
        <div class="cmdk" role="dialog" aria-modal="true" aria-label="Busca global">
          <div class="cmdk__input-wrap">
            <Search :size="18" class="cmdk__icon" />
            <input
              ref="inputRef" v-model="query" class="cmdk__input"
              placeholder="Buscar vagas, ações rápidas..."
              @keydown.down.prevent="onArrow(1)"
              @keydown.up.prevent="onArrow(-1)"
              @keydown.enter.prevent="onEnter"
            >
            <kbd class="cmdk__esc">ESC</kbd>
          </div>
          <div class="cmdk__body">
            <p v-if="searching" class="cmdk__hint">Buscando...</p>
            <template v-if="groupedResults.length">
              <div v-for="[group, items] in groupedResults" :key="group" class="cmdk__group">
                <p class="cmdk__group-label">{{ group }}</p>
                <button
                  v-for="item in items" :key="item.key" class="cmdk__item"
                  :class="{ 'cmdk__item--active': results.indexOf(item) === activeIndex }"
                  @click="select(item)" @mouseenter="activeIndex = results.indexOf(item)"
                >
                  <span class="cmdk__item-label">{{ item.label }}</span>
                  <span v-if="item.sublabel" class="cmdk__item-sub">{{ item.sublabel }}</span>
                  <ArrowRight :size="14" class="cmdk__item-arrow" />
                </button>
              </div>
            </template>
            <p v-else-if="!searching" class="cmdk__hint">Nenhum resultado para "{{ query }}".</p>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.cmdk-overlay {
  position: fixed; inset: 0; z-index: 200; background: rgba(11, 18, 32, 0.5);
  display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh;
}
.cmdk {
  width: 100%; max-width: 560px; background: var(--white); border-radius: var(--radius-modal);
  box-shadow: var(--shadow-lg); max-height: 60vh; display: flex; flex-direction: column; overflow: hidden;
}
.cmdk__input-wrap { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--ink-100); }
.cmdk__icon { color: var(--ink-500); flex-shrink: 0; }
.cmdk__input { border: none; outline: none; flex: 1; font-size: var(--text-16); }
.cmdk__esc { font-size: 11px; color: var(--ink-500); border: 1px solid var(--ink-100); border-radius: 4px; padding: 2px 6px; }
.cmdk__body { overflow-y: auto; padding: var(--sp-2); }
.cmdk__hint { padding: var(--sp-5); text-align: center; color: var(--ink-500); font-size: var(--text-14); }
.cmdk__group-label { font-size: var(--text-12); font-weight: 600; color: var(--ink-500); padding: var(--sp-2) var(--sp-3); }
.cmdk__item {
  display: flex; align-items: center; gap: var(--sp-2); width: 100%; text-align: left;
  padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-input); background: none; border: none; cursor: pointer;
  font-size: var(--text-14); color: var(--ink-900);
}
.cmdk__item--active, .cmdk__item:hover { background: var(--ink-100); }
.cmdk__item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmdk__item-sub { font-size: var(--text-12); color: var(--ink-500); flex-shrink: 0; }
.cmdk__item-arrow { color: var(--ink-300); flex-shrink: 0; }
</style>
