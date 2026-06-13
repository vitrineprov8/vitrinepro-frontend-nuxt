<script setup lang="ts">
// UiCurrencyInput — design-spec/00 §3.2 (formato R$ 0.000,00; v-model em centavos/number)
import { AlertCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: number | null // valor em reais (ex: 1500.5)
  label?: string
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
}>(), { placeholder: 'R$ 0,00', modelValue: null })

const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

const id = useId()
const focused = ref(false)

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return ''
  return formatBRL(props.modelValue)
})

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  // mantém apenas digitos; trata como centavos
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    emit('update:modelValue', null)
    return
  }
  const value = Number(digits) / 100
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
    </label>
    <div class="field__wrap">
      <span class="field__prefix">R$</span>
      <input
        :id="id"
        type="text"
        inputmode="numeric"
        class="field__input field__input--currency"
        :class="{ 'field__input--error': props.error }"
        :value="displayValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :aria-invalid="!!props.error"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      >
    </div>
    <p v-if="props.error" class="field__error">
      <AlertCircle :size="14" /> {{ props.error }}
    </p>
    <p v-else-if="props.helper" class="field__helper">{{ props.helper }}</p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.field__wrap { position: relative; }
.field__prefix {
  position: absolute; left: var(--sp-3); top: 50%; transform: translateY(-50%);
  color: var(--ink-500); font-size: var(--text-14); font-weight: 600; pointer-events: none;
}
.field__input--currency { padding-left: 36px; text-align: right; font-variant-numeric: tabular-nums; }
.field__input {
  width: 100%; height: 40px; padding-inline: var(--sp-3);
  border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  background: var(--white); color: var(--ink-900);
  transition: border-color var(--t-fast); font-size: var(--text-14);
}
.field__input:focus { border-color: var(--blue-500); outline: none; box-shadow: 0 0 0 3px var(--blue-100); }
.field__input--error { border-color: var(--red-500); }
.field__input:disabled { background: var(--ink-100); cursor: not-allowed; }
.field__error { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--text-12); color: var(--red-500); }
.field__helper { font-size: var(--text-12); color: var(--ink-500); }
</style>
