<script setup lang="ts">
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
const { toasts, dismiss } = useToast()
const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
</script>

<template>
  <Teleport to="body">
    <div class="toaster" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.type}`">
          <component :is="icons[t.type]" :size="18" class="toast__icon" />
          <span class="toast__msg">{{ t.message }}</span>
          <button v-if="t.actionLabel" class="toast__action" @click="t.onAction?.(); dismiss(t.id)">
            {{ t.actionLabel }}
          </button>
          <button class="toast__close" aria-label="Fechar" @click="dismiss(t.id)"><X :size="14" /></button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toaster {
  position: fixed; bottom: var(--sp-6); right: var(--sp-6); z-index: 200;
  display: flex; flex-direction: column; gap: var(--sp-2); max-width: 380px;
}
.toast {
  display: flex; align-items: center; gap: var(--sp-2);
  background: var(--ink-900); color: var(--white);
  padding: var(--sp-3) var(--sp-4); border-radius: var(--radius-card);
  box-shadow: var(--shadow-lg); font-size: var(--text-14);
}
.toast--success .toast__icon { color: var(--brand-600); }
.toast--error .toast__icon { color: var(--red-500); }
.toast--info .toast__icon { color: var(--blue-500); }
.toast--warning .toast__icon { color: var(--amber-500); }
.toast__msg { flex: 1; }
.toast__action {
  background: none; border: none; color: var(--brand-600); font-weight: 600; font-size: var(--text-13);
}
.toast__close { background: none; border: none; color: var(--ink-300); display: flex; }
.toast-enter-active, .toast-leave-active { transition: all var(--t-overlay); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
