<script setup lang="ts">
// T-T03 — Vagas do Time (Workspace Consultoria). Como T-H03/T-E03, com 3
// colunas extras: Cliente (logo+nome), Responsável (select inline p/
// OWNER/MANAGER reatribuírem — RN-VAGA-16) e Origem (criado por). Filtros:
// cliente, responsável, status.
import type { Vaga, PaginatedResult } from '~/types/vaga'
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL } from '~/types/vaga'
import type { Company, TeamMember } from '~/types/team'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Vagas do Time' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()

interface Usage { used: number, limit: number, cycleEnd: string }
const { data: usage, refresh: refreshUsage } = await useAsyncData('consultoria-vagas-usage', () =>
  api.get<Usage>('/vagas/me/usage').catch(() => null))
const slots = computed(() => {
  const u = usage.value
  if (!u) return ''
  const base = u.limit === -1 ? `${u.used} (ilimitado)` : `${u.used}/${u.limit}`
  const renova = u.cycleEnd ? ` · renova em ${new Date(u.cycleEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''
  return `Slots do time: ${base}${renova}`
})

const { data: members } = await useAsyncData('consultoria-vagas-members', () =>
  api.get<TeamMember[]>('/me/team/members').catch(() => []))
const memberOptions = computed(() => [
  { value: '', label: 'Todos os responsáveis' },
  ...(members.value ?? [])
    .filter(m => m.userId)
    .map(m => ({ value: m.userId as string, label: `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || (m.invitedEmail ?? 'Membro') })),
])
const memberNameById = computed(() => {
  const map = new Map<string, string>()
  for (const m of members.value ?? []) {
    if (m.userId) map.set(m.userId, `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Membro')
  }
  return map
})

const { data: companies } = await useAsyncData('consultoria-vagas-companies', () =>
  api.get<Company[]>('/companies').catch(() => []))
const companyOptions = computed(() => [
  { value: '', label: 'Todos os clientes' },
  ...(companies.value ?? []).map(c => ({ value: c.id, label: c.name })),
])

const tab = ref<'PUBLISHED' | 'DRAFT' | 'CLOSED'>('PUBLISHED')
const tabs = [
  { value: 'PUBLISHED', label: 'Ativas' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'CLOSED', label: 'Encerradas' },
]
const filterCompanyId = ref('')
const filterAssignedToId = ref('')

const { data: resp, pending, refresh } = await useAsyncData('consultoria-vagas', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/me', {
    status: tab.value,
    limit: 50,
    companyId: filterCompanyId.value || undefined,
    assignedToId: filterAssignedToId.value || undefined,
  }).catch(() => null),
{ watch: [tab, filterCompanyId, filterAssignedToId] })
const vagas = computed<Vaga[]>(() => resp.value?.data ?? [])

function dataPub(v: Vaga) {
  const base = v.publishedAt ?? v.createdAt
  return base ? new Date(base).toLocaleDateString('pt-BR') : '—'
}
function resumo(v: Vaga) {
  return [v.workMode ? VAGA_WORK_MODE_LABEL[v.workMode] : null, v.type ? VAGA_TYPE_LABEL[v.type] : null]
    .filter(Boolean).join(' · ')
}
function origemLabel(v: Vaga) {
  return v.assignedTo?.id === auth.user?.id || !v.assignedTo ? 'Time' : memberNameById.value.get(v.assignedTo.id) ?? 'Time'
}

// Reatribuição inline de Responsável.
const reassigning = ref<string | null>(null)
async function reassign(v: Vaga, userId: string | null) {
  reassigning.value = v.id
  try {
    await api.patch(`/vagas/${v.id}/assign`, { userId })
    await refresh()
    toast.success('Responsável atualizado.')
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível reatribuir a vaga.')
  }
  finally {
    reassigning.value = null
  }
}

// Ações com confirmação (igual Empresa).
const pending2 = ref<{ kind: 'encerrar' | 'excluir', vaga: Vaga } | null>(null)
const acting = ref(false)
const confirmTitle = computed(() => pending2.value?.kind === 'excluir' ? 'Excluir vaga?' : 'Encerrar vaga?')
const confirmDesc = computed(() => pending2.value?.kind === 'excluir'
  ? `"${pending2.value?.vaga.title}" será removida. Esta ação não pode ser desfeita.`
  : `"${pending2.value?.vaga.title}" deixará de aparecer publicamente. O slot já consumido não é devolvido.`)

async function doAction() {
  if (!pending2.value) return
  acting.value = true
  const { kind, vaga } = pending2.value
  try {
    if (kind === 'excluir') await api.del(`/vagas/${vaga.id}`)
    else await api.post(`/vagas/${vaga.id}/unpublish`)
    toast.success(kind === 'excluir' ? 'Vaga excluída.' : 'Vaga encerrada.')
    pending2.value = null
    await Promise.all([refresh(), refreshUsage()])
  }
  catch {
    toast.error('Não foi possível concluir a ação.')
  }
  finally {
    acting.value = false
  }
}
</script>

<template>
  <div class="mv">
    <header class="mv__header">
      <div>
        <h1>Vagas do time</h1>
        <p v-if="slots" class="mv__slots">{{ slots }}</p>
      </div>
      <UiButton @click="navigateTo('/app/consultoria/vagas/nova')">Nova vaga</UiButton>
    </header>

    <UiTabs v-model="tab" :tabs="tabs" class="mv__tabs" />

    <div class="mv__filters">
      <UiSelect v-model="filterCompanyId" :options="companyOptions" placeholder="Cliente" />
      <UiSelect v-model="filterAssignedToId" :options="memberOptions" placeholder="Responsável" />
    </div>

    <div v-if="pending" class="mv__skel">
      <div v-for="n in 4" :key="n" class="skeleton mv__skel-row" />
    </div>

    <div v-else-if="vagas.length" class="mv__table-wrap">
      <table class="mv__table">
        <thead>
          <tr><th>Vaga</th><th>Cliente</th><th>Responsável</th><th>Origem</th><th>Status</th><th>Candidatos</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="v in vagas" :key="v.id" class="mv__row" @click="navigateTo(`/app/consultoria/vagas/${v.id}`)">
            <td>
              <span class="mv__vaga-title">{{ v.title }}</span>
              <span v-if="resumo(v)" class="mv__vaga-sub">{{ resumo(v) }}</span>
            </td>
            <td>
              <span v-if="v.company" class="mv__cliente">
                <img v-if="v.company.logoUrl" :src="v.company.logoUrl" class="mv__cliente-logo" alt="">
                {{ v.company.name }}
              </span>
              <span v-else class="mv__hunters-off">—</span>
            </td>
            <td @click.stop>
              <UiSelect
                :model-value="v.assignedToId ?? ''"
                :options="memberOptions"
                :disabled="reassigning === v.id"
                @update:model-value="(uid) => reassign(v, uid || null)"
              />
            </td>
            <td>{{ origemLabel(v) }}</td>
            <td>
              <UiBadge :variant="v.status === 'PUBLISHED' ? 'success' : v.status === 'DRAFT' ? 'neutral' : 'warning'">
                {{ v.status === 'PUBLISHED' ? 'Publicada' : v.status === 'DRAFT' ? 'Rascunho' : 'Encerrada' }}
              </UiBadge>
              <span class="mv__vaga-sub">{{ dataPub(v) }}</span>
            </td>
            <td>{{ v.applicationsCount ?? 0 }}</td>
            <td class="mv__actions" @click.stop>
              <details class="menu">
                <summary aria-label="Ações">⋯</summary>
                <div class="menu__list">
                  <button @click="navigateTo(`/app/consultoria/vagas/${v.id}`)">Ver pipeline</button>
                  <button @click="navigateTo(`/app/consultoria/vagas/${v.id}/editar`)">Editar</button>
                  <button v-if="v.status === 'PUBLISHED'" @click="pending2 = { kind: 'encerrar', vaga: v }">Encerrar</button>
                  <button class="menu__danger" @click="pending2 = { kind: 'excluir', vaga: v }">Excluir</button>
                </div>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiEmptyState
      v-else
      :title="tab === 'DRAFT' ? 'Nenhum rascunho' : tab === 'CLOSED' ? 'Nenhuma vaga encerrada' : 'Nenhuma vaga ativa'"
      description="Crie uma vaga para começar a receber candidatos."
    >
      <template #action>
        <UiButton @click="navigateTo('/app/consultoria/vagas/nova')">Nova vaga</UiButton>
      </template>
    </UiEmptyState>

    <UiConfirmDialog
      :open="!!pending2"
      :title="confirmTitle"
      :description="confirmDesc"
      :confirm-label="pending2?.kind === 'excluir' ? 'Excluir' : 'Encerrar'"
      :variant="pending2?.kind === 'excluir' ? 'danger' : 'default'"
      :loading="acting"
      @confirm="doAction"
      @cancel="pending2 = null"
      @close="pending2 = null"
    />
  </div>
</template>

<style scoped>
.mv__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); }
.mv__header h1 { font-size: var(--text-22); }
.mv__slots { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); }
.mv__tabs { margin: var(--sp-5) 0 var(--sp-4); }
.mv__filters { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); max-width: 480px; }
.mv__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.mv__skel-row { height: 56px; border-radius: var(--radius-input); }
.mv__table-wrap { overflow-x: auto; }
.mv__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 920px; }
.mv__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.mv__row { cursor: pointer; }
.mv__row:hover { background: var(--ink-100); }
.mv__row td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; min-width: 160px; }
.mv__vaga-title { display: block; font-weight: 600; color: var(--ink-900); }
.mv__vaga-sub { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.mv__cliente { display: inline-flex; align-items: center; gap: var(--sp-2); font-size: var(--text-13); }
.mv__cliente-logo { width: 20px; height: 20px; border-radius: var(--radius-full); object-fit: cover; }
.mv__hunters-off { color: var(--ink-300); }
.mv__actions { text-align: right; }
.menu { position: relative; display: inline-block; }
.menu summary { list-style: none; cursor: pointer; padding: 0 var(--sp-2); font-size: var(--text-18); color: var(--ink-500); border-radius: var(--radius-input); }
.menu summary::-webkit-details-marker { display: none; }
.menu summary:hover { background: var(--ink-300); }
.menu__list { position: absolute; right: 0; top: 100%; z-index: 10; background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input); box-shadow: var(--shadow-md); min-width: 160px; display: flex; flex-direction: column; padding: var(--sp-1); }
.menu__list button { text-align: left; background: none; border: none; padding: var(--sp-2) var(--sp-3); font-size: var(--text-14); color: var(--ink-700); cursor: pointer; border-radius: var(--radius-input); }
.menu__list button:hover { background: var(--ink-100); }
.menu__danger { color: var(--red-500) !important; }
@media (max-width: 768px) {
  .mv__header { flex-direction: column; }
  .mv__filters { flex-direction: column; max-width: none; }
}
</style>
