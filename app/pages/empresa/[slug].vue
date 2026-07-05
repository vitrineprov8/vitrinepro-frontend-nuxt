<script setup lang="ts">
// T10 — Página pública de empresa (B6). Backend: GET /empresas/:slug (conta isCompany).
// 404 quando oculta/inexistente/candidato (mesmo mecanismo de /perfil/:username).
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL, VAGA_SEGMENT_LABEL } from '~/types/vaga'
import type { CompanyVagaSummary } from '~/types/vaga'

interface PublicCompany {
  id: string
  companyName: string | null
  companyIndustry: string | null
  companyLogoUrl: string | null
  bio: string | null
  website: string | null
  location: string | null
  phone: string | null
  username: string | null
  vagasAbertas: CompanyVagaSummary[]
}

const route = useRoute()
const api = useApi()
const slug = computed(() => route.params.slug as string)

const { data: company } = await useAsyncData(`empresa-${slug.value}`, () =>
  api.get<PublicCompany>(`/empresas/${slug.value}`).catch(() => null))

if (!company.value && import.meta.server) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

const vagas = computed(() => company.value?.vagasAbertas ?? [])

function salarioLabel(v: CompanyVagaSummary) {
  const min = v.salaryMin != null ? Number(v.salaryMin) : null
  const max = v.salaryMax != null ? Number(v.salaryMax) : null
  if (min == null && max == null) return 'Salário a combinar'
  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  return fmt((min ?? max) as number)
}

useSeoMeta({
  title: () => company.value?.companyName ?? 'Empresa não encontrada',
  description: () => company.value?.bio?.slice(0, 160) ?? 'Página de empresa no VitrinePro.',
})
</script>

<template>
  <div class="emp container">
    <div v-if="!company" class="emp__missing">
      <h1>Empresa não encontrada</h1>
      <p class="text-secondary">Esta página não existe ou está oculta.</p>
      <UiButton @click="navigateTo('/vagas')">Ver vagas abertas</UiButton>
    </div>

    <template v-else>
      <header class="emp__header">
        <div class="emp__logo" :style="company.companyLogoUrl ? { backgroundImage: `url(${company.companyLogoUrl})` } : undefined">
          <span v-if="!company.companyLogoUrl">{{ (company.companyName ?? '?').charAt(0) }}</span>
        </div>
        <div class="emp__head-info">
          <h1 class="emp__name">{{ company.companyName }}</h1>
          <p v-if="company.companyIndustry" class="emp__industry">{{ company.companyIndustry }}</p>
          <p v-if="company.location" class="emp__location">📍 {{ company.location }}</p>
        </div>
        <div v-if="company.website" class="emp__actions">
          <UiButton variant="secondary" @click="navigateTo(company.website!, { external: true, open: { target: '_blank' } })">
            Visitar site
          </UiButton>
        </div>
      </header>

      <section v-if="company.bio" class="emp__about">
        <h2>Sobre</h2>
        <p class="emp__bio">{{ company.bio }}</p>
      </section>

      <section class="emp__vagas">
        <h2>Vagas abertas</h2>
        <div v-if="vagas.length" class="emp__grid">
          <NuxtLink v-for="v in vagas" :key="v.id" :to="`/vaga/${v.slug}`" class="emp-card-link">
            <UiCard clickable>
              <h3 class="emp-card__title">{{ v.title }}</h3>
              <p v-if="v.location" class="emp-card__location">{{ v.location }}</p>
              <div class="emp-card__pills">
                <UiBadge v-if="v.workMode" variant="neutral">{{ VAGA_WORK_MODE_LABEL[v.workMode] }}</UiBadge>
                <UiBadge v-if="v.type" variant="neutral">{{ VAGA_TYPE_LABEL[v.type] }}</UiBadge>
                <UiBadge v-if="v.segment" variant="outline">{{ VAGA_SEGMENT_LABEL[v.segment] }}</UiBadge>
              </div>
              <p class="emp-card__salary">{{ salarioLabel(v) }}</p>
            </UiCard>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="Nenhuma vaga aberta" description="Esta empresa não tem vagas publicadas no momento." />
      </section>
    </template>
  </div>
</template>

<style scoped>
.emp { padding: var(--sp-8) 0 var(--sp-16); }
.emp__missing { text-align: center; padding: var(--sp-12) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }

.emp__header { display: flex; align-items: center; gap: var(--sp-5); flex-wrap: wrap; }
.emp__logo {
  width: 80px; height: 80px; border-radius: var(--radius-card, 12px); background: var(--ink-100) center/cover no-repeat;
  display: flex; align-items: center; justify-content: center; font-size: var(--text-28); font-weight: 700; color: var(--ink-500);
  flex-shrink: 0;
}
.emp__head-info { flex: 1; min-width: 200px; }
.emp__name { font-size: var(--text-28); }
.emp__industry { color: var(--ink-700); font-size: var(--text-16); margin-top: var(--sp-1); }
.emp__location { color: var(--ink-500); font-size: var(--text-13); margin-top: var(--sp-1); }
.emp__actions { display: flex; gap: var(--sp-2); }

.emp__about { margin-top: var(--sp-8); max-width: 720px; }
.emp__about h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.emp__bio { color: var(--ink-700); line-height: 1.7; white-space: pre-wrap; }

.emp__vagas { margin-top: var(--sp-8); }
.emp__vagas h2 { font-size: var(--text-18); margin-bottom: var(--sp-4); }
.emp__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.emp-card-link { display: block; text-decoration: none; color: inherit; height: 100%; }
.emp-card__title { font-size: var(--text-16); font-weight: 600; color: var(--ink-900); margin: 0; }
.emp-card__location { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.emp-card__pills { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-3); }
.emp-card__salary {
  font-size: var(--text-14); font-weight: 600; color: var(--brand-700);
  margin-top: var(--sp-4); border-top: 1px solid var(--ink-100); padding-top: var(--sp-3);
}

@media (max-width: 900px) {
  .emp__grid { grid-template-columns: 1fr; }
  .emp__header { flex-direction: column; align-items: flex-start; }
}
</style>
