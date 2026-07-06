<script setup lang="ts">
// T-H11 — Editar perfil público de hunter (B5) + fluxo de verificação (B8).
import { VERIFICATION_STATUS_LABEL, VERIFICATION_STATUS_VARIANT } from '~/types/hunter'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Meu perfil — Hunter' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

// ── Dados de perfil (T-H11) ─────────────────────────────────────────────────
const profession = ref('')
const bio = ref('')
const location = ref('')
const hunterYearsExperience = ref<number | null>(null)
const specialties = ref<string[]>([])
const newSpecialty = ref('')
const savingProfile = ref(false)
const linkedinUrl = ref('')

// `auth.user` normalmente ainda é null quando este script roda (o `fetchMe()`
// que popula o store é disparado no `onMounted` do layout `app.vue`, um
// componente pai, e é assíncrono). Sem este watcher os campos abaixo ficariam
// vazios em qualquer navegação direta/reload — e um "Salvar perfil" sem tocar
// nada apagaria os dados reais. `immediate: true` cobre o caso raro em que o
// usuário já está populado; `initialized` evita sobrescrever edições em curso
// se o watcher disparar de novo (ex.: depois de `auth.fetchMe()` no submit).
const profileInitialized = ref(false)
watch(
  () => auth.user,
  (u) => {
    if (!u || profileInitialized.value) return
    profession.value = u.profession ?? ''
    bio.value = u.bio ?? ''
    location.value = u.location ?? ''
    hunterYearsExperience.value = u.hunterYearsExperience ?? null
    specialties.value = u.hunterSpecialties ?? []
    linkedinUrl.value = u.verificationLinkedinUrl ?? ''
    profileInitialized.value = true
  },
  { immediate: true },
)

function addSpecialty() {
  const v = newSpecialty.value.trim()
  if (!v || specialties.value.includes(v) || specialties.value.length >= 20) return
  specialties.value.push(v)
  newSpecialty.value = ''
}
function removeSpecialty(v: string) {
  specialties.value = specialties.value.filter(s => s !== v)
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await api.patch('/profile', {
      profession: profession.value || undefined,
      bio: bio.value || undefined,
      location: location.value || undefined,
      hunterYearsExperience: hunterYearsExperience.value ?? undefined,
      hunterSpecialties: specialties.value,
    })
    await auth.fetchMe()
    toast.success('Perfil atualizado.')
  }
  catch {
    toast.error('Não foi possível salvar o perfil.')
  }
  finally {
    savingProfile.value = false
  }
}

// ── Verificação (B8) ─────────────────────────────────────────────────────────
const status = computed(() => auth.user?.verificationStatus ?? 'NONE')
const docs = computed(() => auth.user?.verificationDocs ?? [])
const docLabel = ref('')
const uploading = ref(false)
const submitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const canEditVerification = computed(() => status.value === 'NONE' || status.value === 'REJECTED')

