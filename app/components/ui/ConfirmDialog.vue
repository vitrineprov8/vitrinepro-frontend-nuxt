<script setup lang="ts">
// UiConfirmDialog — design-spec/00 §3.6 (confirmação de ações sensíveis: publicar vaga, remover, etc.)
import { AlertTriangle, Info } from 'lucide-vue-next'
import Modal from './Modal.vue'
import Button from './Button.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** danger = ação destrutiva (botão vermelho); default = ação normal (botão primário) */
  variant?: 'default' | 'danger'
  loading?: boolean
}>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'default',
})

const emit = defineEmits<{ confirm: [], cancel: [], close: [] }>()
</script>

<template>
  <Modal :open="props.open" size="sm" @close="emit('close')">
    <template #header>
      <div class="confirm__header">
        <div class="confirm__icon" :class="`confirm__icon--${props.variant}`">
          <component :is="props.variant === 'danger' ? AlertTriangle : Info" :size="20" />
        </div>
        <h4>{{ props.title }}</h4>
      </div>
    </template>
    <p v-if="props.description" class="confirm__description">{{ props.description }}</p>
    <template #footer>
      <Button variant="ghost" :disabled="props.loading" @click="emit('cancel'); emit('close')">
        {{ props.cancelLabel }}
      </Button>
      <Button :variant="props.variant === 'danger' ? 'danger' : 'primary'" :loading="props.loading" @click="emit('confirm')">
        {{ props.confirmLabel }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.confirm__header { display: flex; align-items: center; gap: var(--sp-3); }
.confirm__icon {
  width: 36px; height: 36px; border-radius: var(--radius-full);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.confirm__icon--default { background: var(--blue-100); color: var(--blue-500); }
.confirm__icon--danger { background: var(--red-100); color: var(--red-500); }
.confirm__description { color: var(--ink-500); font-size: var(--text-14); }
</style>
