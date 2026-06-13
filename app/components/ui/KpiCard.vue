<script setup lang="ts">
// UiKpiCard — design-spec/00 §3.4 (cards de métrica: "Minha mesa" hunter, KPIs consultoria/admin)
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-vue-next'
import Card from './Card.vue'

const props = withDefaults(defineProps<{
  label: string
  value: string
  icon?: LucideIcon
  /** variação percentual vs período anterior (ex: 12.5 ou -4.2) */
  delta?: number
  deltaLabel?: string
  loading?: boolean
}>(), {})

const deltaPositive = computed(() => (props.delta ?? 0) >= 0)
</script>

<template>
  <Card class="kpi">
    <div class="kpi__header">
      <span class="kpi__label">{{ props.label }}</span>
      <span v-if="props.icon" class="kpi__icon">
        <component :is="props.icon" :size="18" />
      </span>
    </div>
    <div v-if="props.loading" class="skeleton kpi__skeleton" />
    <p v-else class="kpi__value tabular">{{ props.value }}</p>
    <p v-if="props.delta !== undefined && !props.loading" class="kpi__delta" :class="deltaPositive ? 'kpi__delta--up' : 'kpi__delta--down'">
      <component :is="deltaPositive ? TrendingUp : TrendingDown" :size="14" />
      {{ Math.abs(props.delta).toFixed(1) }}% {{ props.deltaLabel ?? 'vs. período anterior' }}
    </p>
  </Card>
</template>

<style scoped>
.kpi { display: flex; flex-direction: column; gap: var(--sp-2); }
.kpi__header { display: flex; align-items: center; justify-content: space-between; }
.kpi__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.kpi__icon { color: var(--ink-300); display: flex; }
.kpi__value { font-family: var(--font-display); font-size: var(--text-28); font-weight: 600; color: var(--ink-900); }
.kpi__skeleton { height: 32px; width: 60%; }
.kpi__delta { display: flex; align-items: center; gap: 4px; font-size: var(--text-12); font-weight: 600; }
.kpi__delta--up { color: var(--brand-600); }
.kpi__delta--down { color: var(--red-500); }
</style>
