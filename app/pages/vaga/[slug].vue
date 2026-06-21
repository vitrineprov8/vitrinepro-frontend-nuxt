<script setup lang="ts">
// T06 — Detalhe da vaga + Modal Candidatura. SSR + SEO.
import type { Vaga, PaginatedResult, MyApplication } from '~/types/vaga'
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL, VAGA_SEGMENT_LABEL } from '~/types/vaga'

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const config = useRuntimeConfig()

const slug = computed(() => route.params.slug as string)

const { data: vaga } = await useAsyncData(`vaga-${slug.value}`, () =>
  api.get<Vaga>(`/vagas/${slug.value}`).catch(() => null),
)

// Tombstone: distingue 410 (removida/oculta) e 301 (renomeada) de um 404 puro.
if (!vaga.value) {
  const tomb = await api.get<{ exists: boolean, reason?: string, redirectTo?: string }>(
    '/seo/tombstone', { type: 'vaga', slug: slug.value },
  ).catch(() => null)
  if (tomb?.exists) {
    if (tomb.reason === 'renamed' && tomb.redirectTo) {
      await navigateTo(tomb.redirectTo, { redirectCode: 301, replace: true })
    }
    else {
      throw createError({ statusCode: 410, statusMessage: 'Conteúdo removido', fatal: true })
    }
  }
  else if (import.meta.server) {
    const event = useRequestEvent()
    if (event) setResponseStatus(event, 404)
  }
}

// Vagas semelhantes (mesmo segmento) ou últimas (estado indisponível).
const { data: similarResp } = await useAsyncData(`vaga-similar-${slug.value}`, () =>
  api.get<PaginatedResult<Vaga>>('/vagas/radar', {
    limit: 4,
    segment: vaga.value?.segment || undefined,
  }).catch(() => null),
)
const similar = computed<Vaga[]>(() =>
  (similarResp.value?.data ?? []).filter(v => v.slug !== slug.value).slice(0, vaga.value ? 3 : 4))

// --- Formatadores ---
function moeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
const salario = computed(() => {
  const v = vaga.value
  if (!v) return null
  const min = v.salaryMin != null ? Number(v.salaryMin) : null
  const max = v.salaryMax != null ? Number(v.salaryMax) : null
  if (min == null && max == null) return null
  if (min != null && max != null) return `${moeda(min)} – ${moeda(max)}`
  return moeda((min ?? max) as number)
})
const publicada = computed(() => {
  const v = vaga.value
  const base = v?.publishedAt ?? v?.createdAt
  if (!base) return null
  const dias = Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000)
  if (dias <= 0) return 'publicada hoje'
  if (dias === 1) return 'publicada há 1 dia'
  if (dias < 30) return `publicada há ${dias} dias`
  const m = Math.floor(dias / 30)
  return m === 1 ? 'publicada há 1 mês' : `publicada há ${m} meses`
})
const diasRestantes = computed(() => {
  if (!vaga.value?.deadline) return null
  const d = Math.ceil((new Date(vaga.value.deadline).getTime() - Date.now()) / 86_400_000)
  return d > 0 && d <= 7 ? d : null
})

// --- Estado de candidatura / salvar ---
const applied = ref(false)
const saved = ref(false)
const modalOpen = ref(false)
const loginPromptOpen = ref(false)

onMounted(async () => {
  if (!auth.isAuthenticated || !vaga.value) return
  try {
    const apps = await api.get<MyApplication[]>('/me/applications')
    applied.value = apps.some(a => a.vaga?.id === vaga.value!.id)
  }
  catch { /* silencioso */ }
})

function onCandidatar() {
  if (!auth.isAuthenticated) { loginPromptOpen.value = true; return }
  if (auth.user?.isCompany) {
    toast.info('Contas empresariais não podem se candidatar. Use uma conta de profissional.')
    return
  }
  modalOpen.value = true
}

async function onSalvar() {
  if (!auth.isAuthenticated) { loginPromptOpen.value = true; return }
  if (!vaga.value) return
  const wasSaved = saved.value
  saved.value = !wasSaved // otimista
  try {
    if (wasSaved) await api.del(`/vagas/${vaga.value.id}/save`)
    else await api.post(`/vagas/${vaga.value.id}/save`)
  }
  catch (e) {
    const err = e as { status?: number }
    if (!wasSaved && err.status === 409) { saved.value = true; return } // já estava salva
    saved.value = wasSaved // reverte
    toast.error('Não foi possível atualizar a vaga salva.')
  }
}

