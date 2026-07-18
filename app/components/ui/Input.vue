<script setup lang="ts">
// UiInput — design-spec/00 §3.2 (text/email/password com toggle olho)
import { Eye, EyeOff, AlertCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url'
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  // Props explícitas em vez de fallthrough de atributos: o root deste
  // componente é a `div.field`, então um `inputmode`/`maxlength` passado de
  // fora pousaria na div e não teria efeito nenhum — silenciosamente.
  // (B27 precisou dos três no campo de código de verificação.)
  inputmode?: 'text' | 'numeric' | 'tel'
  maxlength?: number
  autofocus?: boolean
}>(), { type: 'text', modelValue: '' })

const emit = defineEmits<{ 'update:modelValue': [string] }>()
const showPassword = ref(false)
const inputType = computed(() =>
  props.type === 'password' ? (showPassword.value ? 'text' : 'password') : props.type,
)
const id = useId()

// Permite que o pai chame `inputRef.focus()` — `ref` num componente devolve a
// instância, não o elemento, então sem este expose não há como focar de fora.
const inputEl = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<template>
  <div class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
    </label>
    <div class="field__wrap">
      <input
        :id="id"
        ref="inputEl"
        :type="inputType"
        class="field__input"
        :class="{ 'field__input--error': props.error }"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :autocomplete="props.autocomplete"
        :inputmode="props.inputmode"
        :maxlength="props.maxlength"
        :autofocus="props.autofocus"
        :aria-invalid="!!props.error"
        :aria-describedby="props.error ? `${id}-err` : undefined"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="props.type === 'password'"
        type="button"
        class="field__eye"
        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
        @click="showPassword = !showPassword"
      >
        <component :is="showPassword ? EyeOff : Eye" :size="18" />
      </button>
    </div>
    <p v-if="props.error" :id="`${id}-err`" class="field__error">
      <AlertCircle :size="14" /> {{ props.error }}
    </p>
    <p v-else-if="props.helper" class="field__helper">{{ props.helper }}</p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.field__wrap { position: relative; }
.field__input {
  width: 100%; height: 40px; padding-inline: var(--sp-3);
  border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  background: var(--white); color: var(--ink-900);
  transition: border-color var(--t-fast);
}
.field__input:focus { border-color: var(--blue-500); outline: none; box-shadow: 0 0 0 3px var(--blue-100); }
.field__input--error { border-color: var(--red-500); }
.field__input:disabled { background: var(--ink-100); cursor: not-allowed; }
.field__eye {
  position: absolute; right: var(--sp-3); top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--ink-500); display: flex;
}
.field__error { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--text-12); color: var(--red-500); }
.field__helper { font-size: var(--text-12); color: var(--ink-500); }
</style>
