<script setup lang="ts">
// T-C01 — Onboarding do candidato (wizard 4 passos, modal lg sobre o dashboard).
// Cada passo salva ao avançar (PATCH /profile, POST /cv, POST /me/saved-filters).
// Fechar no meio = progresso já salvo (o card "Complete seu perfil" no Início reflete isso).
import { VAGA_SEGMENT_LABEL, VAGA_SEGMENTS, VAGA_WORK_MODE_LABEL, type VagaWorkMode } from '~/types/vaga'

const props = defineProps<{ open: boolean, startStep?: number }>()
const emit = defineEmits<{ close: [], finished: [] }>()

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const steps = [
  { label: 'Profissão e cidade' },
  { label: 'Currículo' },
  { label: 'LinkedIn e telefone' },
  { label: 'Preferências do Radar' },
]
const current = ref(0)
const saving = ref(false)
const done = ref(false)

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  done.value = false
  current.value = props.startStep ?? 0
  // Prefill a partir do perfil já carregado.
  const u = auth.user
  profession.value = u?.profession ?? ''
  location.value = u?.location ?? ''
  linkedin.value = u?.socialLinks?.linkedin ?? ''
  phone.value = u?.phone ?? ''
})

// ── Passo 1: profissão + cidade ─────────────────────────────────────────────
const profession = ref('')
const location = ref('')
async function saveStep1() {
  saving.value = true
  try {
    await api.patch('/profile', {
      profession: profession.value.trim() || undefined,
      location: location.value.trim() || undefined,
    })
    await auth.fetchMe()
    current.value = 1
  }
  catch {
    toast.error('Não foi possível salvar. Tente novamente.')
  }
  finally {
    saving.value = false
  }
}

// ── Passo 2: upload de CV (opcional) ────────────────────────────────────────
const cvFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
function pickCv() { fileInput.value?.click() }
function onCvSelected(e: Event) {
  cvFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}
async function saveStep2(skip = false) {
  if (skip || !cvFile.value) { current.value = 2; return }
  saving.value = true
  try {
    const form = new FormData()
    form.append('file', cvFile.value)
    form.append('label', 'Currículo principal')
    await api.post('/cv', form)
    toast.success('Currículo enviado.')
    current.value = 2
  }
  catch {
    toast.error('Não foi possível enviar o currículo.')
  }
  finally {
    saving.value = false
  }
}

// ── Passo 3: LinkedIn + telefone ────────────────────────────────────────────
const linkedin = ref('')
const phone = ref('')
async function saveStep3() {
  saving.value = true
  try {
    await api.patch('/profile', {
      phone: phone.value.trim() || undefined,
      socialLinks: { ...(auth.user?.socialLinks ?? {}), linkedin: linkedin.value.trim() || undefined },
    })
    await auth.fetchMe()
    current.value = 3
  }
  catch {
    toast.error('Não foi possível salvar. Tente novamente.')
  }
  finally {
    saving.value = false
  }
}

// ── Passo 4: preferências do Radar ──────────────────────────────────────────
const segments = ref<string[]>([])
const workMode = ref<string | null>(null)
const salaryMin = ref<number | null>(null)
const segmentOptions = VAGA_SEGMENTS.map(s => ({ value: s, label: VAGA_SEGMENT_LABEL[s] }))
const workModeOptions = (Object.keys(VAGA_WORK_MODE_LABEL) as VagaWorkMode[])
  .map(m => ({ value: m, label: VAGA_WORK_MODE_LABEL[m] }))

async function finish() {
  saving.value = true
  try {
    if (segments.value.length || workMode.value || salaryMin.value != null) {
      await api.post('/me/saved-filters', {
        name: 'Meu Radar',
        filters: {
          segment: segments.value[0] ?? undefined,
          segments: segments.value,
          workMode: workMode.value ?? undefined,
          salaryMin: salaryMin.value ?? undefined,
        },
        isDefault: true,
      })
    }
    done.value = true
  }
  catch {
    toast.error('Não foi possível salvar suas preferências.')
  }
  finally {
    saving.value = false
  }
}

function goToVagas() {
  emit('finished')
  emit('close')
  navigateTo('/app/candidato/radar')
}
</script>

