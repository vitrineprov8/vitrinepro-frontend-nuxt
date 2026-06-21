<script setup lang="ts">
// Modal Candidatura (T06) — POST /vagas/:slug/apply. Dados pré-preenchidos do perfil.
import type { CV } from '~/types/vaga'

const props = defineProps<{ open: boolean, vagaSlug: string, vagaTitle: string }>()
const emit = defineEmits<{ close: [], applied: [] }>()

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const cvId = ref<string | null>(null)
const message = ref('')

const cvs = ref<CV[]>([])
const cvOptions = computed(() => cvs.value.map(c => ({ value: c.id, label: c.label || 'Currículo' })))

const loading = ref(false)
const formError = ref('')

// Prefill + carga de CVs ao abrir.
watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  formError.value = ''
  const u = auth.user
  fullName.value = u ? `${u.firstName} ${u.lastName}`.trim() : ''
  email.value = u?.email ?? ''
  try {
    cvs.value = await api.get<CV[]>('/cv')
    if (cvs.value.length === 1) cvId.value = cvs.value[0]!.id
  }
  catch {
    cvs.value = []
  }
})

const dirty = computed(() => !!(phone.value || message.value || cvId.value))

async function submit() {
  formError.value = ''
  if (!fullName.value.trim() || !email.value.trim()) {
    formError.value = 'Preencha nome e e-mail.'
    return
  }
  loading.value = true
  try {
    await api.post(`/vagas/${props.vagaSlug}/apply`, {
      fullName: fullName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim() || undefined,
      cvId: cvId.value ?? undefined,
      message: message.value.trim() || undefined,
    })
    toast.success('Candidatura enviada com sucesso!')
    emit('applied')
    emit('close')
  }
  catch (e) {
    const err = e as { status?: number, message?: string }
    if (err.status === 409) {
      toast.info('Você já se candidatou a esta vaga.')
      emit('applied')
      emit('close')
    }
    else if (err.status === 400) {
      formError.value = err.message || 'O prazo desta vaga já encerrou.'
    }
    else if (err.status === 403) {
      formError.value = err.message || 'Contas empresariais não podem se candidatar.'
    }
    else if (!err.status) {
      formError.value = 'Falha de conexão. Tente novamente.'
    }
    else {
      formError.value = 'Não foi possível enviar a candidatura. Tente novamente.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="`Candidatar-se: ${vagaTitle}`" size="md" :dirty="dirty" @close="emit('close')">
    <form class="apply" @submit.prevent="submit">
      <div v-if="formError" class="apply__alert" role="alert">{{ formError }}</div>

      <div class="apply__row">
        <UiInput v-model="fullName" label="Nome completo" required autocomplete="name" />
        <UiInput v-model="email" label="E-mail" type="email" required autocomplete="email" />
      </div>
      <UiInput v-model="phone" label="Telefone (opcional)" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" />

      <UiSelect
        v-if="cvOptions.length"
        v-model="cvId" label="Currículo" :options="cvOptions" placeholder="Selecionar currículo (opcional)"
      />
      <p v-else class="apply__hint">
        Você ainda não tem currículos cadastrados. Pode se candidatar mesmo assim e anexar depois no seu perfil.
      </p>

      <div class="apply__field">
        <label for="apply-msg" class="apply__label">Mensagem (opcional)</label>
        <textarea
          id="apply-msg" v-model="message" class="apply__textarea" rows="4"
          maxlength="2000" placeholder="Conte por que você é um bom fit para a vaga..."
        />
      </div>

      <p class="apply__notice">🔒 Seus dados serão congelados nesta candidatura no momento do envio.</p>

      <div class="apply__actions">
        <UiButton type="button" variant="ghost" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :loading="loading">Enviar candidatura</UiButton>
      </div>
    </form>
  </UiModal>
</template>

<style scoped>
.apply { display: flex; flex-direction: column; gap: var(--sp-4); }
.apply__row { display: flex; gap: var(--sp-3); }
.apply__row > * { flex: 1; }
.apply__alert {
  padding: var(--sp-3) var(--sp-4); background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); font-size: var(--text-14);
}
.apply__hint { font-size: var(--text-13); color: var(--ink-500); margin: 0; }
.apply__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.apply__label { font-size: var(--text-14); font-weight: 500; color: var(--ink-700); }
.apply__textarea {
  width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14);
  resize: vertical; min-height: 88px;
}
.apply__textarea:focus { outline: none; border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-100); }
.apply__notice { font-size: var(--text-12); color: var(--ink-500); margin: 0; }
.apply__actions { display: flex; justify-content: flex-end; gap: var(--sp-3); }
@media (max-width: 640px) { .apply__row { flex-direction: column; gap: var(--sp-4); } }
</style>
