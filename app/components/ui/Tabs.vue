<script setup lang="ts">
// UiTabs — design-spec/00 §3.8
export interface TabItem {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const tabRefs = ref<Record<string, HTMLElement | undefined>>({})

function select(tab: TabItem) {
  if (tab.disabled) return
  emit('update:modelValue', tab.value)
}

function onKeydown(e: KeyboardEvent, index: number) {
  let nextIndex = index
  if (e.key === 'ArrowRight') nextIndex = (index + 1) % props.tabs.length
  else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + props.tabs.length) % props.tabs.length
  else return
  e.preventDefault()
  const next = props.tabs[nextIndex]
  if (next) {
    select(next)
    tabRefs.value[next.value]?.focus()
  }
}
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="(tab, i) in props.tabs"
      :key="tab.value"
      :ref="(el) => { tabRefs[tab.value] = el as HTMLElement }"
      type="button"
      role="tab"
      class="tabs__item"
      :class="{ 'tabs__item--active': tab.value === props.modelValue }"
      :aria-selected="tab.value === props.modelValue"
      :disabled="tab.disabled"
      :tabindex="tab.value === props.modelValue ? 0 : -1"
      @click="select(tab)"
      @keydown="onKeydown($event, i)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="tabs__count">{{ tab.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex; gap: var(--sp-4); border-bottom: 1px solid var(--ink-100);
  overflow-x: auto;
}
.tabs__item {
  display: flex; align-items: center; gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-1); border: none; background: none;
  border-bottom: 2px solid transparent; color: var(--ink-500);
  font-size: var(--text-14); font-weight: 500; white-space: nowrap;
  transition: color var(--t-fast), border-color var(--t-fast);
}
.tabs__item:hover:not(:disabled) { color: var(--ink-900); }
.tabs__item--active { color: var(--brand-700); border-color: var(--brand-600); font-weight: 600; }
.tabs__item:disabled { color: var(--ink-300); cursor: not-allowed; }
.tabs__item:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-input); }
.tabs__count {
  background: var(--ink-100); color: var(--ink-500); border-radius: var(--radius-full);
  font-size: var(--text-12); font-weight: 600; padding: 0 6px; line-height: 1.6;
}
.tabs__item--active .tabs__count { background: var(--brand-100); color: var(--brand-700); }
</style>
