<script setup lang="ts">
// UiPhoneInput — design-spec/00 §3.2 (máscara (00) 00000-0000)
import { AlertCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string // apenas dígitos
  label?: string
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
}>(), { placeholder: '(00) 00000-0000', modelValue: '' })

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const id = useId()

function maskPhone(digits: string) {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const displayValue = computed(() => maskPhone(props.modelValue ?? ''))

function onInput(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 11)
  emit('update:modelValue', digits)
}
</script>

<template>
  <div class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
    </label>
    <input
      :id="id"
      type="tel"
      inputmode="numeric"
      autocomplete="tel"
      class="field__input"
      :class="{ 'field__input--error': props.error }"
      :value="displayValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :aria-invalid="!!props.error"
      @input="onInput"
    >
    <p v-if="props.error" class="field__error">
      <AlertCircle :size="14" /> {{ props.error }}
    </p>
    <p v-else-if="props.helper" class="field__helper">{{ props.helper }}</p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
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
