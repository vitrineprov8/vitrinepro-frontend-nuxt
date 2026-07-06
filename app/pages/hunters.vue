<script setup lang="ts">
// T07 — Diretório público de hunters. Backend: GET /hunters (B5).
import type { HunterDirectoryCard, HunterDirectoryResponse } from '~/types/hunter'
import type { SelectOption } from '~/components/ui/Select.vue'

const api = useApi()

const q = ref('')
const specialty = ref('')
const city = ref('')
const verifiedOnly = ref(true)
const page = ref(1)

const verifiedOptions: SelectOption[] = [
  { value: 'true', label: 'Somente verificados' },
  { value: 'false', label: 'Todos os hunters' },
]
const verifiedValue = computed({
  get: () => (verifiedOnly.value ? 'true' : 'false'),
  set: (v: string | null) => { verifiedOnly.value = v !== 'false' },
})

const limit = 12
const { data: resp, pending } = await useAsyncData('hunters-directory', () =>
  api.get<HunterDirectoryResponse>('/hunters', {
    specialty: specialty.value || undefined,
    city: city.value || undefined,
    verifiedOnly: verifiedOnly.value,
    page: page.value,
    limit,
  }).catch(() => null),
{ watch: [specialty, city, verifiedOnly, page] })

const hunters = computed<HunterDirectoryCard[]>(() => resp.value?.items ?? [])
const lastPage = computed(() => Math.max(1, Math.ceil((resp.value?.total ?? 0) / limit)))

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return hunters.value
  return hunters.value.filter(h =>
    `${h.firstName} ${h.lastName}`.toLowerCase().includes(term)
    || h.profession?.toLowerCase().includes(term))
})

useSeoMeta({
  title: 'Hunters — VitrinePro',
  description: 'Encontre recrutadores independentes (hunters) verificados para trabalhar suas vagas com fee.',
})
</script>

<template>
  <div class="dir container">
    <header class="dir__head">
      <h1>Hunters</h1>
      <p class="text-secondary">Recrutadores independentes disponíveis para trabalhar vagas com fee.</p>
    </header>

    <div class="dir__filters">
      <UiInput v-model="q" placeholder="Buscar por nome ou cargo..." />
      <UiInput v-model="specialty" placeholder="Especialidade (ex.: Tecnologia)" />
      <UiInput v-model="city" placeholder="Cidade" />
      <UiSelect v-model="verifiedValue" :options="verifiedOptions" />
    </div>

    <div v-if="pending" class="dir__grid">
      <div v-for="i in 6" :key="i" class="skeleton dir__skeleton" />
    </div>

    <UiEmptyState
      v-else-if="!filtered.length"
      title="Nenhum hunter encontrado"
      description="Ajuste os filtros para encontrar recrutadores disponíveis."
    />

    <div v-else class="dir__grid">
      <NuxtLink v-for="h in filtered" :key="h.username" :to="`/hunter/${h.username}`" class="dir-card-link">
        <UiCard clickable class="dir-card">
          <div class="dir-card__top">
            <UiAvatar :src="h.avatarUrl" :name="`${h.firstName} ${h.lastName}`" size="md" />
            <div class="dir-card__id">
              <span class="dir-card__name">
                {{ h.firstName }} {{ h.lastName }}
                <UiBadge v-if="h.isVerified" variant="success">✓ Verificado</UiBadge>
              </span>
              <span v-if="h.profession" class="dir-card__profession">{{ h.profession }}</span>
              <span v-if="h.location" class="dir-card__location">📍 {{ h.location }}</span>
            </div>
          </div>

          <div v-if="h.hunterSpecialties?.length" class="dir-card__chips">
            <UiBadge v-for="s in h.hunterSpecialties.slice(0, 3)" :key="s" variant="outline">{{ s }}</UiBadge>
          </div>

          <div class="dir-card__metrics">
            <span>{{ h.metrics.totalIndicacoes }} indicações</span>
            <span v-if="h.metrics.taxaAproveitamento != null">{{ h.metrics.taxaAproveitamento }}% de aproveitamento</span>
          </div>
        </UiCard>
      </NuxtLink>
    </div>

    <UiPagination
      v-if="resp && lastPage > 1"
      :page="page" :last-page="lastPage" :total="resp.total"
      @update:page="page = $event"
    />
  </div>
</template>

<style scoped>
.dir { padding: var(--sp-8) 0 var(--sp-16); }
.dir__head { margin-bottom: var(--sp-6); }
.dir__head h1 { font-size: var(--text-28); margin-bottom: var(--sp-1); }
.dir__filters {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--sp-3);
  margin-bottom: var(--sp-6);
}
.dir__grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4); margin-bottom: var(--sp-6);
}
.dir__skeleton { height: 180px; border-radius: var(--radius-card); }
.dir-card-link { display: block; text-decoration: none; color: inherit; height: 100%; }
.dir-card { height: 100%; display: flex; flex-direction: column; gap: var(--sp-3); }
.dir-card__top { display: flex; align-items: flex-start; gap: var(--sp-3); }
.dir-card__id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dir-card__name { font-weight: 600; color: var(--ink-900); display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; }
.dir-card__profession { font-size: var(--text-13); color: var(--ink-700); }
.dir-card__location { font-size: var(--text-12); color: var(--ink-500); }
.dir-card__chips { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
.dir-card__metrics { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-12); color: var(--ink-500); border-top: 1px solid var(--ink-100); padding-top: var(--sp-2); margin-top: auto; }
@media (max-width: 900px) {
  .dir__filters { grid-template-columns: 1fr 1fr; }
}
</style>
