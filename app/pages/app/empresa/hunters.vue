<script setup lang="ts">
// T-E06 — Hunters (workspace Empresa). 3 abas:
//  - Meus hunters: quem está com interesse ACEITO em alguma das minhas vagas.
//  - Encontrar hunters: diretório público (GET /hunters), pra navegar o marketplace.
//  - Avaliações pendentes: placements confirmados sem review ainda (B10).
import type { Vaga, PaginatedResult } from '~/types/vaga'
import type { HunterDirectoryCard, HunterDirectoryResponse } from '~/types/hunter'
import type { SelectOption } from '~/components/ui/Select.vue'
import type { PendingReviewPlacement } from '~/components/empresa/ReviewHunterModal.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Hunters' })

const api = useApi()

const tab = ref<'meus' | 'encontrar' | 'avaliacoes'>('meus')

// ── Avaliações pendentes (carregado sempre, pra badge de contagem na aba) ──
const { data: pendingResp, refresh: refreshPending } = await useAsyncData('empresa-hunters-pending-review', () =>
  api.get<PendingReviewPlacement[]>('/me/placements/pending-review').catch(() => []))
const pending = computed<PendingReviewPlacement[]>(() => pendingResp.value ?? [])

const tabs = computed(() => [
  { value: 'meus', label: 'Meus hunters' },
  { value: 'encontrar', label: 'Encontrar hunters' },
  { value: 'avaliacoes', label: `Avaliações pendentes${pending.value.length ? ` (${pending.value.length})` : ''}` },
])

// ── Meus hunters: ACEITOS em qualquer vaga própria que aceite hunters ──────
interface HunterInterestRow {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  hunter: { id: string, firstName: string, lastName: string, email: string, phone: string | null, username: string | null, avatarUrl: string | null } | null
}
interface MeuHunterRow { hunterId: string, hunter: HunterInterestRow['hunter'], vagaId: string, vagaTitle: string }

const { data: meusHuntersRows, pending: loadingMeus } = await useAsyncData('empresa-meus-hunters', async () => {
  const list = await api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 100 }).catch(() => null)
  const comHunters = (list?.data ?? []).filter(v => v.allowHunters)
  const rows: MeuHunterRow[] = []
  await Promise.all(comHunters.map(async (v) => {
    const interests = await api.get<HunterInterestRow[]>(`/vagas/${v.id}/hunter-interests`).catch(() => [])
    for (const hi of interests) {
      if (hi.status === 'ACCEPTED' && hi.hunter) {
        rows.push({ hunterId: hi.hunter.id, hunter: hi.hunter, vagaId: v.id, vagaTitle: v.title })
      }
    }
  }))
  return rows
})
const meusHunters = computed<MeuHunterRow[]>(() => meusHuntersRows.value ?? [])

// ── Encontrar hunters: diretório público ────────────────────────────────────
const q = ref('')
const specialty = ref('')
const city = ref('')
const verifiedOnly = ref(true)
const page = ref(1)
const limit = 9
const verifiedOptions: SelectOption[] = [
  { value: 'true', label: 'Somente verificados' },
  { value: 'false', label: 'Todos os hunters' },
]
const verifiedValue = computed({
  get: () => (verifiedOnly.value ? 'true' : 'false'),
  set: (v: string | null) => { verifiedOnly.value = v !== 'false' },
})
const { data: dirResp, pending: loadingDir } = await useAsyncData('empresa-hunters-directory', () =>
  api.get<HunterDirectoryResponse>('/hunters', {
    specialty: specialty.value || undefined,
    city: city.value || undefined,
    verifiedOnly: verifiedOnly.value,
    page: page.value,
    limit,
  }).catch(() => null),
{ watch: [specialty, city, verifiedOnly, page] })
const hunters = computed<HunterDirectoryCard[]>(() => dirResp.value?.items ?? [])
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return hunters.value
  return hunters.value.filter(h => `${h.firstName} ${h.lastName}`.toLowerCase().includes(term) || h.profession?.toLowerCase().includes(term))
})
const lastPage = computed(() => Math.max(1, Math.ceil((dirResp.value?.total ?? 0) / limit)))

