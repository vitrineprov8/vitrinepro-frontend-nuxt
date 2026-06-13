<script setup lang="ts">
// UiMultiSelect — design-spec/00 §3.2 (chips removíveis)
import { ChevronDown, AlertCircle, Check, X } from 'lucide-vue-next'
import type { SelectOption } from './Select.vue'

const props = withDefaults(defineProps<{
  modelValue?: string[]
  options: SelectOption[]
  label?: string
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
  max?: number
}>(), { placeholder: 'Selecionar...', modelValue: () => [] })

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const id = useId()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectedOptions = computed(() => props.options.filter(o => props.modelValue?.includes(o.value)))
const atMax = computed(() => !!props.max && (props.modelValue?.length ?? 0) >= props.max)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function toggleOption(option: SelectOption) {
  if (option.disabled) return
  const current = props.modelValue ?? []
  if (current.includes(option.value)) {
    emit('update:modelValue', current.filter(v => v !== option.value))
  } else {
    if (atMax.value) return
    emit('update:modelValue', [...current, option.value])
  }
}

function removeChip(value: string) {
  emit('update:modelValue', (props.modelValue ?? []).filter(v => v !== value))
}

onClickOutside(root, () => { open.value = false })
onKeyStroke('Escape', () => { open.value = false })
</script>

<template>
  <div ref="root" class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
      <span v-if="props.max" class="field__counter">{{ (props.modelValue ?? []).length }}/{{ props.max }}</span>
    </label>
    <div class="select" :class="{ 'select--open': open, 'select--error': props.error, 'select--disabled': props.disabled }">
      <button
        :id="id"
        type="button"
        class="select__trigger"
        :disabled="props.disabled"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click="toggle"
      >
        <div v-if="selectedOptions.length" class="select__chips">
          <span v-for="opt in selectedOptions" :key="opt.value" class="chip">
            {{ opt.label }}
            <button type="button" class="chip__remove" :aria-label="`Remover ${opt.label}`" @click.stop="removeChip(opt.value)">
              <X :size="12" />
            </button>
          </span>
        </div>
        <span v-else class="select__value select__value--placeholder">{{ props.placeholder }}</span>
        <ChevronDown :size="18" class="select__chevron" />
      </button>
      <ul v-if="open" class="select__menu" role="listbox" aria-multiselectable="true">
        <li
          v-for="option in props.options"
          :key="option.value"
          role="option"
          class="select__option"
          :class="{
            'select__option--selected': props.modelValue?.includes(option.value),
            'select__option--disabled': option.disabled || (atMax && !props.modelValue?.includes(option.value)),
          }"
          :aria-selected="props.modelValue?.includes(option.value)"
          @click="toggleOption(option)"
        >
          <span>{{ option.label }}</span>
          <Check v-if="props.modelValue?.includes(option.value)" :size="16" />
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
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; display: flex; justify-content: space-between; }
.field__counter { color: var(--ink-300); font-weight: 400; }
.field__error { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--text-12); color: var(--red-500); }
.field__helper { font-size: var(--text-12); color: var(--ink-500); }

.select { position: relative; }
.select__trigger {
  width: 100%; min-height: 40px; padding: var(--sp-1) var(--sp-3);
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

.select__chips { display: flex; flex-wrap: wrap; gap: var(--sp-1); flex: 1; }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--brand-100); color: var(--brand-700); font-weight: 600;
  font-size: var(--text-12); padding: 2px var(--sp-2); border-radius: var(--radius-full);
}
.chip__remove { display: flex; background: none; border: none; color: var(--brand-700); cursor: pointer; }
.chip__remove:hover { color: var(--ink-900); }

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
.select__option:hover { background: var(--ink-100); }
.select__option--selected { color: var(--brand-700); font-weight: 600; }
.select__option--disabled { color: var(--ink-300); cursor: not-allowed; pointer-events: none; }
.select__empty { padding: var(--sp-3); font-size: var(--text-13); color: var(--ink-500); text-align: center; }
</style>
