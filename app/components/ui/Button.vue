<script setup lang="ts">
// UiButton — design-spec/00 §3.1
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  block?: boolean
}>(), { variant: 'primary', size: 'md', type: 'button' })
</script>

<template>
  <button
    :type="props.type"
    class="btn"
    :class="[`btn--${props.variant}`, `btn--${props.size}`, { 'btn--block': props.block, 'btn--loading': props.loading }]"
    :disabled="props.disabled || props.loading"
  >
    <span v-if="props.loading" class="btn__spinner" aria-hidden="true" />
    <span class="btn__label" :class="{ invisible: props.loading }"><slot /></span>
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  border: 1px solid transparent; border-radius: var(--radius-input);
  font-weight: 600; transition: background var(--t-fast), border-color var(--t-fast);
  white-space: nowrap;
}
.btn--sm { height: 32px; padding-inline: var(--sp-4); font-size: var(--text-13); }
.btn--md { height: 40px; padding-inline: var(--sp-5); font-size: var(--text-14); }
.btn--lg { height: 48px; padding-inline: var(--sp-6); font-size: var(--text-16); }
.btn--block { width: 100%; }

.btn--primary { background: var(--brand-600); color: var(--white); }
.btn--primary:hover:not(:disabled) { background: var(--brand-700); }
.btn--secondary { background: var(--white); border-color: var(--ink-300); color: var(--ink-900); }
.btn--secondary:hover:not(:disabled) { background: var(--ink-100); }
.btn--ghost { background: transparent; color: var(--ink-900); }
.btn--ghost:hover:not(:disabled) { background: var(--ink-100); }
.btn--danger { background: var(--red-500); color: var(--white); }
.btn--danger:hover:not(:disabled) { filter: brightness(0.92); }
.btn--link { background: none; color: var(--blue-500); padding-inline: 0; height: auto; }
.btn--link:hover:not(:disabled) { text-decoration: underline; }

.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn__spinner {
  position: absolute; width: 16px; height: 16px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: var(--radius-full); animation: spin 0.7s linear infinite;
}
.invisible { visibility: hidden; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
