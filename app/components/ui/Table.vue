<script setup lang="ts">
// UiTable — design-spec/00 §3.5 (skeleton de loading, vazio via UiEmptyState, sort por coluna)
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-vue-next'
import EmptyState from './EmptyState.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  loading?: boolean
  rowKey?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  emptyTitle?: string
  emptyDescription?: string
  clickableRows?: boolean
}>(), {
  rowKey: 'id',
  emptyTitle: 'Nenhum registro encontrado',
  sortDir: 'asc',
})

const emit = defineEmits<{ sort: [key: string], rowClick: [row: Record<string, unknown>] }>()

function onSort(col: TableColumn) {
  if (!col.sortable) return
  emit('sort', col.key)
}

function sortIcon(col: TableColumn) {
  if (!col.sortable) return null
  if (props.sortKey !== col.key) return ChevronsUpDown
  return props.sortDir === 'asc' ? ArrowUp : ArrowDown
}
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th
            v-for="col in props.columns"
            :key="col.key"
            :class="[`table__align--${col.align ?? 'left'}`, { 'table__th--sortable': col.sortable }]"
            :style="col.width ? { width: col.width } : undefined"
            @click="onSort(col)"
          >
            <span class="table__th-content">
              {{ col.label }}
              <component :is="sortIcon(col)" v-if="sortIcon(col)" :size="14" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody v-if="props.loading">
        <tr v-for="i in 5" :key="`skeleton-${i}`">
          <td v-for="col in props.columns" :key="col.key">
            <div class="skeleton table__skeleton-cell" />
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="!props.rows.length">
        <tr>
          <td :colspan="props.columns.length" class="table__empty-cell">
            <EmptyState :title="props.emptyTitle" :description="props.emptyDescription">
              <template v-if="$slots.empty" #action><slot name="empty" /></template>
            </EmptyState>
          </td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr
          v-for="row in props.rows"
          :key="String(row[props.rowKey])"
          :class="{ 'table__row--clickable': props.clickableRows }"
          @click="props.clickableRows && emit('rowClick', row)"
        >
          <td v-for="col in props.columns" :key="col.key" :class="`table__align--${col.align ?? 'left'}`">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: var(--text-14); }
.table th {
  text-align: left; padding: var(--sp-3) var(--sp-4); font-size: var(--text-12);
  font-weight: 600; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--ink-100); white-space: nowrap;
}
.table__th--sortable { cursor: pointer; user-select: none; }
.table__th--sortable:hover { color: var(--ink-900); }
.table__th-content { display: inline-flex; align-items: center; gap: 4px; }
.table td {
  padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--ink-100);
  color: var(--ink-900); vertical-align: middle;
}
.table tbody tr:last-child td { border-bottom: none; }
.table__row--clickable { cursor: pointer; transition: background var(--t-fast); }
.table__row--clickable:hover { background: var(--ink-100); }
.table__align--right { text-align: right; }
.table__align--center { text-align: center; }
.table__skeleton-cell { height: 16px; border-radius: var(--radius-input); width: 100%; }
.table__empty-cell { padding: 0; }
</style>
