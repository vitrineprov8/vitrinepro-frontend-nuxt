<script setup lang="ts">
// UiCard — design-spec/00 §3.4
const props = defineProps<{ clickable?: boolean }>()
</script>

<template>
  <div class="card" :class="{ 'card--clickable': props.clickable }">
    <slot />
  </div>
</template>

<style scoped>
.card {
  background: var(--white); border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm); padding: var(--sp-5);
  transition: box-shadow var(--t-fast), transform var(--t-fast);
}
.card--clickable { cursor: pointer; }
.card--clickable:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
</style>
