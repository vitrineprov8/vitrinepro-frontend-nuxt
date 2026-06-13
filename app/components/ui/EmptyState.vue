<script setup lang="ts">
// UiEmptyState — design-spec/00 §3.11 (estado vazio padrão: ícone + título + descrição + ação)
import { Inbox, type LucideIcon } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  icon?: LucideIcon
  title: string
  description?: string
}>(), {})
</script>

<template>
  <div class="empty">
    <div class="empty__icon">
      <component :is="props.icon ?? Inbox" :size="28" />
    </div>
    <h4 class="empty__title">{{ props.title }}</h4>
    <p v-if="props.description" class="empty__description">{{ props.description }}</p>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: var(--sp-12) var(--sp-6); gap: var(--sp-2);
}
.empty__icon {
  width: 56px; height: 56px; border-radius: var(--radius-full);
  background: var(--ink-100); color: var(--ink-500);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--sp-2);
}
.empty__title { font-size: var(--text-16); font-weight: 600; color: var(--ink-900); }
.empty__description { font-size: var(--text-14); color: var(--ink-500); max-width: 360px; }
.empty__action { margin-top: var(--sp-3); }
</style>
