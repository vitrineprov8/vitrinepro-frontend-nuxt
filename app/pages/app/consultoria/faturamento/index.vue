<script setup lang="ts">
// T-T07 — Faturamento & Ganhos (Workspace Consultoria). Versão time do T-H09:
// KPIs + tabela de placements com Cliente/Responsável.
//
// Fora do escopo v1 (documentado em CLAUDE.md):
//  - Gráfico de barras de receita por mês (12m) — não construído.
//  - Split interno "repasse a membros" — fase futura; mostramos uma linha
//    estática "em breve" só para não quebrar a expectativa do design-spec.
//  - Dados de recebimento (CNPJ, Pix) — CNPJ já existe em team.cnpj (editável
//    em Configurações); não há campo de Pix no schema, então não é exibido.
import { DollarSign, Wallet, Briefcase, TrendingUp } from 'lucide-vue-next'
import type { ConsultoriaGanhosStats, TeamPlacement } from '~/types/team'
import { PLACEMENT_STATUS_LABEL } from '~/types/team'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Faturamento & Ganhos' })

const api = useApi()

const { data: stats, pending: pendingStats } = await useAsyncData('consultoria-ganhos-stats', () =>
  api.get<ConsultoriaGanhosStats>('/stats/consultoria/ganhos').catch(() => null))

const { data: placements, pending: pendingPlacements } = await useAsyncData('consultoria-ganhos-placements', () =>
  api.get<TeamPlacement[]>('/placements/me-as-team').catch(() => []))

const ordered = computed(() => (placements.value ?? []).slice()
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

function fmtBRL(v: number | string | null | undefined) {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—'
}
function statusVariant(s: TeamPlacement['status']) {
  if (s === 'CONFIRMED' || s === 'FEE_RELEASED') return 'success'
  if (s === 'DISPUTED' || s === 'GUARANTEE_BROKEN') return 'danger'
  if (s === 'CANCELLED') return 'neutral'
  return 'warning'
}
</script>

<template>
  <div class="fat">
    <header class="fat__header">
      <h1>Faturamento & Ganhos</h1>
    </header>

    <div class="fat__kpis">
      <UiKpiCard :icon="Wallet" label="A receber" :value="fmtBRL(stats?.aReceber)" :loading="pendingStats" />
      <UiKpiCard :icon="DollarSign" label="Recebido no ano" :value="fmtBRL(stats?.recebidoNoAno)" :loading="pendingStats" />
      <UiKpiCard :icon="Briefcase" label="Placements" :value="String(stats?.placements ?? 0)" :loading="pendingStats" />
      <UiKpiCard :icon="TrendingUp" label="Ticket médio de fee" :value="stats?.ticketMedioFee != null ? fmtBRL(stats.ticketMedioFee) : '—'" :loading="pendingStats" />
    </div>

    <UiCard class="fat__repasse">
      <span class="fat__repasse-label">Repasse interno a membros</span>
      <UiBadge variant="neutral">Em breve</UiBadge>
    </UiCard>

    <h2 class="fat__subtitle">Placements</h2>

    <div v-if="pendingPlacements" class="fat__skel">
      <div v-for="n in 3" :key="n" class="skeleton fat__skel-row" />
    </div>

    <UiEmptyState v-else-if="!ordered.length" title="Nenhum placement ainda" description="Contratações confirmadas do time aparecerão aqui, com fees e status de recebimento." />

    <div v-else class="fat__table-wrap">
      <table class="fat__table">
        <thead><tr><th>Vaga</th><th>Cliente</th><th>Responsável</th><th>Salário</th><th>Fee</th><th>Status</th><th>Data</th></tr></thead>
        <tbody>
          <tr v-for="p in ordered" :key="p.id">
            <td>{{ p.vagaTitle ?? '—' }}</td>
            <td>
              <span v-if="p.company" class="fat__cliente">
                <img v-if="p.company.logoUrl" :src="p.company.logoUrl" class="fat__cliente-logo" alt="">
                {{ p.company.name }}
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <span v-if="p.responsavel">
                {{ p.responsavel.firstName }} {{ p.responsavel.lastName }}
                <UiBadge v-if="p.responsavel.isExternalHunter" variant="outline">Hunter</UiBadge>
              </span>
              <span v-else>—</span>
            </td>
            <td>{{ fmtBRL(p.finalSalary) }}</td>
            <td>{{ p.feeAmount != null ? fmtBRL(p.feeAmount) : '—' }}</td>
            <td><UiBadge :variant="statusVariant(p.status)">{{ PLACEMENT_STATUS_LABEL[p.status] }}</UiBadge></td>
            <td>{{ fmtData(p.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.fat__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-5); }
.fat__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--sp-4); margin-bottom: var(--sp-4); }
.fat__repasse { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-6); }
.fat__repasse-label { font-size: var(--text-14); color: var(--ink-700); }
.fat__subtitle { font-size: var(--text-16); font-weight: 600; margin-bottom: var(--sp-3); }
.fat__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.fat__skel-row { height: 48px; border-radius: var(--radius-input); }
.fat__table-wrap { overflow-x: auto; }
.fat__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 780px; }
.fat__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.fat__table td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.fat__cliente { display: inline-flex; align-items: center; gap: var(--sp-2); }
.fat__cliente-logo { width: 20px; height: 20px; border-radius: var(--radius-full); object-fit: cover; }
</style>
