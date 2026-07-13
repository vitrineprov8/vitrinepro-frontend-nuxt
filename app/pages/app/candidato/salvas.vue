<script setup lang="ts">
// T-C05 — Vagas Salvas. GET /me/saved-vagas (inclui fechadas p/ aba "Encerradas").
import type { SavedVaga } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Vagas Salvas — Candidato' })

const api = useApi()
const toast = useToast()

const { data, pending, refresh } = await useAsyncData('candidato-saved-vagas', () =>
  api.get<{ data: SavedVaga[] }>('/me/saved-vagas', { limit: 100 }).catch(() => ({ data: [] })))

const ativas = computed(() => (data.value?.data ?? []).filter(s => s.vaga.status === 'PUBLISHED'))
const encerradas = computed(() => (data.value?.data ?? []).filter(s => s.vaga.status !== 'PUBLISHED'))

const tab = ref<'ativas' | 'encerradas'>('ativas')
const tabs = computed(() => [
  { value: 'ativas', label: 'Ativas', count: ativas.value.length },
  { value: 'encerradas', label: 'Encerradas', count: encerradas.value.length },
])
const list = computed(() => (tab.value === 'ativas' ? ativas.value : encerradas.value))

// Banner: vagas ativas com deadline em <48h
const proximasDoDeadline = computed(() => {
  const now = Date.now()
  const in48h = now + 48 * 60 * 60 * 1000
  return ativas.value.filter((s) => {
    if (!s.vaga.deadline) return false
    const t = new Date(s.vaga.deadline).getTime()
    return t > now && t < in48h
  })
})

async function remove(sv: SavedVaga) {
  try {
    await api.del(`/vagas/${sv.vagaId}/save`)
    toast.info('Vaga removida dos salvos.', {
      actionLabel: 'Desfazer',
      onAction: async () => {
        try {
          await api.post(`/vagas/${sv.vagaId}/save`)
          refresh()
        }
        catch { /* já foi salva novamente ou vaga não existe mais */ }
      },
    })
    refresh()
  }
  catch {
    toast.error('Não foi possível remover.')
  }
}

const applyModalOpen = ref(false)
const applyModalVaga = ref<SavedVaga['vaga'] | null>(null)
function openApply(sv: SavedVaga) {
  applyModalVaga.value = sv.vaga
  applyModalOpen.value = true
}
</script>

<template>
  <div class="salvas">
    <header class="salvas__header">
      <h1>Vagas Salvas</h1>
    </header>

    <div v-if="proximasDoDeadline.length" class="salvas__banner">
      ⏰ {{ proximasDoDeadline.length }} vaga{{ proximasDoDeadline.length === 1 ? '' : 's' }} salva{{ proximasDoDeadline.length === 1 ? '' : 's' }} encerra{{ proximasDoDeadline.length === 1 ? '' : 'm' }} em breve
    </div>

    <UiTabs v-model="tab" :tabs="tabs" class="salvas__tabs" />

    <div v-if="pending" class="salvas__grid">
      <div v-for="n in 4" :key="n" class="skeleton salvas__skel" />
    </div>

    <div v-else-if="list.length" class="salvas__grid">
      <div v-for="sv in list" :key="sv.id" class="salvas__card" :class="{ 'salvas__card--closed': sv.vaga.status !== 'PUBLISHED' }">
        <VagaCard :vaga="sv.vaga" />
        <div class="salvas__actions">
          <UiButton v-if="tab === 'ativas'" size="sm" @click="openApply(sv)">Candidatar</UiButton>
          <button class="salvas__remove" aria-label="Remover" @click="remove(sv)">✕</button>
        </div>
      </div>
    </div>

    <UiEmptyState
      v-else
      :title="tab === 'ativas' ? 'Nenhuma vaga salva' : 'Nenhuma vaga encerrada salva'"
      description="Salve vagas no Radar para acompanhá-las por aqui."
    >
      <template #action><UiButton @click="navigateTo('/app/candidato/radar')">Ir para o Radar</UiButton></template>
    </UiEmptyState>

    <!-- Sem v-if: ver comentário equivalente em radar.vue — o ApplyModal precisa
         montar com open:false para seu watch(() => props.open) interno disparar
         de verdade e prefilar nome/e-mail ao abrir. -->
    <ApplyModal
      :open="applyModalOpen" :vaga-slug="applyModalVaga?.slug ?? ''" :vaga-title="applyModalVaga?.title ?? ''"
      @close="applyModalOpen = false"
    />
  </div>
</template>

<style scoped>
.salvas__header { margin-bottom: var(--sp-4); }
.salvas__banner {
  background: var(--amber-100); color: #92400E; border-radius: var(--radius-card);
  padding: var(--sp-3) var(--sp-4); font-size: var(--text-14); margin-bottom: var(--sp-4);
}
.salvas__tabs { margin-bottom: var(--sp-5); }
.salvas__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.salvas__skel { height: 220px; border-radius: var(--radius-card); }
.salvas__card { position: relative; display: flex; flex-direction: column; gap: var(--sp-2); }
.salvas__card--closed { opacity: 0.55; }
.salvas__actions { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
.salvas__remove {
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-full);
  width: 32px; height: 32px; cursor: pointer; color: var(--ink-500); margin-left: auto;
}
@media (max-width: 1100px) { .salvas__grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .salvas__grid { grid-template-columns: 1fr; } }
</style>