<template>
  <UiModal :open="props.open" title="Configure seu Radar" size="lg" @close="emit('close')">
    <div class="wizard">
      <UiStepper v-if="!done" :steps="steps" :current="current" class="wizard__stepper" />

      <!-- Passo 1 -->
      <div v-if="!done && current === 0" class="wizard__step">
        <p class="wizard__intro">Conte um pouco sobre você para personalizarmos suas vagas.</p>
        <UiInput v-model="profession" label="Profissão / cargo desejado" placeholder="Ex.: Analista Financeiro" />
        <UiInput v-model="location" label="Cidade" placeholder="Ex.: São Paulo, SP" />
        <div class="wizard__actions">
          <UiButton :loading="saving" @click="saveStep1">Continuar</UiButton>
        </div>
      </div>

      <!-- Passo 2 -->
      <div v-else-if="!done && current === 1" class="wizard__step">
        <p class="wizard__intro">Envie seu currículo em PDF (opcional — você pode fazer isso depois).</p>
        <div class="wizard__dropzone" @click="pickCv">
          <input ref="fileInput" type="file" accept="application/pdf" class="wizard__file-input" @change="onCvSelected">
          <span v-if="cvFile">{{ cvFile.name }}</span>
          <span v-else>Clique para selecionar um PDF (máx. 20MB)</span>
        </div>
        <div class="wizard__actions">
          <UiButton variant="ghost" :disabled="saving" @click="saveStep2(true)">Pular</UiButton>
          <UiButton :loading="saving" @click="saveStep2(false)">Continuar</UiButton>
        </div>
      </div>

      <!-- Passo 3 -->
      <div v-else-if="!done && current === 2" class="wizard__step">
        <p class="wizard__intro">Facilite o contato de recrutadores e hunters.</p>
        <UiInput v-model="linkedin" label="LinkedIn (opcional)" placeholder="https://linkedin.com/in/..." />
        <UiPhoneInput v-model="phone" label="Telefone (opcional)" />
        <div class="wizard__actions">
          <UiButton :loading="saving" @click="saveStep3">Continuar</UiButton>
        </div>
      </div>

      <!-- Passo 4 -->
      <div v-else-if="!done && current === 3" class="wizard__step">
        <p class="wizard__intro">Vamos priorizar as vagas certas no seu Radar.</p>
        <UiMultiSelect v-model="segments" label="Segmentos de interesse" :options="segmentOptions" placeholder="Selecionar segmentos" />
        <UiSelect v-model="workMode" label="Modelo de trabalho" :options="workModeOptions" placeholder="Qualquer modelo" />
        <UiCurrencyInput v-model="salaryMin" label="Pretensão salarial mínima" />
        <div class="wizard__actions">
          <UiButton :loading="saving" @click="finish">Concluir</UiButton>
        </div>
      </div>

      <!-- Final -->
      <div v-else class="wizard__done">
        <div class="wizard__done-icon">🎉</div>
        <h3>Pronto! Seu Radar está configurado</h3>
        <p class="wizard__intro">Já podemos te mostrar vagas relevantes para o seu perfil.</p>
        <UiButton @click="goToVagas">Ver vagas</UiButton>
      </div>
    </div>
  </UiModal>
</template>

<style scoped>
.wizard { display: flex; flex-direction: column; gap: var(--sp-6); }
.wizard__stepper { margin-bottom: var(--sp-2); }
.wizard__step { display: flex; flex-direction: column; gap: var(--sp-4); }
.wizard__intro { color: var(--ink-500); font-size: var(--text-14); margin: 0; }
.wizard__actions { display: flex; justify-content: flex-end; gap: var(--sp-3); margin-top: var(--sp-2); }
.wizard__dropzone {
  border: 2px dashed var(--ink-300); border-radius: var(--radius-card);
  padding: var(--sp-8); text-align: center; color: var(--ink-500);
  cursor: pointer; font-size: var(--text-14); transition: border-color var(--t-fast);
}
.wizard__dropzone:hover { border-color: var(--brand-600); }
.wizard__file-input { display: none; }
.wizard__done { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-3); padding: var(--sp-8) 0; }
.wizard__done-icon { font-size: 40px; }
.wizard__done h3 { font-size: var(--text-20); }
</style>
