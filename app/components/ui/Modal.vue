<script setup lang="ts">
// UiModal — design-spec/00 §3.6
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  /** Quando true, ESC/overlay pedem confirmação antes de fechar */
  dirty?: boolean
}>(), { size: 'md' })

const emit = defineEmits<{ close: [] }>()

function requestClose() {
  if (props.dirty && !window.confirm('Descartar alterações?')) return
  emit('close')
}

onKeyStroke('Escape', () => { if (props.open) requestClose() })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="props.open" class="modal-overlay" @click.self="requestClose">
        <div class="modal" :class="`modal--${props.size}`" role="dialog" aria-modal="true" :aria-label="props.title">
          <header v-if="props.title || $slots.header" class="modal__header">
            <slot name="header"><h4>{{ props.title }}</h4></slot>
            <button class="modal__close" aria-label="Fechar" @click="requestClose"><X :size="20" /></button>
          </header>
          <div class="modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="modal__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(11, 18, 32, 0.5);
  display: flex; align-items: center; justify-content: center; padding: var(--sp-4);
}
.modal {
  background: var(--white); border-radius: var(--radius-modal);
  box-shadow: var(--shadow-lg); width: 100%;
  max-height: calc(100vh - 64px); display: flex; flex-direction: column;
}
.modal--sm { max-width: 400px; }
.modal--md { max-width: 560px; }
.modal--lg { max-width: 720px; }
.modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-5) var(--sp-6); border-bottom: 1px solid var(--ink-100);
}
.modal__close { background: none; border: none; color: var(--ink-500); display: flex; }
.modal__body { padding: var(--sp-6); overflow-y: auto; }
.modal__footer {
  display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6); border-top: 1px solid var(--ink-100);
}
.modal-enter-active, .modal-leave-active { transition: opacity var(--t-overlay); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
/* F16 — UiModal é compartilhado por praticamente todo modal do app (Upgrade,
   MarkHired, ReportDeparture, Consent, etc.). O footer com 2 botões (ex.:
   "Ver todos os planos" + "Fazer upgrade") não tinha flex-wrap, então em
   telas estreitas (~375-390px) o par não cabia e, por causa do
   justify-content:flex-end, o 1º botão vazava pra fora da tela pela
   ESQUERDA (x negativo) em vez de simplesmente quebrar linha. Empilhando em
   coluna abaixo de 480px, com a ação primária (o botão mais à direita/último
   no DOM) em cima. */
@media (max-width: 480px) {
  .modal__footer { flex-direction: column-reverse; }
  .modal__footer > * { width: 100%; }
}
</style>