// ── Avaliações pendentes: modal ──────────────────────────────────────────
const reviewing = ref<PendingReviewPlacement | null>(null)
async function onReviewSaved() {
  reviewing.value = null
  await refreshPending()
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="hp">
    <header class="hp__header">
      <h1>Hunters</h1>
      <p class="text-secondary">Hunters trabalhando suas vagas e o marketplace de recrutadores parceiros.</p>
    </header>

    <UiTabs v-model="tab" :tabs="tabs" class="hp__tabs" />

    <!-- Meus hunters -->
    <section v-if="tab === 'meus'">
      <div v-if="loadingMeus" class="hp__skel">
        <div v-for="n in 3" :key="n" class="skeleton hp__skel-row" />
      </div>
      <UiEmptyState
        v-else-if="!meusHunters.length"
        title="Nenhum hunter trabalhando suas vagas ainda"
        description="Abra suas vagas para hunters (em Minhas Vagas) e aceite interesses para vê-los aqui."
      />
      <ul v-else class="hp__list">
        <li v-for="r in meusHunters" :key="`${r.hunterId}-${r.vagaId}`" class="hp__row">
          <UiAvatar :src="r.hunter?.avatarUrl ?? null" :name="`${r.hunter?.firstName ?? ''} ${r.hunter?.lastName ?? ''}`" size="md" />
          <div class="hp__info">
            <span class="hp__name">{{ r.hunter?.firstName }} {{ r.hunter?.lastName }}</span>
            <span class="hp__meta">Trabalhando: {{ r.vagaTitle }}</span>
          </div>
          <div class="hp__actions">
            <NuxtLink v-if="r.hunter?.username" :to="`/perfil/${r.hunter.username}`" target="_blank" class="hp__link">Ver perfil</NuxtLink>
            <UiButton size="sm" variant="secondary" @click="navigateTo(`/app/empresa/vagas/${r.vagaId}`)">Ver pipeline</UiButton>
          </div>
        </li>
      </ul>
    </section>

    <!-- Encontrar hunters -->
    <section v-else-if="tab === 'encontrar'">
      <div class="hp__filters">
        <UiInput v-model="q" placeholder="Buscar por nome ou cargo..." />
        <UiInput v-model="specialty" placeholder="Especialidade" />
        <UiInput v-model="city" placeholder="Cidade" />
        <UiSelect v-model="verifiedValue" :options="verifiedOptions" />
      </div>

      <div v-if="loadingDir" class="hp__grid">
        <div v-for="n in 6" :key="n" class="skeleton hp__skeleton" />
      </div>
      <UiEmptyState v-else-if="!filtered.length" title="Nenhum hunter encontrado" description="Ajuste os filtros de busca." />
      <div v-else class="hp__grid">
        <NuxtLink v-for="h in filtered" :key="h.username" :to="`/hunter/${h.username}`" target="_blank" class="hp-card-link">
          <UiCard clickable class="hp-card">
            <div class="hp-card__top">
              <UiAvatar :src="h.avatarUrl" :name="`${h.firstName} ${h.lastName}`" size="md" />
              <div class="hp-card__id">
                <span class="hp-card__name">
                  {{ h.firstName }} {{ h.lastName }}
                  <UiBadge v-if="h.isVerified" variant="success">✓ Verificado</UiBadge>
                </span>
                <span v-if="h.profession" class="hp-card__profession">{{ h.profession }}</span>
              </div>
            </div>
            <div class="hp-card__metrics">
              <span>{{ h.metrics.totalIndicacoes }} indicações</span>
              <span v-if="h.metrics.avaliacaoMedia != null">{{ h.metrics.avaliacaoMedia }} ★ ({{ h.metrics.totalReviews }})</span>
            </div>
          </UiCard>
        </NuxtLink>
      </div>
      <UiPagination v-if="dirResp && lastPage > 1" :page="page" :last-page="lastPage" :total="dirResp.total" @update:page="page = $event" />
    </section>

    <!-- Avaliações pendentes -->
    <section v-else>
      <UiEmptyState
        v-if="!pending.length"
        title="Nenhuma avaliação pendente"
        description="Assim que um placement com hunter for confirmado, ele aparece aqui para você avaliar."
      />
      <ul v-else class="hp__list">
        <li v-for="p in pending" :key="p.id" class="hp__row">
          <UiAvatar :src="p.hunter?.avatarUrl ?? null" :name="`${p.hunter?.firstName ?? ''} ${p.hunter?.lastName ?? ''}`" size="md" />
          <div class="hp__info">
            <span class="hp__name">{{ p.hunter?.firstName }} {{ p.hunter?.lastName }}</span>
            <span class="hp__meta">{{ p.candidateName ?? 'Candidato' }}<template v-if="p.vagaTitle"> · {{ p.vagaTitle }}</template> · confirmado em {{ fmt(p.confirmedAt) }}</span>
          </div>
          <UiButton size="sm" @click="reviewing = p">Avaliar</UiButton>
        </li>
      </ul>
    </section>

    <EmpresaReviewHunterModal :placement="reviewing" @close="reviewing = null" @saved="onReviewSaved" />
  </div>
</template>

<style scoped>
.hp__header h1 { font-size: var(--text-22); }
.hp__header p { margin-top: var(--sp-1); }
.hp__tabs { margin: var(--sp-5) 0; }
.hp__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.hp__skel-row { height: 64px; border-radius: var(--radius-input); }
.hp__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.hp__row { display: flex; align-items: center; gap: var(--sp-3); background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-3) var(--sp-4); }
.hp__info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.hp__name { font-weight: 600; color: var(--ink-900); font-size: var(--text-14); }
.hp__meta { font-size: var(--text-13); color: var(--ink-500); }
.hp__actions { display: flex; align-items: center; gap: var(--sp-3); }
.hp__link { font-size: var(--text-13); color: var(--brand-600); white-space: nowrap; }
.hp__filters { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--sp-3); margin-bottom: var(--sp-5); }
.hp__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--sp-4); margin-bottom: var(--sp-5); }
.hp__skeleton { height: 160px; border-radius: var(--radius-card); }
.hp-card-link { display: block; text-decoration: none; color: inherit; height: 100%; }
.hp-card { height: 100%; display: flex; flex-direction: column; gap: var(--sp-3); }
.hp-card__top { display: flex; align-items: flex-start; gap: var(--sp-3); }
.hp-card__id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hp-card__name { font-weight: 600; color: var(--ink-900); display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; }
.hp-card__profession { font-size: var(--text-13); color: var(--ink-700); }
.hp-card__metrics { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-12); color: var(--ink-500); border-top: 1px solid var(--ink-100); padding-top: var(--sp-2); margin-top: auto; }
@media (max-width: 900px) {
  .hp__filters { grid-template-columns: 1fr 1fr; }
}
</style>
