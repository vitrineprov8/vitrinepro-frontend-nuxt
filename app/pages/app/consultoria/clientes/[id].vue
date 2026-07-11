<script setup lang="ts">
// T-T05 — Página do cliente (Workspace Consultoria). Header (logo, nome,
// contatos) + tabs Vagas · Placements. "Notas" fica fora do escopo v1 (não
// existe entidade de notas de cliente no backend) — documentado em CLAUDE.md.
import { Globe, ArrowLeft } from 'lucide-vue-next'
import type { Company, TeamPlacement } from '~/types/team'
import { PLACEMENT_STATUS_LABEL } from '~/types/team'
import type { Vaga, PaginatedResult } from '~/types/vaga'
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()

const route = useRoute()
const companyId = route.params.id as string
const api = useApi()

const { data: company, pending: pendingCompany } = await useAsyncData(`consultoria-cliente-${companyId}`, () =>
  api.get<Company>(`/companies/${companyId}`).catch(() => null))

useSeoMeta({ title: () => company.value?.name ?? 'Cliente' })

const tab = ref<'vagas' | 'placements'>('vagas')
const tabs = [
  { value: 'vagas', label: 'Vagas' },
  { value: 'placements', label: 'Placements' },
]

const { data: vagasResp, pending: pendingVagas } = await useAsyncData(`consultoria-cliente-${companyId}-vagas`, () =>
  api.get<PaginatedResult<Vaga>>('/vagas/me', { companyId, limit: 100 }).catch(() => null))
const vagas = computed<Vaga[]>(() => vagasResp.value?.data ?? [])

const { data: placementsAll, pending: pendingPlacements } = await useAsyncData(`consultoria-cliente-${companyId}-placements`, () =>
  api.get<TeamPlacement[]>('/placements/me-as-team').catch(() => []))
const placements = computed<TeamPlacement[]>(() => (placementsAll.value ?? []).filter(p => p.company?.id === companyId))

function resumo(v: Vaga) {
  return [v.workMode ? VAGA_WORK_MODE_LABEL[v.workMode] : null, v.type ? VAGA_TYPE_LABEL[v.type] : null]
    .filter(Boolean).join(' · ')
}
function fmtBRL(v: number | string | null) {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—'
}
</script>

<template>
  <div class="cliente">
    <NuxtLink to="/app/consultoria/clientes" class="cliente__back"><ArrowLeft :size="14" /> Clientes</NuxtLink>

    <div v-if="pendingCompany" class="skeleton cliente__skel-header" />

    <template v-else-if="company">
      <header class="cliente__header">
        <UiAvatar :src="company.logoUrl" :name="company.name" size="xl" />
        <div class="cliente__header-info">
          <h1>{{ company.name }}</h1>
          <p v-if="company.industry" class="cliente__industry">{{ company.industry }}</p>
          <a v-if="company.website" :href="company.website" target="_blank" rel="noopener" class="cliente__website">
            <Globe :size="13" /> {{ company.website.replace(/^https?:\/\//, '') }}
          </a>
        </div>
      </header>
      <p v-if="company.description" class="cliente__desc">{{ company.description }}</p>

      <UiTabs v-model="tab" :tabs="tabs" class="cliente__tabs" />

      <div v-if="tab === 'vagas'">
        <div v-if="pendingVagas" class="cliente__skel-list">
          <div v-for="n in 3" :key="n" class="skeleton cliente__skel-row" />
        </div>
        <UiEmptyState v-else-if="!vagas.length" title="Nenhuma vaga para este cliente" description="Crie uma vaga e associe a este cliente para vê-la aqui." />
        <div v-else class="cliente__table-wrap">
          <table class="cliente__table">
            <thead><tr><th>Vaga</th><th>Status</th><th>Candidatos</th></tr></thead>
            <tbody>
              <tr v-for="v in vagas" :key="v.id" class="cliente__row" @click="navigateTo(`/app/consultoria/vagas/${v.id}`)">
                <td>
                  <span class="cliente__vaga-title">{{ v.title }}</span>
                  <span v-if="resumo(v)" class="cliente__vaga-sub">{{ resumo(v) }}</span>
                </td>
                <td>
                  <UiBadge :variant="v.status === 'PUBLISHED' ? 'success' : v.status === 'DRAFT' ? 'neutral' : 'warning'">
                    {{ v.status === 'PUBLISHED' ? 'Publicada' : v.status === 'DRAFT' ? 'Rascunho' : 'Encerrada' }}
                  </UiBadge>
                </td>
                <td>{{ v.applicationsCount ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else>
        <div v-if="pendingPlacements" class="cliente__skel-list">
          <div v-for="n in 3" :key="n" class="skeleton cliente__skel-row" />
        </div>
        <UiEmptyState v-else-if="!placements.length" title="Nenhum placement para este cliente" description="Contratações confirmadas para este cliente aparecerão aqui." />
        <div v-else class="cliente__table-wrap">
          <table class="cliente__table">
            <thead><tr><th>Vaga</th><th>Responsável</th><th>Salário</th><th>Fee</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>
              <tr v-for="p in placements" :key="p.id">
                <td>{{ p.vagaTitle ?? '—' }}</td>
                <td>
                  <span v-if="p.responsavel">
                    {{ p.responsavel.firstName }} {{ p.responsavel.lastName }}
                    <UiBadge v-if="p.responsavel.isExternalHunter" variant="outline">Hunter</UiBadge>
                  </span>
                  <span v-else>—</span>
                </td>
                <td>{{ fmtBRL(p.finalSalary) }}</td>
                <td>{{ p.feeAmount != null ? fmtBRL(p.feeAmount) : '—' }}</td>
                <td><UiBadge variant="info">{{ PLACEMENT_STATUS_LABEL[p.status] }}</UiBadge></td>
                <td>{{ fmtData(p.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <UiEmptyState v-else title="Cliente não encontrado" description="Este cliente pode ter sido removido." />
  </div>
</template>

<style scoped>
.cliente__back { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-13); color: var(--ink-500); margin-bottom: var(--sp-4); }
.cliente__skel-header { height: 80px; border-radius: var(--radius-card); margin-bottom: var(--sp-4); }
.cliente__header { display: flex; align-items: center; gap: var(--sp-4); }
.cliente__header-info h1 { font-size: var(--text-22); }
.cliente__industry { font-size: var(--text-13); color: var(--ink-500); margin-top: 2px; }
.cliente__website { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-12); color: var(--brand-600); margin-top: 2px; }
.cliente__desc { font-size: var(--text-14); color: var(--ink-700); margin-top: var(--sp-4); max-width: 640px; }
.cliente__tabs { margin: var(--sp-5) 0 var(--sp-4); }
.cliente__skel-list { display: flex; flex-direction: column; gap: var(--sp-2); }
.cliente__skel-row { height: 48px; border-radius: var(--radius-input); }
.cliente__table-wrap { overflow-x: auto; }
.cliente__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 640px; }
.cliente__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.cliente__table td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.cliente__row { cursor: pointer; }
.cliente__row:hover { background: var(--ink-100); }
.cliente__vaga-title { display: block; font-weight: 600; color: var(--ink-900); }
.cliente__vaga-sub { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
</style>
