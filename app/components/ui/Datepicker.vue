<script setup lang="ts">
// UiDatepicker — design-spec/00 §3.2 (calendário popover, formato dd/mm/aaaa)
import { Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string | null // ISO yyyy-mm-dd
  label?: string
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
  disabled?: boolean
  min?: string
  max?: string
}>(), { placeholder: 'dd/mm/aaaa', modelValue: null })

const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const id = useId()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectedDate = computed(() => (props.modelValue ? new Date(`${props.modelValue}T00:00:00`) : null))
const viewDate = ref(selectedDate.value ?? new Date())

const displayValue = computed(() => {
  if (!selectedDate.value) return ''
  return selectedDate.value.toLocaleDateString('pt-BR')
})

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthLabel = computed(() =>
  viewDate.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
)

const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: { date: Date, outside: boolean }[] = []
  for (let i = startOffset; i > 0; i--) {
    days.push({ date: new Date(year, month, 1 - i), outside: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), outside: false })
  }
  while (days.length % 7 !== 0 || days.length < 35) {
    const last = days[days.length - 1]!.date
    days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true })
  }
  return days
})

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isDisabled(date: Date) {
  const iso = toISO(date)
  if (props.min && iso < props.min) return true
  if (props.max && iso > props.max) return true
  return false
}

function isSelected(date: Date) {
  return !!selectedDate.value && toISO(date) === toISO(selectedDate.value)
}

function isToday(date: Date) {
  return toISO(date) === toISO(new Date())
}

function selectDate(date: Date) {
  if (isDisabled(date)) return
  emit('update:modelValue', toISO(date))
  open.value = false
}

function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

function toggle() {
  if (props.disabled) return
  if (!open.value && selectedDate.value) viewDate.value = selectedDate.value
  open.value = !open.value
}

onClickOutside(root, () => { open.value = false })
onKeyStroke('Escape', () => { open.value = false })
</script>

<template>
  <div ref="root" class="field">
    <label v-if="props.label" :for="id" class="field__label">
      {{ props.label }}<span v-if="props.required" class="text-danger"> *</span>
    </label>
    <div class="datepicker" :class="{ 'datepicker--error': props.error }">
      <button
        :id="id"
        type="button"
        class="datepicker__trigger"
        :disabled="props.disabled"
        :aria-expanded="open"
        @click="toggle"
      >
        <span :class="{ 'datepicker__value--placeholder': !displayValue }">{{ displayValue || props.placeholder }}</span>
        <Calendar :size="18" />
      </button>
      <div v-if="open" class="datepicker__popover" role="dialog" aria-label="Selecionar data">
        <div class="datepicker__header">
          <button type="button" aria-label="Mês anterior" @click="prevMonth"><ChevronLeft :size="18" /></button>
          <strong class="datepicker__month">{{ monthLabel }}</strong>
          <button type="button" aria-label="Próximo mês" @click="nextMonth"><ChevronRight :size="18" /></button>
        </div>
        <div class="datepicker__grid datepicker__grid--head">
          <span v-for="(d, i) in weekDays" :key="i">{{ d }}</span>
        </div>
        <div class="datepicker__grid">
          <button
            v-for="(day, i) in calendarDays"
            :key="i"
            type="button"
            class="datepicker__day"
            :class="{
              'datepicker__day--outside': day.outside,
              'datepicker__day--selected': isSelected(day.date),
              'datepicker__day--today': isToday(day.date) && !isSelected(day.date),
            }"
            :disabled="isDisabled(day.date)"
            @click="selectDate(day.date)"
          >
            {{ day.date.getDate() }}
          </button>
        </div>
      </div>
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

.datepicker { position: relative; }
.datepicker__trigger {
  width: 100%; height: 40px; padding-inline: var(--sp-3);
  border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  background: var(--white); color: var(--ink-900);
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2);
  font-size: var(--text-14); transition: border-color var(--t-fast);
}
.datepicker__trigger:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.datepicker--error .datepicker__trigger { border-color: var(--red-500); }
.datepicker__trigger:disabled { background: var(--ink-100); cursor: not-allowed; color: var(--ink-500); }
.datepicker__value--placeholder { color: var(--ink-500); }
.datepicker__trigger > :last-child { color: var(--ink-500); }

.datepicker__popover {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card);
  box-shadow: var(--shadow-md); padding: var(--sp-3); width: 280px;
}
.datepicker__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.datepicker__header button { background: none; border: none; color: var(--ink-500); display: flex; padding: var(--sp-1); border-radius: var(--radius-input); }
.datepicker__header button:hover { background: var(--ink-100); color: var(--ink-900); }
.datepicker__month { font-size: var(--text-14); text-transform: capitalize; color: var(--ink-900); }
.datepicker__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.datepicker__grid--head { margin-bottom: 4px; }
.datepicker__grid--head span { text-align: center; font-size: var(--text-12); color: var(--ink-500); font-weight: 600; }
.datepicker__day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: var(--radius-input);
  font-size: var(--text-13); color: var(--ink-900); cursor: pointer;
}
.datepicker__day:hover:not(:disabled) { background: var(--ink-100); }
.datepicker__day--outside { color: var(--ink-300); }
.datepicker__day--today { font-weight: 700; color: var(--brand-700); }
.datepicker__day--selected { background: var(--brand-600); color: var(--white); font-weight: 600; }
.datepicker__day:disabled { color: var(--ink-300); cursor: not-allowed; }
</style>