function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!docLabel.value.trim()) {
    toast.error('Informe um rótulo antes de anexar o documento (ex.: RG, comprovante de endereço).')
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('label', docLabel.value.trim())
    const res = await api.post<{ verificationDocs: typeof docs.value }>('/profile/me/verification/documents', form)
    if (auth.user) auth.user.verificationDocs = res.verificationDocs
    docLabel.value = ''
    toast.success('Documento anexado.')
  }
  catch (e2) {
    const err = e2 as { message?: string }
    toast.error(err.message || 'Não foi possível enviar o documento.')
  }
  finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function submitVerification() {
  if (!docs.value.length) {
    toast.error('Envie ao menos um documento antes de solicitar a verificação.')
    return
  }
  submitting.value = true
  try {
    await api.post('/profile/me/verification/submit', {
      linkedinUrl: linkedinUrl.value.trim() || undefined,
    })
    await auth.fetchMe()
    toast.success('Verificação solicitada! Você será avisado por e-mail quando for analisada.')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível solicitar a verificação.')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="perfil">
    <header class="perfil__header">
      <h1>Meu perfil</h1>
      <p class="text-secondary">Estas informações aparecem no seu perfil público e no diretório de hunters.</p>
    </header>

    <div class="perfil__cols">
      <section class="perfil__main">
        <UiCard class="perfil__card">
          <h2>Dados públicos</h2>
          <UiInput v-model="profession" label="Cargo / headline" placeholder="Ex.: Recrutadora especialista em Tech" />
          <label class="perfil__field">
            <span class="perfil__label">Sobre</span>
            <textarea v-model="bio" rows="4" placeholder="Conte sua experiência como recrutador(a)..." />
          </label>
          <UiInput v-model="location" label="Cidade" placeholder="Ex.: São Paulo, SP" />
          <UiInput
            :model-value="hunterYearsExperience != null ? String(hunterYearsExperience) : ''"
            label="Anos de experiência"
            type="number"
            @update:model-value="hunterYearsExperience = $event ? Number($event) : null"
          />

          <div class="perfil__field">
            <span class="perfil__label">Especialidades</span>
            <div class="perfil__chips">
              <UiBadge v-for="s in specialties" :key="s" variant="outline">
                {{ s }}
                <button type="button" class="perfil__chip-remove" @click="removeSpecialty(s)">✕</button>
              </UiBadge>
            </div>
            <div class="perfil__chip-add">
              <UiInput v-model="newSpecialty" placeholder="Ex.: Tecnologia, Vendas..." @keyup.enter="addSpecialty" />
              <UiButton variant="secondary" size="sm" @click="addSpecialty">Adicionar</UiButton>
            </div>
          </div>

          <UiButton :loading="savingProfile" @click="saveProfile">Salvar perfil</UiButton>
        </UiCard>
      </section>

      <aside class="perfil__side">
        <UiCard class="perfil__card">
          <h2>Verificação</h2>
          <UiBadge :variant="VERIFICATION_STATUS_VARIANT[status]">{{ VERIFICATION_STATUS_LABEL[status] }}</UiBadge>

          <p v-if="status === 'APPROVED'" class="perfil__hint">
            Seu perfil está verificado — o selo "Verificado" aparece no diretório e você pode trabalhar vagas com fee.
          </p>
          <p v-else-if="status === 'PENDING'" class="perfil__hint">
            Seus documentos estão em análise. Você será avisado por e-mail assim que houver uma decisão.
          </p>
          <template v-else>
            <p v-if="status === 'REJECTED' && auth.user?.verificationRejectionReason" class="perfil__rejection">
              <strong>Motivo da recusa:</strong> {{ auth.user.verificationRejectionReason }}
            </p>
            <p class="perfil__hint">
              Envie um documento (RG, CNH ou comprovante) e, opcionalmente, seu LinkedIn, para liberar o selo "Verificado"
              e trabalhar vagas com fee no marketplace.
            </p>

            <ul v-if="docs.length" class="perfil__docs">
              <li v-for="d in docs" :key="d.url">📄 {{ d.label }}</li>
            </ul>

            <div v-if="canEditVerification" class="perfil__upload">
              <UiInput v-model="docLabel" placeholder="Rótulo do documento (ex.: RG)" />
              <input ref="fileInput" type="file" accept="application/pdf" class="perfil__file-input" @change="onFileSelected">
              <UiButton variant="secondary" size="sm" :loading="uploading" @click="pickFile">Anexar PDF</UiButton>

              <UiInput v-model="linkedinUrl" label="LinkedIn (opcional)" placeholder="https://linkedin.com/in/..." />

              <UiButton :loading="submitting" :disabled="!docs.length" @click="submitVerification">
                Solicitar verificação
              </UiButton>
            </div>
          </template>
        </UiCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.perfil__header { margin-bottom: var(--sp-6); }
.perfil__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-1); }
.perfil__cols { display: grid; grid-template-columns: 1fr 360px; gap: var(--sp-6); align-items: start; }
.perfil__card { display: flex; flex-direction: column; gap: var(--sp-4); }
.perfil__card h2 { font-size: var(--text-16); }
.perfil__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.perfil__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.perfil__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.perfil__chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.perfil__chip-remove { background: none; border: none; cursor: pointer; margin-left: 4px; color: inherit; }
.perfil__chip-add { display: flex; gap: var(--sp-2); align-items: flex-end; }
.perfil__chip-add :deep(.field) { flex: 1; }
.perfil__hint { font-size: var(--text-13); color: var(--ink-500); }
.perfil__rejection { font-size: var(--text-13); color: var(--red-500); background: var(--red-100); border-radius: var(--radius-input); padding: var(--sp-3); }
.perfil__docs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-1); font-size: var(--text-13); color: var(--ink-700); }
.perfil__upload { display: flex; flex-direction: column; gap: var(--sp-3); border-top: 1px solid var(--ink-100); padding-top: var(--sp-3); }
.perfil__file-input { display: none; }
@media (max-width: 900px) {
  .perfil__cols { grid-template-columns: 1fr; }
}
</style>
