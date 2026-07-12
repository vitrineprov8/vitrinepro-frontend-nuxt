<script setup lang="ts">
// ReportDepartureModal (P4 — design-spec/06 §P): "Candidato saiu" dentro do
// prazo de garantia. Backend só implementa reposição gratuita (via
// replacesPlacementId em markHired) — estorno proporcional não existe ainda
// (gap conhecido, ver CLAUDE.md), então não é oferecido aqui.
const props = defineProps<{ open: boolean, placementId: string | null, candidateName?: string }>()
const emit = defineEmits<{ close: [], reported: [] }>()

const api = useApi()
const toast = useToast()

const departureDate = ref<string | null>(null)
const reasonCategory = ref<string | null>(null)
const detalhes = ref('')
const saving = ref(false)

const reasonOptions = [
  { value: 'Pediu demissão', label: 'Candidato pediu demissão' },
  { value: 'Demitido pela empresa', label: 'Demitido pela empresa' },
  { value: 'Não se adaptou à cultura', label: 'Não se adaptou à cultura' },
  { value: 'Performance abaixo do esperado', label: 'Performance abaixo do esperado' },
  { value: 'Outro motivo', label: 'Outro motivo' },
]

watch(() => props.open, (o) => {
  if (!o) return
  departureDate.value = null
  reasonCategory.value = null
  detalhes.value = ''
})

const reason = computed(() => {
  if (!reasonCategory.value) return ''
  return detalhes.value.trim() ? `${reasonCategory.value}: ${detalhes.value.trim()}` : reasonCategory.value
})

const canSubmit = computed(() => !!reasonCategory.value)

async function reportar() {
  if (!props.placementId || !canSubmit.value) return
  saving.value = true
  try {
    await api.post(`/placements/${props.placementId}/departure`, {
      departureDate: departureDate.value ?? undefined,
      reason: reason.value.slice(0, 255),
    })
    toast.success('Saída registrada. O hunter foi notificado e pode indicar um substituto.')
    emit('reported')
    emit('close')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível registrar a saída.')
  }
  finally { saving.value = false }
}
</script>

<template>
  <UiModal :open="open" title="Candidato saiu" size="md" @close="emit('close')">
    <div class="rd">
      <p class="rd__intro">
        Registrar a saída de <strong>{{ candidateName ?? 'candidato' }}</strong> dentro do prazo de garantia quebra o
        placement. O hunter será notificado e poderá indicar um substituto sem custo adicional.
      </p>

      <UiDatepicker v-model="departureDate" label="Data de saída" helper="Deixe em branco para usar a data de hoje." />
      <UiSelect v-model="reasonCategory" :options="reasonOptions" label="Motivo" required />
      <div class="field">
        <label class="field__label">Detalhes (opcional)</label>
        <textarea v-model="detalhes" class="rd__textarea" rows="3" placeholder="Mais contexto sobre a saída..." />
      </div>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Cancelar</UiButton>
      <UiButton variant="danger" :loading="saving" :disabled="!canSubmit" @click="reportar">Confirmar saída</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.rd { display: flex; flex-direction: column; gap: var(--sp-4); }
.rd__intro { font-size: var(--text-13); color: var(--ink-700); line-height: 1.5; margin: 0; }
.rd__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.rd__textarea:focus { outline: none; border-color: var(--brand-600); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
</style>
