<script setup lang="ts">
// T-H06 — Modal Configurar Etapas. PATCH /me/pipeline-template (1 template por hunter).
export interface PipelineStage { id: string, label: string, color?: string, order: number, isRejected?: boolean }

const props = defineProps<{ open: boolean, stages: PipelineStage[] }>()
const emit = defineEmits<{ close: [], saved: [PipelineStage[]] }>()

const api = useApi()
const toast = useToast()

const SWATCHES = ['#0E9F6E', '#3F83F8', '#F59E0B', '#7E3AF2', '#E02424', '#475569', '#0EA5E9', '#D946EF']

// Cópia editável (sem a etapa "rejected", que é fixa).
const editable = ref<PipelineStage[]>([])
const rejected = ref<PipelineStage | null>(null)
const saving = ref(false)

watch(() => props.open, (o) => {
  if (!o) return
  const sorted = [...props.stages].sort((a, b) => a.order - b.order)
  editable.value = sorted.filter(s => !s.isRejected).map(s => ({ ...s }))
  rejected.value = sorted.find(s => s.isRejected) ?? { id: 'rejected', label: 'Rejeitados', order: 99, isRejected: true }
})

function addStage() {
  editable.value.push({ id: `etapa_${Date.now()}`, label: 'Nova etapa', order: editable.value.length })
}
function removeStage(i: number) { editable.value.splice(i, 1) }
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= editable.value.length) return
  const arr = editable.value
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}
function setColor(i: number, c: string) { editable.value[i]!.color = c }

async function salvar() {
  if (editable.value.some(s => !s.label.trim())) { toast.error('Todas as etapas precisam de nome.'); return }
  saving.value = true
  const payload = editable.value.map((s, idx) => ({ ...s, label: s.label.trim(), order: idx }))
  try {
    const updated = await api.patch<{ stages: PipelineStage[] }>('/me/pipeline-template', { stages: payload })
    toast.success('Etapas atualizadas.')
    emit('saved', updated.stages)
    emit('close')
  }
  catch {
    toast.error('Não foi possível salvar as etapas.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" title="Configurar etapas" size="lg" @close="emit('close')">
    <p class="stages__hint">Estas etapas valem para todas as suas vagas.</p>

    <ul class="stages__list">
      <li v-for="(s, i) in editable" :key="s.id" class="stages__item">
        <div class="stages__order">
          <button aria-label="Subir" :disabled="i === 0" @click="move(i, -1)">▲</button>
          <button aria-label="Descer" :disabled="i === editable.length - 1" @click="move(i, 1)">▼</button>
        </div>
        <span class="stages__dot" :style="{ background: s.color || 'var(--ink-300)' }" />
        <input v-model="s.label" class="stages__input" placeholder="Nome da etapa">
        <div class="stages__swatches">
          <button
            v-for="c in SWATCHES" :key="c" class="stages__swatch"
            :class="{ 'is-on': s.color === c }" :style="{ background: c }"
            :aria-label="`Cor ${c}`" @click="setColor(i, c)"
          />
        </div>
        <button class="stages__remove" aria-label="Remover" @click="removeStage(i)">✕</button>
      </li>
    </ul>

    <button class="stages__add" @click="addStage">＋ Adicionar etapa</button>

    <div v-if="rejected" class="stages__rejected">
      <span class="stages__dot" :style="{ background: 'var(--red-500)' }" />
      <span>{{ rejected.label }}</span>
      <span class="stages__locked">🔒 fixa</span>
    </div>

    <template #footer>
      <div class="stages__footer">
        <UiButton variant="ghost" @click="emit('close')">Cancelar</UiButton>
        <UiButton :loading="saving" @click="salvar">Salvar</UiButton>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
.stages__hint { color: var(--ink-500); font-size: var(--text-13); margin-bottom: var(--sp-4); }
.stages__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.stages__item { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2); border: 1px solid var(--ink-100); border-radius: var(--radius-input); }
.stages__order { display: flex; flex-direction: column; }
.stages__order button { background: none; border: none; cursor: pointer; color: var(--ink-500); font-size: 10px; line-height: 1.2; }
.stages__order button:disabled { opacity: 0.3; cursor: default; }
.stages__dot { width: 12px; height: 12px; border-radius: var(--radius-full); flex-shrink: 0; }
.stages__input { flex: 1; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2); font-size: var(--text-14); }
.stages__input:focus { outline: none; border-color: var(--brand-600); }
.stages__swatches { display: flex; gap: 4px; }
.stages__swatch { width: 18px; height: 18px; border-radius: var(--radius-full); border: 2px solid transparent; cursor: pointer; }
.stages__swatch.is-on { border-color: var(--ink-900); }
.stages__remove { background: none; border: none; color: var(--ink-500); cursor: pointer; font-size: var(--text-14); }
.stages__remove:hover { color: var(--red-500); }
.stages__add { margin-top: var(--sp-3); background: none; border: 1px dashed var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-4); font-size: var(--text-14); color: var(--ink-700); cursor: pointer; width: 100%; }
.stages__rejected { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-4); padding: var(--sp-3); background: var(--ink-100); border-radius: var(--radius-input); font-size: var(--text-14); color: var(--ink-700); }
.stages__locked { margin-left: auto; font-size: var(--text-12); color: var(--ink-500); }
.stages__footer { display: flex; justify-content: flex-end; gap: var(--sp-3); }
</style>
