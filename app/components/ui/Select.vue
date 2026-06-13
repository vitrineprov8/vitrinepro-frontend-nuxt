<script setup lang="ts">
// UiSelect — design-spec/00 §3.2
import { ChevronDown, AlertCircle, Check } from 'lucide-vue-next'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string | null
  options: SelectOption[]
  label?: string
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
}>(), { placeholder: 'Selecionar...', modelValue: null })

const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const id = useId()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const highlighted = ref(-1)

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue) ?? null)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    highlighted.value = props.options.findIndex(o => o.value === props.modelValue)
  }
}

function select(option: SelectOption) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      open.value = true
      highlighted.value = props.options.findIndex(o => o.value === props.modelValue)
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlighted.value = Math.min(highlighted.value + 1, props.options.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlighted.value = Math.max(highlighted.value - 1, 0)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const opt = props.options[highlighted.value]
    if (opt) select(opt)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

onClickOutside(root, () => { open.value = false })
</script>

<template>
  <div ref="root" class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
    </label>
    <div class="select" :class="{ 'select--open': open, 'select--error': props.error, 'select--disabled': props.disabled }">
      <button
        :id="id"
        type="button"
        class="select__trigger"
        :disabled="props.disabled"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :aria-invalid="!!props.error"
        @click="toggle"
        @keydown="onKeydown"
      >
        <span class="select__value" :class="{ 'select__value--placeholder': !selectedOption }">
          {{ selectedOption ? selectedOption.label : props.placeholder }}
        </span>
        <ChevronDown :size="18" class="select__chevron" />
      </button>
      <ul v-if="open" class="select__menu" role="listbox">
        <li
          v-for="(option, i) in props.options"
          :key="option.value"
          role="option"
          class="select__option"
          :class="{ 'select__option--active': i === highlighted, 'select__option--selected': option.value === props.modelValue, 'select__option--disabled': option.disabled }"
          :aria-selected="option.value === props.modelValue"
          @click="select(option)"
          @mouseenter="highlighted = i"
        >
          <span>{{ option.label }}</span>
          <Check v-if="option.value === props.modelValue" :size="16" />
        </li>
        <li v-if="!props.options.length" class="select__empty">Nenhuma opção</li>
      </ul>
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
.field__error { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--text-12); color: var(--red-500); }
.field__helper { font-size: var(--text-12); color: var(--ink-500); }

.select { position: relative; }
.select__trigger {
  width: 100%; height: 40px; padding-inline: var(--sp-3);
  border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  background: var(--white); color: var(--ink-900);
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2);
  transition: border-color var(--t-fast); font-size: var(--text-14); text-align: left;
}
.select__trigger:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.select--open .select__trigger { border-color: var(--blue-500); box-shadow: 0 0 0 3px var(--blue-100); }
.select--error .select__trigger { border-color: var(--red-500); }
.select--disabled .select__trigger { background: var(--ink-100); cursor: not-allowed; color: var(--ink-500); }
.select__value--placeholder { color: var(--ink-500); }
.select__chevron { color: var(--ink-500); flex-shrink: 0; transition: transform var(--t-fast); }
.select--open .select__chevron { transform: rotate(180deg); }

.select__menu {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input);
  box-shadow: var(--shadow-md); max-height: 240px; overflow-y: auto; padding: var(--sp-1);
  list-style: none;
}
.select__option {
  padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-input);
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2);
  font-size: var(--text-14); color: var(--ink-900); cursor: pointer;
}
.select__option:hover, .select__option--active { background: var(--ink-100); }
.select__option--selected { color: var(--brand-700); font-weight: 600; }
.select__option--disabled { color: var(--ink-300); cursor: not-allowed; pointer-events: none; }
.select__empty { padding: var(--sp-3); font-size: var(--text-13); color: var(--ink-500); text-align: center; }
</style>
