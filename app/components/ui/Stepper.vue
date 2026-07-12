<script setup lang="ts">
// UiStepper — design-spec/00 §3.8 (fluxos multi-passo: cadastro, submeter candidato, checkout)
import { Check } from 'lucide-vue-next'

export interface StepItem {
  label: string
  description?: string
}

const props = defineProps<{
  steps: StepItem[]
  /** índice (0-based) do passo atual */
  current: number
}>()
</script>

<template>
  <ol class="stepper" role="list">
    <li
      v-for="(step, i) in props.steps"
      :key="i"
      class="stepper__item"
      :class="{
        'stepper__item--done': i < props.current,
        'stepper__item--current': i === props.current,
      }"
    >
      <div class="stepper__indicator">
        <Check v-if="i < props.current" :size="16" />
        <span v-else>{{ i + 1 }}</span>
      </div>
      <div class="stepper__text">
        <span class="stepper__label">{{ step.label }}</span>
        <span v-if="step.description" class="stepper__description">{{ step.description }}</span>
      </div>
      <div v-if="i < props.steps.length - 1" class="stepper__connector" aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex; align-items: flex-start; list-style: none; width: 100%;
}
.stepper__item {
  display: flex; align-items: flex-start; gap: var(--sp-2);
  flex: 1; position: relative;
}
.stepper__indicator {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  border: 2px solid var(--ink-300); color: var(--ink-500);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-13); font-weight: 600; flex-shrink: 0;
  background: var(--white); transition: all var(--t-fast); z-index: 1;
}
.stepper__item--current .stepper__indicator {
  border-color: var(--brand-600); color: var(--brand-700); background: var(--brand-100);
}
.stepper__item--done .stepper__indicator {
  border-color: var(--brand-600); background: var(--brand-600); color: var(--white);
}
.stepper__text { display: flex; flex-direction: column; padding-top: 2px; }
.stepper__label { font-size: var(--text-13); font-weight: 600; color: var(--ink-900); }
.stepper__item:not(.stepper__item--current):not(.stepper__item--done) .stepper__label { color: var(--ink-500); font-weight: 500; }
.stepper__description { font-size: var(--text-12); color: var(--ink-500); }
.stepper__connector {
  /* z-index: -1 (não 0) — um bloco absolute com z-index:0/auto entra no
     mesmo nível de empilhamento dos descendentes posicionados e pinta DEPOIS
     do texto não-posicionado do próprio item (.stepper__text), cobrindo o
     label com um risco horizontal quando a descrição é curta. Negativo
     garante que a linha pinte atrás do texto (achado ao validar PlacementTimeline). */
  position: absolute; top: 13px; left: 28px; right: calc(-1 * var(--sp-2));
  height: 2px; background: var(--ink-300); z-index: -1;
}
.stepper__item--done .stepper__connector { background: var(--brand-600); }

@media (max-width: 640px) {
  .stepper__text { display: none; }
  .stepper__item { flex: 0 0 auto; }
  .stepper__connector { left: 28px; width: var(--sp-6); right: auto; }
}
</style>
