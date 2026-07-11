<script setup lang="ts">
// T-E06 — Modal "Avalie {hunter}" (B10, RN-NOVA-07). POST /placements/:id/review.
// Imutável: uma vez criada, não há edição/exclusão — por isso o modal fecha e
// não reabre para o mesmo placement (a lista de pendentes já não o traz mais).
import { Star } from 'lucide-vue-next'

export interface PendingReviewPlacement {
  id: string
  vagaId: string | null
  vagaTitle: string | null
  confirmedAt: string
  candidateName: string | null
  hunter: { id: string, firstName: string, lastName: string, username: string | null, avatarUrl: string | null } | null
}

const props = defineProps<{ placement: PendingReviewPlacement | null }>()
const emit = defineEmits<{ close: [], saved: [] }>()

const api = useApi()
const toast = useToast()

const TAG_OPTIONS: { value: 'AGIL' | 'BONS_CANDIDATOS' | 'COMUNICACAO_CLARA', label: string }[] = [
  { value: 'AGIL', label: 'Ágil' },
  { value: 'BONS_CANDIDATOS', label: 'Bons candidatos' },
  { value: 'COMUNICACAO_CLARA', label: 'Comunicação clara' },
]

const open = computed(() => !!props.placement)
const rating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const tags = ref<string[]>([])
const saving = ref(false)

watch(() => props.placement, (p) => {
  if (!p) return
  rating.value = 0
  hoverRating.value = 0
  comment.value = ''
  tags.value = []
})

function toggleTag(t: string) {
  const i = tags.value.indexOf(t)
  if (i === -1) tags.value.push(t)
  else tags.value.splice(i, 1)
}

async function salvar() {
  if (!props.placement || rating.value < 1) return
  saving.value = true
  try {
    await api.post(`/placements/${props.placement.id}/review`, {
      rating: rating.value,
      comment: comment.value.trim() || undefined,
      tags: tags.value.length ? tags.value : undefined,
    })
    toast.success('Avaliação enviada.')
    emit('saved')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível enviar a avaliação.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="`Avalie ${placement?.hunter?.firstName ?? 'o hunter'}`" size="md" @close="emit('close')">
    <div v-if="placement" class="rev">
      <div class="rev__context">
        <UiAvatar :src="placement.hunter?.avatarUrl ?? null" :name="`${placement.hunter?.firstName ?? ''} ${placement.hunter?.lastName ?? ''}`" size="md" />
        <div>
          <span class="rev__name">{{ placement.hunter?.firstName }} {{ placement.hunter?.lastName }}</span>
          <span class="rev__meta">
            {{ placement.candidateName ?? 'Candidato' }}<template v-if="placement.vagaTitle"> · {{ placement.vagaTitle }}</template>
          </span>
        </div>
      </div>

      <div class="rev__stars">
        <button
          v-for="n in 5" :key="n" type="button" class="rev__star" aria-label="Nota"
          @click="rating = n" @mouseenter="hoverRating = n" @mouseleave="hoverRating = 0"
        >
          <Star :size="28" :fill="(hoverRating || rating) >= n ? 'var(--amber-500)' : 'none'" :color="(hoverRating || rating) >= n ? 'var(--amber-500)' : 'var(--ink-300)'" />
        </button>
      </div>

      <div class="rev__tags">
        <button
          v-for="t in TAG_OPTIONS" :key="t.value" type="button"
          class="rev__tag" :class="{ 'rev__tag--active': tags.includes(t.value) }"
          @click="toggleTag(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <textarea v-model="comment" class="rev__comment" rows="3" maxlength="1000" placeholder="Comentário (opcional)" />
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancelar</UiButton>
      <UiButton :disabled="rating < 1" :loading="saving" @click="salvar">Enviar avaliação</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.rev { display: flex; flex-direction: column; gap: var(--sp-5); }
.rev__context { display: flex; align-items: center; gap: var(--sp-3); }
.rev__name { display: block; font-weight: 600; color: var(--ink-900); font-size: var(--text-14); }
.rev__meta { display: block; font-size: var(--text-13); color: var(--ink-500); }
.rev__stars { display: flex; gap: var(--sp-1); justify-content: center; }
.rev__star { background: none; border: none; cursor: pointer; padding: var(--sp-1); line-height: 0; }
.rev__tags { display: flex; flex-wrap: wrap; gap: var(--sp-2); justify-content: center; }
.rev__tag { border: 1px solid var(--ink-300); border-radius: var(--radius-full); padding: var(--sp-1) var(--sp-3); font-size: var(--text-13); color: var(--ink-700); background: var(--white); cursor: pointer; }
.rev__tag--active { background: var(--brand-100); border-color: var(--brand-600); color: var(--brand-700); font-weight: 600; }
.rev__comment { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.rev__comment:focus { outline: none; border-color: var(--brand-600); }
</style>
