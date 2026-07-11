<script setup lang="ts">
// T-E03 — Minhas Vagas (workspace Empresa). Igual a T-H03 (hunter) + coluna
// "Hunters" (aceitos/máx, com dot âmbar quando há interesse pendente) —
// só aparece quando a vaga tem allowHunters=true.
import type { Vaga, PaginatedResult } from '~/types/vaga'
import { VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Minhas Vagas' })

const api = useApi()
const toast = useToast()

interface Usage { used: number, limit: number, cycleEnd: string }
const { data: usage, refresh: refreshUsage } = await useAsyncData('empresa-vagas-usage', () =>
  api.get<Usage>('/vagas/me/usage').catch(() => null))
const slots = computed(() => {
  const u = usage.value
  if (!u) return ''
  const base = u.limit === -1 ? `${u.used} (ilimitado)` : `${u.used}/${u.limit}`
  const renova = u.cycleEnd ? ` · renova em ${new Date(u.cycleEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''
  return `Publicações: ${base}${renova}`
})

const tab = ref<'PUBLISHED' | 'DRAFT' | 'CLOSED'>('PUBLISHED')
const tabs = [
  { value: 'PUBLISHED', label: 'Ativas' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'CLOSED', label: 'Encerradas' },
]

const { data: resp, pending, refresh } = await useAsyncData('empresa-vagas', () =>
  api.get<PaginatedResult<Vaga>>('/vagas/me', { status: tab.value, limit: 50 }).catch(() => null),
{ watch: [tab] })
const vagas = computed<Vaga[]>(() => resp.value?.data ?? [])

function dataPub(v: Vaga) {
  const base = v.publishedAt ?? v.createdAt
  return base ? new Date(base).toLocaleDateString('pt-BR') : '—'
}
function resumo(v: Vaga) {
  return [v.workMode ? VAGA_WORK_MODE_LABEL[v.workMode] : null, v.type ? VAGA_TYPE_LABEL[v.type] : null]
    .filter(Boolean).join(' · ')
}

// Ações com confirmação.
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

// Sugestão pós-publicar "abrir a hunters" — mostra um banner discreto para
// vagas ativas que ainda não aceitam hunters.
function sugerirHunters(v: Vaga) {
  return v.status === 'PUBLISHED' && !v.allowHunters
}
</script>

<template>
  <div class="mv">
    <header class="mv__header">
      <div>
        <h1>Minhas vagas</h1>
        <p v-if="slots" class="mv__slots">{{ slots }}</p>
      </div>
      <UiButton @click="navigateTo('/app/empresa/vagas/nova')">Nova vaga</UiButton>
    </header>

    <UiTabs v-model="tab" :tabs="tabs" class="mv__tabs" />

    <div v-if="pending" class="mv__skel">
      <div v-for="n in 4" :key="n" class="skeleton mv__skel-row" />
    </div>

    <div v-else-if="vagas.length" class="mv__table-wrap">
      <table class="mv__table">
        <thead>
          <tr><th>Vaga</th><th>Status</th><th>Candidatos</th><th>Hunters</th><th>Publicada</th><th></th></tr>
        </thead>
        <tbody>
          <template v-for="v in vagas" :key="v.id">
            <tr class="mv__row" @click="navigateTo(`/app/empresa/vagas/${v.id}`)">
              <td>
                <span class="mv__vaga-title">{{ v.title }}</span>
                <span v-if="resumo(v)" class="mv__vaga-sub">{{ resumo(v) }}</span>
              </td>
              <td>
                <UiBadge :variant="v.status === 'PUBLISHED' ? 'success' : v.status === 'DRAFT' ? 'neutral' : 'warning'">
                  {{ v.status === 'PUBLISHED' ? 'Publicada' : v.status === 'DRAFT' ? 'Rascunho' : 'Encerrada' }}
                </UiBadge>
              </td>
              <td>{{ v.applicationsCount ?? 0 }}</td>
              <td>
                <span v-if="v.allowHunters" class="mv__hunters">
                  {{ v.hunterInterestsAcceptedCount ?? 0 }}/{{ v.maxHunters }}
                  <span
                    v-if="(v.hunterInterestsPendingCount ?? 0) > 0"
                    class="mv__hunters-dot"
                    :title="`${v.hunterInterestsPendingCount} pendente(s)`"
                  />
                </span>
                <span v-else class="mv__hunters-off">—</span>
              </td>
              <td>{{ dataPub(v) }}</td>
              <td class="mv__actions" @click.stop>
                <details class="menu">
                  <summary aria-label="Ações">⋯</summary>
                  <div class="menu__list">
                    <button @click="navigateTo(`/app/empresa/vagas/${v.id}`)">Ver pipeline</button>
                    <button @click="navigateTo(`/app/empresa/vagas/${v.id}/editar`)">Editar</button>
                    <button v-if="v.status === 'PUBLISHED'" @click="pending2 = { kind: 'encerrar', vaga: v }">Encerrar</button>
                    <button class="menu__danger" @click="pending2 = { kind: 'excluir', vaga: v }">Excluir</button>
                  </div>
                </details>
              </td>
            </tr>
            <tr v-if="sugerirHunters(v)" class="mv__hint-row">
              <td colspan="6">
                <div class="mv__hint" @click.stop>
                  <span>Quer acelerar essa vaga? Abra para hunters parceiros buscarem candidatos.</span>
                  <UiButton size="sm" variant="secondary" @click="navigateTo(`/app/empresa/vagas/${v.id}/editar`)">Abrir a hunters</UiButton>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <UiEmptyState
      v-else
      :title="tab === 'DRAFT' ? 'Nenhum rascunho' : tab === 'CLOSED' ? 'Nenhuma vaga encerrada' : 'Nenhuma vaga ativa'"
      description="Crie uma vaga para começar a receber candidatos."
    >
      <template #action>
        <UiButton @click="navigateTo('/app/empresa/vagas/nova')">Nova vaga</UiButton>
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
.mv__tabs { margin: var(--sp-5) 0; }
.mv__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.mv__skel-row { height: 56px; border-radius: var(--radius-input); }
.mv__table-wrap { overflow-x: auto; }
.mv__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 720px; }
.mv__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.mv__row { cursor: pointer; }
.mv__row:hover { background: var(--ink-100); }
.mv__row td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.mv__vaga-title { display: block; font-weight: 600; color: var(--ink-900); }
.mv__vaga-sub { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.mv__hunters { display: inline-flex; align-items: center; gap: var(--sp-2); font-variant-numeric: tabular-nums; }
.mv__hunters-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--amber-500); flex-shrink: 0; }
.mv__hunters-off { color: var(--ink-300); }
.mv__actions { text-align: right; }
.mv__hint-row td { padding: 0 var(--sp-3) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.mv__hint { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); background: var(--amber-100); color: #92400E; border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4); font-size: var(--text-13); cursor: default; }
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
}
</style>
