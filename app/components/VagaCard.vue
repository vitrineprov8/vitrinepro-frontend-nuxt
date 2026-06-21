<script setup lang="ts">
// VagaCard — card reutilizável de vaga (carrossel da Home T01, grid de /vagas T05, "semelhantes" T06).
// Campos 100% reais do backend (vaga.entity.ts). Pill de fee em R$ aguarda gap B4.
import type { Vaga } from '~/types/vaga'
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL, VAGA_SEGMENT_LABEL } from '~/types/vaga'

const props = defineProps<{ vaga: Vaga }>()

const salario = computed(() => {
  const min = props.vaga.salaryMin != null ? Number(props.vaga.salaryMin) : null
  const max = props.vaga.salaryMax != null ? Number(props.vaga.salaryMax) : null
  if (min == null && max == null) return null
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  return fmt((min ?? max) as number)
})

const publicada = computed(() => {
  const base = props.vaga.publishedAt ?? props.vaga.createdAt
  if (!base) return null
  const diff = Date.now() - new Date(base).getTime()
  const dias = Math.floor(diff / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'há 1 dia'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
})

const tipoLabel = computed(() => (props.vaga.type ? VAGA_TYPE_LABEL[props.vaga.type] : null))
const modoLabel = computed(() => (props.vaga.workMode ? VAGA_WORK_MODE_LABEL[props.vaga.workMode] : null))
const segmentoLabel = computed(() => (props.vaga.segment ? VAGA_SEGMENT_LABEL[props.vaga.segment] : null))
</script>

<template>
  <NuxtLink :to="`/vaga/${vaga.slug}`" class="vaga-card-link">
    <UiCard clickable>
      <div class="vaga-card__head">
        <h3 class="vaga-card__title">{{ vaga.title }}</h3>
        <UiBadge v-if="vaga.allowHunters" variant="success">Aceita hunters</UiBadge>
      </div>

      <p v-if="vaga.location" class="vaga-card__location">{{ vaga.location }}</p>

      <div class="vaga-card__pills">
        <UiBadge v-if="modoLabel" variant="neutral">{{ modoLabel }}</UiBadge>
        <UiBadge v-if="tipoLabel" variant="neutral">{{ tipoLabel }}</UiBadge>
        <UiBadge v-if="segmentoLabel" variant="outline">{{ segmentoLabel }}</UiBadge>
      </div>

      <div class="vaga-card__foot">
        <span v-if="salario" class="vaga-card__salary">{{ salario }}</span>
        <span v-else class="vaga-card__salary vaga-card__salary--muted">Salário a combinar</span>
        <span v-if="publicada" class="vaga-card__date">{{ publicada }}</span>
      </div>
    </UiCard>
  </NuxtLink>
</template>

<style scoped>
.vaga-card-link { display: block; text-decoration: none; color: inherit; height: 100%; }
.vaga-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); }
.vaga-card__title {
  font-size: var(--text-16); font-weight: 600; color: var(--ink-900);
  line-height: 1.35; margin: 0;
}
.vaga-card__location { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.vaga-card__pills { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-3); }
.vaga-card__foot {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--sp-3); margin-top: var(--sp-4);
  border-top: 1px solid var(--ink-100); padding-top: var(--sp-3);
}
.vaga-card__salary { font-size: var(--text-14); font-weight: 600; color: var(--brand-700); }
.vaga-card__salary--muted { color: var(--ink-500); font-weight: 500; }
.vaga-card__date { font-size: var(--text-12); color: var(--ink-500); white-space: nowrap; }
</style>
