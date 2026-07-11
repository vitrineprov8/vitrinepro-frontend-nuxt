<script setup lang="ts">
// T-E08 — Página da Empresa (edição pós-registro). Backend: PATCH /profile
// (campos companyName/companyIndustry/companyLogoUrl/bannerUrl adicionados
// nesta fase) + POST /profile/avatar (dual-write p/ companyLogoUrl) +
// POST /profile/banner. Preview replica a página pública /empresa/[slug].
definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Página da Empresa' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const companyName = ref('')
const companyIndustry = ref('')
const bio = ref('')
const website = ref('')
const location = ref('')
const phone = ref('')
const isVisible = ref(true)
const saving = ref(false)

const initialized = ref(false)
watch(
  () => auth.user,
  (u) => {
    if (!u || initialized.value) return
    companyName.value = u.companyName ?? ''
    companyIndustry.value = u.companyIndustry ?? ''
    bio.value = u.bio ?? ''
    website.value = u.website ?? ''
    location.value = u.location ?? ''
    phone.value = u.phone ?? ''
    isVisible.value = u.isVisible ?? true
    initialized.value = true
  },
  { immediate: true },
)

async function salvar() {
  saving.value = true
  try {
    await api.patch('/profile', {
      companyName: companyName.value.trim() || undefined,
      companyIndustry: companyIndustry.value.trim() || undefined,
      bio: bio.value || undefined,
      website: website.value.trim() || undefined,
      location: location.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      isVisible: isVisible.value,
    })
    await auth.fetchMe()
    toast.success('Página da empresa atualizada.')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível salvar.')
  }
  finally {
    saving.value = false
  }
}

// ── Logo (dual-write via /profile/avatar) e capa (/profile/banner) ─────────
const logoInput = ref<HTMLInputElement | null>(null)
const bannerInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)
const uploadingBanner = ref(false)

async function onLogoSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingLogo.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post('/profile/avatar', form)
    await auth.fetchMe()
    toast.success('Logo atualizada.')
  }
  catch {
    toast.error('Não foi possível enviar a logo.')
  }
  finally {
    uploadingLogo.value = false
    if (logoInput.value) logoInput.value.value = ''
  }
}

async function onBannerSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post('/profile/banner', form)
    await auth.fetchMe()
    toast.success('Capa atualizada.')
  }
  catch {
    toast.error('Não foi possível enviar a capa.')
  }
  finally {
    uploadingBanner.value = false
    if (bannerInput.value) bannerInput.value.value = ''
  }
}
</script>

