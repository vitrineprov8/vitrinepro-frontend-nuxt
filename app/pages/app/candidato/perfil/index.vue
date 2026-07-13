<script setup lang="ts">
// T-C06 — Meu Perfil (hub): Dados pessoais · Sobre · Redes sociais · Visibilidade.
// Autosave (debounce 800ms) via PATCH /profile, mesmo padrão de hunter/perfil.vue.
definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Meu Perfil — Candidato' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const section = ref<'dados' | 'sobre' | 'redes' | 'visibilidade'>('dados')
const sections = [
  { value: 'dados', label: 'Dados pessoais' },
  { value: 'sobre', label: 'Sobre' },
  { value: 'redes', label: 'Redes sociais' },
  { value: 'visibilidade', label: 'Visibilidade' },
]

// ── Prefill (auth.user popula assíncrono — ver CLAUDE.md, mesmo padrão do hunter) ──
const initialized = ref(false)
const profession = ref('')
const phone = ref('')
const location = ref('')
const website = ref('')
const bio = ref('')
const socialLinks = ref<Record<string, string>>({})
const isVisible = ref(true)

watch(() => auth.user, (u) => {
  if (!u || initialized.value) return
  profession.value = u.profession ?? ''
  phone.value = u.phone ?? ''
  location.value = u.location ?? ''
  website.value = u.website ?? ''
  bio.value = u.bio ?? ''
  socialLinks.value = { ...(u.socialLinks ?? {}) }
  isVisible.value = u.isVisible ?? true
  initialized.value = true
}, { immediate: true })

const saving = ref(false)
const savedRecently = ref(false)
async function autosave(payload: Record<string, unknown>) {
  if (!initialized.value) return
  saving.value = true
  try {
    await api.patch('/profile', payload)
    await auth.fetchMe()
    savedRecently.value = true
    setTimeout(() => { savedRecently.value = false }, 2000)
  }
  catch {
    toast.error('Não foi possível salvar. Tente novamente.')
  }
  finally {
    saving.value = false
  }
}

watchDebounced([profession, phone, location, website], () => {
  autosave({
    profession: profession.value.trim() || undefined,
    phone: phone.value.trim() || undefined,
    location: location.value.trim() || undefined,
    website: website.value.trim() || undefined,
  })
}, { debounce: 800 })

watchDebounced(bio, () => {
  autosave({ bio: bio.value.trim() || undefined })
}, { debounce: 800 })

