<script setup lang="ts">
// UiBadge — design-spec/00 §3.3
const props = withDefaults(defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'outline'
}>(), { variant: 'neutral' })
</script>

<template>
  <span class="badge" :class="`badge--${props.variant}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  padding: 2px var(--sp-2); border-radius: var(--radius-full);
  font-size: var(--text-12); font-weight: 600; line-height: 1.6;
}
.badge--success { background: var(--brand-100); color: var(--brand-700); }
.badge--warning { background: var(--amber-100); color: #92400E; }
.badge--danger { background: var(--red-100); color: var(--red-500); }
.badge--info { background: var(--blue-100); color: #1E429F; }
.badge--neutral { background: var(--ink-100); color: var(--ink-500); }
.badge--purple { background: var(--purple-100); color: var(--purple-500); }
.badge--outline { background: transparent; border: 1px solid var(--ink-300); color: var(--ink-500); }
</style>