const pageUrl = computed(() => `${config.public.frontendUrl}${route.path}`)
function compartilhar(rede: 'whatsapp' | 'linkedin' | 'copiar') {
  const url = pageUrl.value
  const titulo = vaga.value?.title ?? 'Vaga'
  if (rede === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo} — ${url}`)}`, '_blank')
  else if (rede === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  else navigator.clipboard?.writeText(url).then(() => toast.success('Link copiado!'))
}

function goLogin() { navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`) }
function goCadastro() { navigateTo(`/cadastro?redirect=${encodeURIComponent(route.fullPath)}`) }

// --- SEO ---
useSeoMeta({
  title: () => vaga.value ? vaga.value.title : 'Vaga não encontrada',
  description: () => vaga.value?.description?.slice(0, 160) ?? 'Esta vaga não está mais disponível.',
})
useHead(() => vaga.value
  ? {
      link: [{ rel: 'canonical', href: pageUrl.value }],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          'title': vaga.value.title,
          'description': vaga.value.description,
          'datePosted': vaga.value.publishedAt ?? vaga.value.createdAt,
          'employmentType': vaga.value.type ?? undefined,
          'hiringOrganization': vaga.value.company
            ? { '@type': 'Organization', 'name': vaga.value.company.name }
            : undefined,
          'jobLocation': vaga.value.location
            ? { '@type': 'Place', 'address': vaga.value.location }
            : undefined,
        }),
      }],
    }
  : {})
</script>

<template>
  <div class="vd container">
    <!-- ESTADO: vaga indisponível -->
    <div v-if="!vaga" class="vd__missing">
      <h1>Vaga não disponível</h1>
      <p class="text-secondary">Esta vaga foi encerrada ou não existe mais.</p>
      <UiButton @click="navigateTo('/vagas')">Ver todas as vagas</UiButton>

      <template v-if="similar.length">
        <h2 class="vd__similar-title">Vagas semelhantes</h2>
        <div class="vd__similar-grid">
          <VagaCard v-for="v in similar" :key="v.id" :vaga="v" />
        </div>
      </template>
    </div>

    <!-- ESTADO: detalhe -->
    <div v-else class="vd__grid">
      <main class="vd__main">
        <h1 class="vd__title">{{ vaga.title }}</h1>

        <div v-if="vaga.company" class="vd__company">
          <UiAvatar :src="vaga.company.logoUrl" :name="vaga.company.name" size="sm" />
          <span>{{ vaga.company.name }}</span>
        </div>

        <div class="vd__pills">
          <UiBadge v-if="vaga.location" variant="neutral">{{ vaga.location }}</UiBadge>
          <UiBadge v-if="vaga.workMode" variant="neutral">{{ VAGA_WORK_MODE_LABEL[vaga.workMode] }}</UiBadge>
          <UiBadge v-if="vaga.type" variant="neutral">{{ VAGA_TYPE_LABEL[vaga.type] }}</UiBadge>
          <UiBadge v-if="vaga.segment" variant="outline">{{ VAGA_SEGMENT_LABEL[vaga.segment] }}</UiBadge>
        </div>
        <p v-if="publicada" class="vd__date">{{ publicada }}</p>

        <section v-if="vaga.description" class="vd__section">
          <h2>Descrição</h2>
          <p class="vd__text">{{ vaga.description }}</p>
        </section>
        <section v-if="vaga.requirements" class="vd__section">
          <h2>Requisitos</h2>
          <p class="vd__text">{{ vaga.requirements }}</p>
        </section>
        <section v-if="vaga.benefits" class="vd__section">
          <h2>Benefícios</h2>
          <p class="vd__text">{{ vaga.benefits }}</p>
        </section>

        <template v-if="similar.length">
          <h2 class="vd__similar-title">Vagas semelhantes</h2>
          <div class="vd__similar-grid">
            <VagaCard v-for="v in similar" :key="v.id" :vaga="v" />
          </div>
        </template>
      </main>

      <!-- Card lateral sticky -->
      <aside class="vd__side">
        <UiCard>
          <p v-if="salario" class="vd__salary">{{ salario }}</p>
          <p v-else class="vd__salary vd__salary--muted">Salário a combinar</p>

          <div v-if="applied" class="vd__applied">
            <UiBadge variant="success">✓ Você já se candidatou</UiBadge>
            <UiButton block variant="secondary" @click="navigateTo('/app')">Ver minha candidatura</UiButton>
          </div>
          <UiButton v-else block @click="onCandidatar">Candidatar-se</UiButton>

          <UiButton block variant="ghost" @click="onSalvar">
            {{ saved ? '♥ Salva' : '♡ Salvar vaga' }}
          </UiButton>

          <p v-if="diasRestantes" class="vd__deadline">⏳ Encerra em {{ diasRestantes }} dia{{ diasRestantes === 1 ? '' : 's' }}</p>
        </UiCard>

        <!-- Bloco hunter -->
        <UiCard v-if="vaga.allowHunters" class="vd__hunter">
          <strong>Esta vaga aceita hunters</strong>
          <p class="text-secondary">Trabalhe esta vaga e indique candidatos. O fee em R$ chega com o marketplace.</p>
          <UiButton block variant="secondary" @click="navigateTo('/cadastro?perfil=hunter')">Quero esta vaga</UiButton>
        </UiCard>

        <!-- Compartilhar -->
        <div class="vd__share">
          <span class="vd__share-label">Compartilhar</span>
          <div class="vd__share-btns">
            <button aria-label="WhatsApp" @click="compartilhar('whatsapp')">WhatsApp</button>
            <button aria-label="LinkedIn" @click="compartilhar('linkedin')">LinkedIn</button>
            <button aria-label="Copiar link" @click="compartilhar('copiar')">Copiar link</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal Candidatura -->
    <ApplyModal
      v-if="vaga"
      :open="modalOpen" :vaga-slug="vaga.slug" :vaga-title="vaga.title"
      @close="modalOpen = false" @applied="applied = true"
    />

    <!-- Modal mini-login -->
    <UiModal :open="loginPromptOpen" title="Entre para continuar" size="sm" @close="loginPromptOpen = false">
      <p class="text-secondary">Crie sua conta ou entre para se candidatar e salvar vagas.</p>
      <div class="vd__login-actions">
        <UiButton block @click="goCadastro">Criar conta grátis</UiButton>
        <UiButton block variant="secondary" @click="goLogin">Já tenho conta</UiButton>
      </div>
    </UiModal>
  </div>
</template>

<style scoped>
.vd { padding: var(--sp-8) 0 var(--sp-16); }

.vd__missing { text-align: center; padding: var(--sp-12) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }

.vd__grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-8); align-items: start; }
.vd__title { font-size: var(--text-28); line-height: 1.2; }
.vd__company { display: flex; align-items: center; gap: var(--sp-2); margin-top: var(--sp-3); font-weight: 600; color: var(--ink-700); }
.vd__pills { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-4); }
.vd__date { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-2); }
.vd__section { margin-top: var(--sp-8); }
.vd__section h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.vd__text { color: var(--ink-700); line-height: 1.6; white-space: pre-wrap; }

.vd__side { display: flex; flex-direction: column; gap: var(--sp-4); position: sticky; top: calc(var(--topbar-h) + var(--sp-4)); }
.vd__side :deep(.btn) { margin-top: var(--sp-2); }
.vd__salary { font-family: var(--font-display); font-size: var(--text-22); font-weight: 700; color: var(--brand-700); }
.vd__salary--muted { color: var(--ink-500); font-size: var(--text-16); }
.vd__applied { display: flex; flex-direction: column; gap: var(--sp-2); margin-top: var(--sp-2); }
.vd__deadline { font-size: var(--text-13); color: var(--amber-500); margin-top: var(--sp-3); }

.vd__hunter { background: var(--brand-100); }
.vd__hunter strong { display: block; color: var(--brand-700); }
.vd__hunter p { font-size: var(--text-13); margin: var(--sp-1) 0 0; }

.vd__share-label { font-size: var(--text-13); color: var(--ink-500); }
.vd__share-btns { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-2); }
.vd__share-btns button {
  background: var(--ink-100); border: none; border-radius: var(--radius-input);
  padding: var(--sp-2) var(--sp-3); font-size: var(--text-13); color: var(--ink-700); cursor: pointer;
}
.vd__share-btns button:hover { background: var(--ink-300); }

.vd__similar-title { font-size: var(--text-18); margin: var(--sp-12) 0 var(--sp-4); }
.vd__similar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }

.vd__login-actions { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-5); }

@media (max-width: 900px) {
  .vd__grid { grid-template-columns: 1fr; }
  .vd__side { position: static; }
  .vd__similar-grid { grid-template-columns: 1fr; }
}
</style>
