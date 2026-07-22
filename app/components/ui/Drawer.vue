<script setup lang="ts">
// UiDrawer — painel lateral direito — design-spec/00 §3.7
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  size?: 'md' | 'lg'
}>(), { size: 'md' })

const emit = defineEmits<{ close: [] }>()
onKeyStroke('Escape', () => { if (props.open) emit('close') })
</script>

<template>
  <!-- ClientOnly: evita o mismatch de hidratação do Teleport (ver `ui/Toaster.vue`). -->
  <ClientOnly>
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="props.open" class="drawer-overlay" @click.self="emit('close')">
          <aside class="drawer" :class="`drawer--${props.size}`" role="dialog" aria-modal="true" :aria-label="props.title">
            <header class="drawer__header">
              <slot name="header"><h4>{{ props.title }}</h4></slot>
              <button class="drawer__close" aria-label="Fechar" @click="emit('close')"><X :size="20" /></button>
            </header>
            <div class="drawer__body"><slot /></div>
            <footer v-if="$slots.footer" class="drawer__footer"><slot name="footer" /></footer>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(11, 18, 32, 0.5); }
.drawer {
  position: absolute; top: 0; right: 0; height: 100%;
  background: var(--white); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; width: 100%;
}
.drawer--md { max-width: 480px; }
.drawer--lg { max-width: 640px; }
.drawer__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-5) var(--sp-6); border-bottom: 1px solid var(--ink-100);
}
.drawer__close { background: none; border: none; color: var(--ink-500); display: flex; }
.drawer__body { flex: 1; padding: var(--sp-6); overflow-y: auto; }
.drawer__footer {
  position: sticky; bottom: 0; background: var(--white);
  display: flex; justify-content: flex-end; gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6); border-top: 1px solid var(--ink-100);
}
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform var(--t-overlay); }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }
.drawer-enter-active, .drawer-leave-active { transition: opacity var(--t-overlay); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
</style>
