<script setup lang="ts">
// T-H08 — Adicionar candidato ao pool. v1: só "Cadastrar novo" (fantasma).
// A aba "Buscar na VitrinePro" depende de notificações (B13) — em breve.
import type { HunterCandidate } from '~/types/hunterCandidate'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], added: [HunterCandidate] }>()

const api = useApi()
const toast = useToast()

const tab = ref<'novo' | 'buscar'>('novo')
const saving = ref(false)
const form = reactive({
  fullName: '', email: '', phone: '', location: '', headline: '', linkedinUrl: '', cvUrl: '', notes: '',
})
const error = ref('')

watch(() => props.open, (o) => {
  if (o) {
    tab.value = 'novo'
    error.value = ''
    Object.assign(form, { fullName: '', email: '', phone: '', location: '', headline: '', linkedinUrl: '', cvUrl: '', notes: '' })
  }
})

const canSave = computed(() => form.fullName.trim() && /.+@.+\..+/.test(form.email))

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const created = await api.post<HunterCandidate>('/hunter-candidates', {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      location: form.location.trim() || undefined,
      headline: form.headline.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      cvUrl: form.cvUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
    toast.success('Candidato adicionado ao seu banco.')
    emit('added', created)
  }
  catch (e) {
    const err = e as { status?: number, message?: string }
    error.value = err.status === 409
      ? 'Você já tem um candidato com este e-mail.'
      : (err.message || 'Não foi possível salvar.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" title="Adicionar candidato" size="md" @close="emit('close')">
    <div class="tabs">
      <button :class="{ active: tab === 'novo' }" @click="tab = 'novo'">Cadastrar novo</button>
      <button :class="{ active: tab === 'buscar' }" @click="tab = 'buscar'">Buscar na VitrinePro</button>
    </div>

    <form v-if="tab === 'novo'" class="form" @submit.prevent="save">
      <UiInput v-model="form.fullName" label="Nome completo" required placeholder="Ex.: Ana Souza" />
      <UiInput v-model="form.email" label="E-mail" type="email" required placeholder="ana@email.com" />
      <div class="form__row">
        <UiInput v-model="form.phone" label="Telefone" type="tel" placeholder="(11) 90000-0000" />
        <UiInput v-model="form.location" label="Cidade" placeholder="São Paulo, SP" />
      </div>
      <UiInput v-model="form.headline" label="Cargo / headline" placeholder="Desenvolvedora Full-stack" />
      <UiInput v-model="form.linkedinUrl" label="LinkedIn (URL)" type="url" placeholder="https://linkedin.com/in/..." />
      <UiInput v-model="form.cvUrl" label="Link do CV (opcional)" type="url" placeholder="https://..." />
      <label class="field">
        <span class="field__label">Notas privadas</span>
        <textarea v-model="form.notes" rows="2" placeholder="Visível só para você" />
      </label>

      <p class="lgpd">🔒 Ao salvar, enviaremos um e-mail pedindo autorização (LGPD) do candidato. O status ficará <strong>Pendente</strong> até ele autorizar.</p>
      <p v-if="error" class="form__error">{{ error }}</p>
    </form>

    <div v-else class="soon">
      <p>A busca de usuários VitrinePro para adicionar ao seu banco chega em breve.</p>
      <p class="soon__hint">Por enquanto, use “Cadastrar novo”.</p>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancelar</UiButton>
      <UiButton v-if="tab === 'novo'" :disabled="!canSave" :loading="saving" @click="save">Salvar candidato</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.tabs { display: flex; gap: var(--sp-1); border-bottom: 1px solid var(--ink-100); margin-bottom: var(--sp-4); }
.tabs button { background: none; border: none; padding: var(--sp-2) var(--sp-3); font-size: var(--text-14); color: var(--ink-500); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs button.active { color: var(--brand-700); border-bottom-color: var(--brand-600); font-weight: 600; }
.form { display: flex; flex-direction: column; gap: var(--sp-3); }
.form__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-700); font-weight: 500; }
.field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.field textarea:focus { outline: 2px solid var(--brand-200); border-color: var(--brand-600); }
.lgpd { font-size: var(--text-12); color: var(--ink-500); background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); }
.form__error { color: var(--red-500); font-size: var(--text-13); }
.soon { text-align: center; padding: var(--sp-6) var(--sp-4); color: var(--ink-500); }
.soon__hint { font-size: var(--text-13); margin-top: var(--sp-2); }
@media (max-width: 560px) { .form__row { grid-template-columns: 1fr; } }
</style>