<template>
  <div class="pag">
    <header class="pag__header">
      <h1>Página da Empresa</h1>
      <p class="text-secondary">Como candidatos e hunters veem sua empresa publicamente.</p>
    </header>

    <div class="pag__cols">
      <section class="pag__main">
        <UiCard class="pag__card">
          <h2>Identidade</h2>
          <div class="pag__logo-row">
            <div class="pag__logo" :style="auth.user?.companyLogoUrl ? { backgroundImage: `url(${auth.user.companyLogoUrl})` } : undefined">
              <span v-if="!auth.user?.companyLogoUrl">{{ (companyName || '?').charAt(0) }}</span>
            </div>
            <div>
              <input ref="logoInput" type="file" accept="image/*" class="pag__file-input" @change="onLogoSelected">
              <UiButton size="sm" variant="secondary" :loading="uploadingLogo" @click="logoInput?.click()">Trocar logo</UiButton>
            </div>
          </div>

          <UiInput v-model="companyName" label="Nome da empresa" placeholder="Ex.: Acme Tecnologia" />
          <UiInput v-model="companyIndustry" label="Segmento / indústria" placeholder="Ex.: Tecnologia, Varejo..." />
          <label class="pag__field">
            <span class="pag__label">Sobre a empresa</span>
            <textarea v-model="bio" rows="4" placeholder="Conte um pouco sobre a empresa, cultura e missão..." />
          </label>
          <UiInput v-model="location" label="Cidade" placeholder="Ex.: São Paulo, SP" />
          <UiInput v-model="website" label="Site" placeholder="https://..." />
          <UiInput v-model="phone" label="Telefone de contato" placeholder="(11) 90000-0000" />

          <label class="pag__toggle">
            <input v-model="isVisible" type="checkbox">
            <span>Página pública visível</span>
          </label>

          <UiButton :loading="saving" @click="salvar">Salvar página</UiButton>
        </UiCard>

        <UiCard class="pag__card">
          <h2>Capa</h2>
          <div class="pag__banner" :style="auth.user?.bannerUrl ? { backgroundImage: `url(${auth.user.bannerUrl})` } : undefined" />
          <input ref="bannerInput" type="file" accept="image/*" class="pag__file-input" @change="onBannerSelected">
          <UiButton size="sm" variant="secondary" :loading="uploadingBanner" @click="bannerInput?.click()">Trocar capa</UiButton>
        </UiCard>
      </section>

      <aside class="pag__side">
        <UiCard class="pag__preview">
          <h3 class="pag__preview-title">Prévia</h3>
          <div class="prev">
            <div class="prev__banner" :style="auth.user?.bannerUrl ? { backgroundImage: `url(${auth.user.bannerUrl})` } : undefined" />
            <div class="prev__logo" :style="auth.user?.companyLogoUrl ? { backgroundImage: `url(${auth.user.companyLogoUrl})` } : undefined">
              <span v-if="!auth.user?.companyLogoUrl">{{ (companyName || '?').charAt(0) }}</span>
            </div>
            <p class="prev__name">{{ companyName || 'Nome da empresa' }}</p>
            <p v-if="companyIndustry" class="prev__industry">{{ companyIndustry }}</p>
            <p v-if="location" class="prev__location">📍 {{ location }}</p>
          </div>
          <UiButton v-if="auth.user?.username" block variant="secondary" @click="navigateTo(`/empresa/${auth.user.username}`, { external: true, open: { target: '_blank' } })">
            Ver página pública
          </UiButton>
        </UiCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.pag__header { margin-bottom: var(--sp-6); }
.pag__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-1); }
.pag__cols { display: grid; grid-template-columns: 1fr 320px; gap: var(--sp-6); align-items: start; }
.pag__main { display: flex; flex-direction: column; gap: var(--sp-5); }
.pag__card { display: flex; flex-direction: column; gap: var(--sp-4); }
.pag__card h2 { font-size: var(--text-16); }
.pag__logo-row { display: flex; align-items: center; gap: var(--sp-4); }
.pag__logo { width: 72px; height: 72px; border-radius: var(--radius-card, 12px); background: var(--ink-100) center/cover no-repeat; display: flex; align-items: center; justify-content: center; font-size: var(--text-22); font-weight: 700; color: var(--ink-500); flex-shrink: 0; }
.pag__banner { width: 100%; height: 120px; border-radius: var(--radius-card); background: var(--ink-100) center/cover no-repeat; }
.pag__file-input { display: none; }
.pag__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.pag__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.pag__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.pag__toggle { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-14); color: var(--ink-700); cursor: pointer; }
.pag__preview { display: flex; flex-direction: column; gap: var(--sp-4); }
.pag__preview-title { font-size: var(--text-14); color: var(--ink-500); }
.prev { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-1); }
.prev__banner { width: 100%; height: 64px; border-radius: var(--radius-input); background: var(--ink-100) center/cover no-repeat; margin-bottom: var(--sp-2); }
.prev__logo { width: 56px; height: 56px; border-radius: var(--radius-card, 12px); background: var(--ink-100) center/cover no-repeat; display: flex; align-items: center; justify-content: center; font-size: var(--text-18); font-weight: 700; color: var(--ink-500); margin-top: -32px; border: 3px solid var(--white); }
.prev__name { font-weight: 600; color: var(--ink-900); margin-top: var(--sp-2); }
.prev__industry { font-size: var(--text-13); color: var(--ink-700); }
.prev__location { font-size: var(--text-12); color: var(--ink-500); }
@media (max-width: 900px) {
  .pag__cols { grid-template-columns: 1fr; }
}
</style>
