<script setup lang="ts">
// T-H08 — Submeter candidato a uma vaga (o clique mais importante do produto).
// Stepper 3 passos. Contrato: POST /vagas/:id/submissions { hunterCandidateId, message } (B3).
import type { HunterCandidate } from '~/types/hunterCandidate'
import { CONSENT_LABEL } from '~/types/hunterCandidate'
import type { PaginatedResult, Vaga } from '~/types/vaga'
import type { SelectOption } from '~/components/ui/Select.vue'

const props = defineProps<{ candidate: HunterCandidate | null }>()
const emit = defineEmits<{ close: [], submitted: [], 'request-consent': [HunterCandidate] }>()

const api = useApi()

const open = computed(() => !!props.candidate)
const steps = [
  { label: 'Vaga' },
  { label: 'Apresentação' },
  { label: 'Revisão' },
]
const current = ref(0)

const vagas = ref<Vaga[]>([])
const loadingVagas = ref(false)
const vagaId = ref<string | null>(null)
const message = ref('')
const submitting = ref(false)
const submitError = ref('')

const vagaOptions = computed<SelectOption[]>(() =>
  vagas.value.map(v => ({ value: v.id, label: v.title })))
const selectedVaga = computed(() => vagas.value.find(v => v.id === vagaId.value) ?? null)
const consentOk = computed(() => props.candidate?.consentStatus === 'GRANTED')

watch(() => props.candidate, async (c) => {
  if (!c) return
  current.value = 0
  vagaId.value = null
  message.value = ''
  submitError.value = ''
  loadingVagas.value = true
  try {
    const r = await api.get<PaginatedResult<Vaga>>('/vagas/me', { status: 'PUBLISHED', limit: 100 })
    vagas.value = r?.data ?? []
  }
  catch {
    vagas.value = []
  }
  finally {
    loadingVagas.value = false
  }
})

function next() {
  if (current.value === 0 && !vagaId.value) return
  if (current.value < 2) current.value++
}
function back() {
  if (current.value > 0) current.value--
}

async function submit() {
  if (!props.candidate || !vagaId.value || !consentOk.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await api.post(`/vagas/${vagaId.value}/submissions`, {
      hunterCandidateId: props.candidate.id,
      message: message.value.trim() || undefined,
    })
    emit('submitted')
  }
  catch (e) {
    const err = e as { status?: number, message?: string }
    if (err.status === 409) submitError.value = 'Este candidato já foi indicado a esta vaga (trava de 90 dias — RN-NOVA-02). Tente outra vaga.'
    else if (err.status === 403) submitError.value = 'Esta vaga não aceita submissões de hunters.'
    else submitError.value = err.message || 'Não foi possível submeter. Tente novamente.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiModal :open="open" title="Submeter candidato" size="lg" @close="emit('close')">
    <div v-if="candidate" class="submit">
      <UiStepper :steps="steps" :current="current" class="submit__stepper" />

      <!-- Passo 1: Vaga -->
      <section v-show="current === 0" class="submit__step">
        <p class="submit__lead">Escolha a vaga para <strong>{{ candidate.fullName }}</strong>.</p>
        <p v-if="loadingVagas" class="submit__muted">Carregando vagas…</p>
        <UiSelect
          v-else
          v-model="vagaId"
          label="Vaga"
          :options="vagaOptions"
          placeholder="Selecione uma vaga"
        />
        <p v-if="!loadingVagas && !vagaOptions.length" class="submit__muted">
          Você não tem vagas publicadas. Publique uma vaga ou pegue uma no marketplace.
        </p>
        <p class="submit__hint">Até 5 candidatos por vaga.</p>
      </section>

      <!-- Passo 2: Apresentação -->
      <section v-show="current === 1" class="submit__step">
        <label class="field">
          <span class="field__label">Nota de apresentação</span>
          <textarea v-model="message" rows="4" placeholder="Por que este candidato é o match? (a empresa lê isto)" />
        </label>
      </section>

      <!-- Passo 3: Revisão & consentimento -->
      <section v-show="current === 2" class="submit__step">
        <div class="review">
          <div class="review__row"><span>Candidato</span><strong>{{ candidate.fullName }}</strong></div>
          <div class="review__row"><span>Vaga</span><strong>{{ selectedVaga?.title || '—' }}</strong></div>
          <div class="review__row"><span>Apresentação</span><strong>{{ message.trim() || '—' }}</strong></div>
        </div>

        <div v-if="consentOk" class="consent consent--ok">✓ Consentimento LGPD do candidato: autorizado.</div>
        <div v-else class="consent consent--pending">
          <p>⚠️ Consentimento LGPD: <strong>{{ CONSENT_LABEL[candidate.consentStatus] }}</strong>. É preciso a autorização do candidato antes de submeter.</p>
          <UiButton variant="secondary" size="sm" @click="emit('request-consent', candidate)">Enviar pedido de autorização</UiButton>
        </div>

        <p class="exclusivity">Se outro hunter já indicou este candidato a esta vaga, a indicação dele prevalece (RN-NOVA-02).</p>
        <p v-if="submitError" class="submit__error">{{ submitError }}</p>
      </section>
    </div>

    <template #footer>
      <UiButton v-if="current > 0" variant="ghost" @click="back">Voltar</UiButton>
      <UiButton v-if="current < 2" :disabled="current === 0 && !vagaId" @click="next">Continuar</UiButton>
      <UiButton v-else :disabled="!consentOk" :loading="submitting" @click="submit">Submeter candidato</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.submit { display: flex; flex-direction: column; gap: var(--sp-5); }
.submit__stepper { margin-bottom: var(--sp-2); }
.submit__step { display: flex; flex-direction: column; gap: var(--sp-3); min-height: 160px; }
.submit__lead { font-size: var(--text-14); }
.submit__muted { font-size: var(--text-13); color: var(--ink-500); }
.submit__hint { font-size: var(--text-12); color: var(--ink-500); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-700); font-weight: 500; }
.field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.field textarea:focus { outline: 2px solid var(--brand-200); border-color: var(--brand-600); }
.review { border: 1px solid var(--ink-100); border-radius: var(--radius-card, var(--radius-input)); padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
.review__row { display: flex; justify-content: space-between; gap: var(--sp-4); font-size: var(--text-14); }
.review__row span { color: var(--ink-500); }
.review__row strong { text-align: right; }
.consent { border-radius: var(--radius-input); padding: var(--sp-3); font-size: var(--text-13); display: flex; flex-direction: column; gap: var(--sp-2); }
.consent--ok { background: var(--green-50, var(--ink-100)); color: var(--green-700, var(--ink-700)); }
.consent--pending { background: var(--amber-50, var(--ink-100)); }
.exclusivity { font-size: var(--text-12); color: var(--ink-500); }
.submit__error { color: var(--red-500); font-size: var(--text-13); }
</style>
