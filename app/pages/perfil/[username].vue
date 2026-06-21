<script setup lang="ts">
// T09 — Perfil público do candidato. Backend: GET /profile/:username (+ portfolio, education, cv públicos).
// 404 quando oculto/empresa/inexistente (RN-CONTA-02/04).
interface PublicProfile {
  id: string
  firstName: string
  lastName: string
  username: string | null
  avatarUrl: string | null
  profession: string | null
  bio: string | null
  phone: string | null
  email?: string | null
  website: string | null
  location: string | null
  socialLinks?: { linkedin?: string, github?: string, instagram?: string } | null
}
interface PortfolioItem {
  id: string
  title: string
  subtitle: string | null
  slug: string
  coverImageUrl: string | null
  clientName: string | null
  year: number | null
}
interface EducationItem {
  id: string
  type: string | null
  institution: string
  title: string
  fieldOfStudy: string | null
  startDate: string
  endDate: string | null
  description: string | null
}
interface PublicCV { id: string, label: string | null, fileUrl: string | null }

const route = useRoute()
const api = useApi()
const username = computed(() => route.params.username as string)

const { data: profile } = await useAsyncData(`profile-${username.value}`, () =>
  api.get<PublicProfile>(`/profile/${username.value}`).catch(() => null))

// Tombstone: 410 (removido/oculto) ou 301 (renomeado) vs 404 puro.
if (!profile.value) {
  const tomb = await api.get<{ exists: boolean, reason?: string, redirectTo?: string }>(
    '/seo/tombstone', { type: 'profile', slug: username.value },
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

const uid = computed(() => profile.value?.id)
const { data: portfolioResp } = await useAsyncData(`profile-pf-${username.value}`, () =>
  uid.value
    ? api.get<{ data: PortfolioItem[] }>('/portfolio', { userId: uid.value, status: 'PUBLISHED', limit: 50 }).catch(() => null)
    : Promise.resolve(null))
const { data: education } = await useAsyncData(`profile-edu-${username.value}`, () =>
  uid.value ? api.get<EducationItem[]>(`/education/public/${uid.value}`).catch(() => null) : Promise.resolve(null))
const { data: cvs } = await useAsyncData(`profile-cv-${username.value}`, () =>
  uid.value ? api.get<PublicCV[]>(`/cv/public/${uid.value}`).catch(() => null) : Promise.resolve(null))

const portfolio = computed<PortfolioItem[]>(() => portfolioResp.value?.data ?? [])
const educations = computed<EducationItem[]>(() => education.value ?? [])
const cvList = computed<PublicCV[]>(() => (cvs.value ?? []).filter(c => c.fileUrl))

const fullName = computed(() => profile.value ? `${profile.value.firstName} ${profile.value.lastName}`.trim() : '')
const social = computed(() => {
  const p = profile.value
  if (!p) return [] as { label: string, href: string }[]
  const arr: { label: string, href: string }[] = []
  if (p.socialLinks?.linkedin) arr.push({ label: 'LinkedIn', href: p.socialLinks.linkedin })
  if (p.socialLinks?.github) arr.push({ label: 'GitHub', href: p.socialLinks.github })
  if (p.socialLinks?.instagram) arr.push({ label: 'Instagram', href: p.socialLinks.instagram })
  if (p.website) arr.push({ label: 'Site', href: p.website })
  return arr
})
const contatoHref = computed(() => {
  const p = profile.value
  if (p?.email) return `mailto:${p.email}`
  if (p?.phone) return `https://wa.me/${p.phone.replace(/\D/g, '')}`
  return null
})

function eduPeriodo(e: EducationItem) {
  const ini = e.startDate ? new Date(e.startDate).getFullYear() : ''
  const fim = e.endDate ? new Date(e.endDate).getFullYear() : 'atual'
  return ini ? `${ini} – ${fim}` : ''
}

const tab = ref('portfolio')
const tabs = computed(() => [
  { value: 'portfolio', label: 'Portfólio', count: portfolio.value.length },
  { value: 'sobre', label: 'Sobre' },
  { value: 'formacao', label: 'Formação', count: educations.value.length },
])

useSeoMeta({
  title: () => profile.value ? `${fullName.value}${profile.value.profession ? ` — ${profile.value.profession}` : ''}` : 'Perfil não encontrado',
  description: () => profile.value?.bio?.slice(0, 160) ?? 'Perfil profissional no VitrinePro.',
})
</script>

<template>
  <div class="pf container">
    <div v-if="!profile" class="pf__missing">
      <h1>Perfil não encontrado</h1>
      <p class="text-secondary">Este perfil não existe ou está oculto.</p>
      <UiButton @click="navigateTo('/vagas')">Ver vagas abertas</UiButton>
    </div>

    <template v-else>
      <!-- HEADER -->
      <header class="pf__header">
        <UiAvatar :src="profile.avatarUrl" :name="fullName" size="xl" />
        <div class="pf__head-info">
          <h1 class="pf__name">{{ fullName }}</h1>
          <p v-if="profile.profession" class="pf__profession">{{ profile.profession }}</p>
          <p v-if="profile.location" class="pf__location">📍 {{ profile.location }}</p>
          <div v-if="social.length" class="pf__social">
            <a v-for="s in social" :key="s.label" :href="s.href" target="_blank" rel="noopener">{{ s.label }}</a>
          </div>
        </div>
        <div class="pf__actions">
          <UiButton v-if="cvList.length" @click="navigateTo(cvList[0]!.fileUrl!, { external: true, open: { target: '_blank' } })">
            Baixar CV
          </UiButton>
          <UiButton v-if="contatoHref" variant="secondary" @click="navigateTo(contatoHref!, { external: true })">Contato</UiButton>
        </div>
      </header>

      <!-- TABS -->
      <UiTabs v-model="tab" :tabs="tabs" class="pf__tabs" />

      <!-- PORTFÓLIO -->
      <section v-if="tab === 'portfolio'">
        <div v-if="portfolio.length" class="pf__grid">
          <NuxtLink v-for="item in portfolio" :key="item.id" :to="`/portfolio/${item.slug}`" class="pf-card-link">
            <UiCard clickable>
              <div class="pf-card__cover" :style="item.coverImageUrl ? { backgroundImage: `url(${item.coverImageUrl})` } : undefined" />
              <h3 class="pf-card__title">{{ item.title }}</h3>
              <p v-if="item.subtitle" class="pf-card__sub">{{ item.subtitle }}</p>
              <p v-if="item.clientName || item.year" class="pf-card__meta">
                {{ [item.clientName, item.year].filter(Boolean).join(' · ') }}
              </p>
            </UiCard>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="Nenhum projeto publicado" description="Este profissional ainda não publicou itens no portfólio." />
      </section>

      <!-- SOBRE -->
      <section v-else-if="tab === 'sobre'" class="pf__about">
        <p v-if="profile.bio" class="pf__bio">{{ profile.bio }}</p>
        <UiEmptyState v-else title="Sem descrição" description="Este profissional ainda não escreveu uma bio." />
      </section>

      <!-- FORMAÇÃO -->
      <section v-else class="pf__edu">
        <ol v-if="educations.length" class="timeline">
          <li v-for="e in educations" :key="e.id" class="timeline__item">
            <div class="timeline__dot" />
            <div class="timeline__body">
              <h4 class="timeline__title">{{ e.title }}</h4>
              <p class="timeline__inst">{{ e.institution }}<span v-if="e.fieldOfStudy"> · {{ e.fieldOfStudy }}</span></p>
              <p class="timeline__period">{{ eduPeriodo(e) }}</p>
              <p v-if="e.description" class="timeline__desc">{{ e.description }}</p>
            </div>
          </li>
        </ol>
        <UiEmptyState v-else title="Sem formação cadastrada" description="Este profissional ainda não adicionou formação." />
      </section>
    </template>
  </div>
</template>

<style scoped>
.pf { padding: var(--sp-8) 0 var(--sp-16); }
.pf__missing { text-align: center; padding: var(--sp-12) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }

.pf__header { display: flex; align-items: center; gap: var(--sp-5); flex-wrap: wrap; }
.pf__head-info { flex: 1; min-width: 200px; }
.pf__name { font-size: var(--text-28); }
.pf__profession { color: var(--ink-700); font-size: var(--text-16); margin-top: var(--sp-1); }
.pf__location { color: var(--ink-500); font-size: var(--text-13); margin-top: var(--sp-1); }
.pf__social { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-2); }
.pf__social a { font-size: var(--text-13); color: var(--brand-700); font-weight: 600; }
.pf__actions { display: flex; gap: var(--sp-2); }

.pf__tabs { margin: var(--sp-8) 0 var(--sp-6); }

.pf__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.pf-card-link { text-decoration: none; color: inherit; }
.pf-card__cover { aspect-ratio: 16/9; border-radius: var(--radius-input); background: var(--ink-100) center/cover no-repeat; margin-bottom: var(--sp-3); }
.pf-card__title { font-size: var(--text-16); font-weight: 600; color: var(--ink-900); }
.pf-card__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: 2px; }
.pf-card__meta { font-size: var(--text-12); color: var(--ink-500); margin-top: var(--sp-2); }

.pf__about { max-width: 720px; }
.pf__bio { color: var(--ink-700); line-height: 1.7; white-space: pre-wrap; }

.timeline { list-style: none; padding: 0; margin: 0; max-width: 720px; }
.timeline__item { position: relative; padding-left: var(--sp-6); padding-bottom: var(--sp-6); border-left: 2px solid var(--ink-100); }
.timeline__item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline__dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--brand-600); }
.timeline__title { font-size: var(--text-16); }
.timeline__inst { color: var(--ink-700); font-size: var(--text-14); margin-top: 2px; }
.timeline__period { color: var(--ink-500); font-size: var(--text-13); margin-top: 2px; }
.timeline__desc { color: var(--ink-700); font-size: var(--text-14); margin-top: var(--sp-2); line-height: 1.5; }

@media (max-width: 900px) {
  .pf__grid { grid-template-columns: 1fr; }
  .pf__header { flex-direction: column; align-items: flex-start; }
}
</style>
