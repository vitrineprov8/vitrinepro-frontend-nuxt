<script setup lang="ts">
// UiPagination — design-spec/00 §3.5
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  lastPage: number
  total?: number
}>()

const emit = defineEmits<{ 'update:page': [number] }>()

const pages = computed(() => {
  const { page, lastPage } = props
  const items: (number | '...')[] = []
  const range = 1
  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || (i >= page - range && i <= page + range)) {
      items.push(i)
    } else if (items[items.length - 1] !== '...') {
      items.push('...')
    }
  }
  return items
})

function go(p: number) {
  if (p < 1 || p > props.lastPage || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <nav class="pagination" aria-label="Paginação">
    <p v-if="props.total !== undefined" class="pagination__total">{{ props.total }} resultado{{ props.total === 1 ? '' : 's' }}</p>
    <div class="pagination__controls">
      <button
        type="button" class="pagination__btn" aria-label="Página anterior"
        :disabled="props.page <= 1" @click="go(props.page - 1)"
      >
        <ChevronLeft :size="16" />
      </button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '...'" class="pagination__ellipsis">…</span>
        <button
          v-else type="button" class="pagination__btn"
          :class="{ 'pagination__btn--active': p === props.page }"
          :aria-current="p === props.page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button" class="pagination__btn" aria-label="Próxima página"
        :disabled="props.page >= props.lastPage" @click="go(props.page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-3); flex-wrap: wrap; font-size: var(--text-13);
}
.pagination__total { color: var(--ink-500); }
.pagination__controls { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.pagination__btn {
  min-width: 32px; height: 32px; padding-inline: var(--sp-2);
  border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  background: var(--white); color: var(--ink-900);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-13); transition: all var(--t-fast);
}
.pagination__btn:hover:not(:disabled):not(.pagination__btn--active) { background: var(--ink-100); }
.pagination__btn--active { background: var(--brand-600); border-color: var(--brand-600); color: var(--white); font-weight: 600; }
.pagination__btn:disabled { color: var(--ink-300); cursor: not-allowed; }
.pagination__ellipsis { color: var(--ink-500); padding-inline: 4px; }
</style>
