<script setup lang="ts">
// UiPasswordStrength — design-spec/00 §3.2 (medidor de força, 4 níveis — usado em T13/T15)
const props = defineProps<{ value: string }>()

const score = computed(() => {
  const v = props.value
  if (!v) return 0
  let s = 0
  if (v.length >= 8) s++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++
  if (/\d/.test(v)) s++
  if (/[^A-Za-z0-9]/.test(v)) s++
  return Math.max(s, v.length > 0 ? 1 : 0)
})

const labels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte']
const label = computed(() => labels[score.value] ?? labels[0])
</script>

<template>
  <div v-if="props.value" class="strength">
    <div class="strength__bars">
      <span
        v-for="i in 4" :key="i" class="strength__bar"
        :class="{ 'strength__bar--filled': i <= score, [`strength__bar--${score}`]: i <= score }"
      />
    </div>
    <span class="strength__label" :class="`strength__label--${score}`">{{ label }}</span>
  </div>
</template>

<style scoped>
.strength { display: flex; align-items: center; gap: var(--sp-2); margin-top: var(--sp-1); }
.strength__bars { display: flex; gap: 4px; flex: 1; }
.strength__bar { flex: 1; height: 4px; border-radius: var(--radius-full); background: var(--ink-100); }
.strength__bar--1 { background: var(--red-500); }
.strength__bar--2 { background: var(--amber-500); }
.strength__bar--3 { background: var(--blue-500); }
.strength__bar--4 { background: var(--brand-600); }
.strength__label { font-size: var(--text-12); white-space: nowrap; }
.strength__label--1 { color: var(--red-500); }
.strength__label--2 { color: var(--amber-500); }
.strength__label--3 { color: var(--blue-500); }
.strength__label--4 { color: var(--brand-600); }
</style>
