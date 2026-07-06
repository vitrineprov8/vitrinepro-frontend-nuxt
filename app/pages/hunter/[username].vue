<script setup lang="ts">
// T08 — Perfil público de hunter (B5). Backend: GET /hunters/:username.
import type { HunterPublicProfile } from '~/types/hunter'

const route = useRoute()
const api = useApi()
const username = computed(() => route.params.username as string)

const { data: hunter } = await useAsyncData(`hunter-profile-${username.value}`, () =>
  api.get<HunterPublicProfile>(`/hunters/${username.value}`).catch(() => null))

if (!hunter.value && import.meta.server) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

useSeoMeta({
  title: () => hunter.value ? `${hunter.value.firstName} ${hunter.value.lastName} — Hunter` : 'Hunter não encontrado',
  description: () => hunter.value?.bio?.slice(0, 160) ?? 'Perfil de hunter no VitrinePro.',
})
</script>

<template>
  <div class="hp container">
    <div v-if="!hunter" class="hp__missing">
      <h1>Hunter não encontrado</h1>
      <p class="text-secondary">Este perfil não existe ou está oculto.</p>
      <UiButton @click="navigateTo('/hunters')">Ver diretório de hunters</UiButton>
    </div>

    <template v-else>
      <header class="hp__header">
        <UiAvatar :src="hunter.avatarUrl" :name="`${hunter.firstName} ${hunter.lastName}`" size="xl" />
        <div class="hp__head-info">
          <h1 class="hp__name">
            {{ hunter.firstName }} {{ hunter.lastName }}
            <UiBadge v-if="hunter.isVerified" variant="success">✓ Verificado</UiBadge>
          </h1>
          <p v-if="hunter.profession" class="hp__profession">{{ hunter.profession }}</p>
          <p v-if="hunter.location" class="hp__location">📍 {{ hunter.location }}</p>
          <p v-if="hunter.hunterYearsExperience" class="hp__years">{{ hunter.hunterYearsExperience }} anos de experiência como recrutador</p>
        </div>
      </header>

      <div v-if="hunter.hunterSpecialties?.length" class="hp__chips">
        <UiBadge v-for="s in hunter.hunterSpecialties" :key="s" variant="outline">{{ s }}</UiBadge>
      </div>

      <section v-if="hunter.bio" class="hp__about">
        <h2>Sobre</h2>
        <p class="hp__bio">{{ hunter.bio }}</p>
      </section>

      <section class="hp__metrics">
        <h2>Métricas</h2>
        <div class="hp__metrics-grid">
          <UiCard class="hp__metric">
            <span class="hp__metric-value">{{ hunter.metrics.totalIndicacoes }}</span>
            <span class="hp__metric-label">Indicações feitas</span>
          </UiCard>
          <UiCard class="hp__metric">
            <span class="hp__metric-value">{{ hunter.metrics.taxaAproveitamento != null ? `${hunter.metrics.taxaAproveitamento}%` : '—' }}</span>
            <span class="hp__metric-label">Taxa de aproveitamento</span>
          </UiCard>
          <UiCard class="hp__metric">
            <span class="hp__metric-value">{{ hunter.metrics.tempoMedioAteAbordagemDias != null ? `${hunter.metrics.tempoMedioAteAbordagemDias}d` : '—' }}</span>
            <span class="hp__metric-label">Tempo médio até 1ª abordagem</span>
          </UiCard>
          <UiCard class="hp__metric">
            <span class="hp__metric-value">{{ hunter.metrics.avaliacaoMedia != null ? hunter.metrics.avaliacaoMedia : '—' }}</span>
            <span class="hp__metric-label">Avaliação média</span>
          </UiCard>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.hp { padding: var(--sp-8) 0 var(--sp-16); }
.hp__missing { text-align: center; padding: var(--sp-12) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }

.hp__header { display: flex; align-items: center; gap: var(--sp-5); flex-wrap: wrap; }
.hp__head-info { flex: 1; min-width: 200px; }
.hp__name { font-size: var(--text-28); display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }
.hp__profession { color: var(--ink-700); font-size: var(--text-16); margin-top: var(--sp-1); }
.hp__location { color: var(--ink-500); font-size: var(--text-13); margin-top: var(--sp-1); }
.hp__years { color: var(--ink-500); font-size: var(--text-13); margin-top: var(--sp-1); }

.hp__chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-6); }

.hp__about { margin-top: var(--sp-8); max-width: 720px; }
.hp__about h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.hp__bio { color: var(--ink-700); line-height: 1.7; white-space: pre-wrap; }

.hp__metrics { margin-top: var(--sp-8); }
.hp__metrics h2 { font-size: var(--text-18); margin-bottom: var(--sp-4); }
.hp__metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
.hp__metric { display: flex; flex-direction: column; gap: var(--sp-1); text-align: center; }
.hp__metric-value { font-family: var(--font-display); font-size: var(--text-28); font-weight: 700; color: var(--ink-900); }
.hp__metric-label { font-size: var(--text-13); color: var(--ink-500); }

@media (max-width: 900px) {
  .hp__metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .hp__header { flex-direction: column; align-items: flex-start; }
}
</style>