const socialNetworks = [
  { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/' },
  { key: 'github', label: 'GitHub', prefix: 'github.com/' },
  { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/' },
  { key: 'twitter', label: 'Twitter / X', prefix: 'x.com/' },
  { key: 'facebook', label: 'Facebook', prefix: 'facebook.com/' },
  { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/' },
  { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/' },
]
watchDebounced(socialLinks, () => {
  autosave({ socialLinks: { ...socialLinks.value } })
}, { debounce: 800, deep: true })

async function toggleVisible(v: boolean) {
  isVisible.value = v
  await autosave({ isVisible: v })
}

// ── Avatar ───────────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
function pickAvatar() { fileInput.value?.click() }
async function onAvatarSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post('/profile/avatar', form)
    await auth.fetchMe()
    toast.success('Foto atualizada.')
  }
  catch {
    toast.error('Não foi possível enviar a imagem.')
  }
  finally {
    uploadingAvatar.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ── Preview / copiar link ────────────────────────────────────────────────────
const { copy, copied } = useClipboard()
const publicUrl = computed(() => {
  const config = useRuntimeConfig()
  return auth.user?.username ? `${config.public.frontendUrl}/perfil/${auth.user.username}` : ''
})
</script>

<template>
  <div class="perfil">
    <h1>Meu Perfil</h1>
    <CandidatoPerfilSubnav />

    <div class="perfil__layout">
      <nav class="perfil__nav">
        <button
          v-for="s in sections" :key="s.value" class="perfil__nav-item"
          :class="{ 'perfil__nav-item--active': section === s.value }"
          @click="section = s.value as typeof section"
        >
          {{ s.label }}
        </button>
      </nav>

      <div class="perfil__content">
        <div class="perfil__autosave" v-if="saving || savedRecently">
          {{ saving ? 'Salvando...' : 'Salvo ✓' }}
        </div>

        <!-- Dados pessoais -->
        <UiCard v-if="section === 'dados'" class="perfil__card">
          <div class="perfil__avatar-row">
            <UiAvatar :src="auth.user?.avatarUrl" :name="`${auth.user?.firstName} ${auth.user?.lastName}`" size="xl" />
            <div>
              <input ref="fileInput" type="file" accept="image/*" class="perfil__file-input" @change="onAvatarSelected">
              <UiButton variant="secondary" size="sm" :loading="uploadingAvatar" @click="pickAvatar">Alterar foto</UiButton>
            </div>
          </div>
          <p class="perfil__name">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
          <UiInput v-model="profession" label="Profissão / cargo desejado" placeholder="Ex.: Analista Financeiro" />
          <UiPhoneInput v-model="phone" label="Telefone" />
          <UiInput v-model="location" label="Cidade" placeholder="Ex.: São Paulo, SP" />
          <UiInput v-model="website" label="Site pessoal" placeholder="https://..." />
        </UiCard>

        <!-- Sobre -->
        <UiCard v-else-if="section === 'sobre'" class="perfil__card">
          <h2>Sobre</h2>
          <label class="perfil__field">
            <span class="perfil__label">Conte sua trajetória, principais conquistas e o que procura</span>
            <textarea v-model="bio" rows="8" placeholder="Escreva sobre você..." />
          </label>
        </UiCard>

        <!-- Redes sociais -->
        <UiCard v-else-if="section === 'redes'" class="perfil__card">
          <h2>Redes sociais</h2>
          <UiInput
            v-for="net in socialNetworks" :key="net.key"
            v-model="socialLinks[net.key]" :label="net.label" :placeholder="`https://${net.prefix}usuario`"
          />
        </UiCard>

        <!-- Visibilidade -->
        <UiCard v-else class="perfil__card">
          <h2>Visibilidade</h2>
          <label class="perfil__toggle">
            <input type="checkbox" :checked="isVisible" @change="toggleVisible(($event.target as HTMLInputElement).checked)">
            <span>Perfil público</span>
          </label>
          <p v-if="!isVisible" class="perfil__warning">
            Com o perfil privado, sua página pública retorna 404 — recrutadores e hunters não conseguirão acessá-la.
          </p>
          <div v-if="auth.user?.username" class="perfil__preview">
            <UiInput :model-value="publicUrl" disabled />
            <UiButton variant="secondary" size="sm" @click="copy(publicUrl)">{{ copied ? 'Copiado!' : 'Copiar link' }}</UiButton>
            <UiButton variant="ghost" size="sm" @click="navigateTo(`/perfil/${auth.user.username}`, { open: { target: '_blank' } })">
              Ver como visitante
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perfil h1 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.perfil__layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--sp-6); align-items: start; }
.perfil__nav { display: flex; flex-direction: column; gap: var(--sp-1); }
.perfil__nav-item {
  text-align: left; padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-input);
  border: none; background: none; color: var(--ink-500); font-size: var(--text-14); cursor: pointer;
}
.perfil__nav-item:hover { background: var(--ink-100); }
.perfil__nav-item--active { background: var(--brand-100); color: var(--brand-700); font-weight: 600; }
.perfil__card { display: flex; flex-direction: column; gap: var(--sp-4); position: relative; }
.perfil__card h2 { font-size: var(--text-16); }
.perfil__autosave { position: absolute; top: -28px; right: 0; font-size: var(--text-12); color: var(--ink-500); }
.perfil__avatar-row { display: flex; align-items: center; gap: var(--sp-4); }
.perfil__file-input { display: none; }
.perfil__name { font-size: var(--text-16); font-weight: 600; color: var(--ink-900); }
.perfil__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.perfil__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.perfil__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.perfil__toggle { display: flex; align-items: center; gap: var(--sp-3); cursor: pointer; font-size: var(--text-14); }
.perfil__toggle input { width: 40px; height: 22px; }
.perfil__warning { font-size: var(--text-13); color: var(--red-500); background: var(--red-100); border-radius: var(--radius-input); padding: var(--sp-3); }
.perfil__preview { display: flex; gap: var(--sp-2); align-items: center; }
.perfil__preview :deep(.field) { flex: 1; }
@media (max-width: 900px) {
  .perfil__layout { grid-template-columns: 1fr; }
  .perfil__nav { flex-direction: row; overflow-x: auto; }
}
</style>
