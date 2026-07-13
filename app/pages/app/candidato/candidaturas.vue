<script setup lang="ts">
// T-C04 — Minhas Candidaturas. Dados de GET /me/applications (enriquecido: snapshot+CV+empresa+stageHistory).
import type { MyApplication } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Minhas Candidaturas — Candidato' })

const api = useApi()
const toast = useToast()

const { data: applications, pending, refresh } = await useAsyncData('candidato-applications', () =>
  api.get<MyApplication[]>('/me/applications').catch(() => []))

function prettyStage(s: string | null) {
  if (!s) return '—'
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}
function isHired(app: MyApplication) {
  return !app.isRejected && (app.pipelineStage ?? '').toLowerCase().includes('contrat')
}
function stageVariant(app: MyApplication): 'danger' | 'success' | 'info' {
  if (app.isRejected) return 'danger'
  if (isHired(app)) return 'success'
  return 'info'
}
function stageLabel(app: MyApplication) {
  if (app.isRejected) return 'Não selecionado'
  if (isHired(app)) return 'Contratado 🎉'
  return prettyStage(app.pipelineStage)
}
function isFinalized(app: MyApplication) {
  return app.isRejected || isHired(app)
}

// ── Filtros ──────────────────────────────────────────────────────────────────
const statusFilter = ref<'todas' | 'ativas' | 'finalizadas'>('todas')
const search = ref('')
const filtered = computed(() => {
  let list = applications.value ?? []
  if (statusFilter.value === 'ativas') list = list.filter(a => !isFinalized(a))
  else if (statusFilter.value === 'finalizadas') list = list.filter(a => isFinalized(a))
  const s = search.value.trim().toLowerCase()
  if (s) list = list.filter(a => (a.vaga?.title ?? '').toLowerCase().includes(s))
  return list
})

const tabs = [
  { value: 'todas', label: 'Todas' },
  { value: 'ativas', label: 'Ativas' },
  { value: 'finalizadas', label: 'Finalizadas' },
]

// ── Retirar candidatura ──────────────────────────────────────────────────────
const confirmOpen = ref(false)
const withdrawing = ref(false)
const toWithdraw = ref<MyApplication | null>(null)
function askWithdraw(app: MyApplication) {
  toWithdraw.value = app
  confirmOpen.value = true
}
async function confirmWithdraw() {
  if (!toWithdraw.value) return
  withdrawing.value = true
  try {
    await api.del(`/applications/${toWithdraw.value.id}`)
    toast.success('Candidatura retirada.')
    confirmOpen.value = false
    refresh()
  }
  catch {
    toast.error('Não foi possível retirar a candidatura.')
  }
  finally {
    withdrawing.value = false
  }
}

// ── Drawer de detalhes ───────────────────────────────────────────────────────
const drawerOpen = ref(false)
const drawerApp = ref<MyApplication | null>(null)
function openDrawer(row: Record<string, unknown>) {
  drawerApp.value = row as unknown as MyApplication
  drawerOpen.value = true
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function asApp(row: Record<string, unknown>) {
  return row as unknown as MyApplication
}
</script>

<template>
  <div class="candidaturas">
    <header class="candidaturas__header">
      <h1>Minhas Candidaturas</h1>
    </header>

    <div class="candidaturas__filters">
      <UiTabs v-model="statusFilter" :tabs="tabs" />
      <UiInput v-model="search" placeholder="Buscar por título..." class="candidaturas__search" />
    </div>

    <UiTable
      :columns="[
        { key: 'vaga', label: 'Vaga' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Enviada em' },
        { key: 'updatedAt', label: 'Última atualização' },
        { key: 'actions', label: '', align: 'right' },
      ]"
      :rows="filtered as unknown as Record<string, unknown>[]"
      :loading="pending"
      clickable-rows
      empty-title="Nenhuma candidatura ainda"
      empty-description="Explore o Radar de Vagas para começar a se candidatar."
      class="candidaturas__table"
      @row-click="openDrawer"
    >
      <template #cell-vaga="{ row }">
        <div class="cell-vaga">
          <strong>{{ asApp(row).vaga?.title ?? 'Vaga removida' }}</strong>
          <span v-if="asApp(row).vaga?.company?.name" class="cell-vaga__company">
            {{ asApp(row).vaga?.company?.name }}
          </span>
        </div>
      </template>
      <template #cell-status="{ row }">
        <UiBadge :variant="stageVariant(asApp(row))">{{ stageLabel(asApp(row)) }}</UiBadge>
      </template>
      <template #cell-createdAt="{ row }">{{ fmtDate(asApp(row).createdAt) }}</template>
      <template #cell-updatedAt="{ row }">{{ fmtDate(asApp(row).updatedAt) }}</template>
      <template #cell-actions="{ row }">
        <div class="cell-actions" @click.stop>
          <NuxtLink v-if="asApp(row).vaga?.slug" :to="`/vaga/${asApp(row).vaga?.slug}`" class="cell-actions__link">
            Ver vaga
          </NuxtLink>
          <button class="cell-actions__link cell-actions__link--danger" @click="askWithdraw(asApp(row))">
            Retirar
          </button>
        </div>
      </template>
      <template #empty>
        <UiButton @click="navigateTo('/app/candidato/radar')">Explorar o Radar</UiButton>
      </template>
    </UiTable>

    <UiConfirmDialog
      :open="confirmOpen"
      title="Retirar candidatura?"
      description="Isso remove permanentemente sua candidatura a esta vaga."
      variant="danger"
      confirm-label="Retirar"
      :loading="withdrawing"
      @confirm="confirmWithdraw"
      @close="confirmOpen = false"
    />

    <UiDrawer :open="drawerOpen" title="Detalhes da candidatura" size="md" @close="drawerOpen = false">
      <template v-if="drawerApp">
        <section class="drawer-section">
          <h3>{{ drawerApp.vaga?.title ?? 'Vaga removida' }}</h3>
          <p v-if="drawerApp.vaga?.company?.name" class="text-secondary">{{ drawerApp.vaga.company.name }}</p>
          <UiBadge :variant="stageVariant(drawerApp)">{{ stageLabel(drawerApp) }}</UiBadge>
        </section>

        <section class="drawer-section">
          <h4>Dados enviados</h4>
          <p class="drawer-hint">Estes dados foram congelados no momento do envio e não mudam com seu perfil atual.</p>
          <dl class="snapshot">
            <dt>Nome</dt><dd>{{ drawerApp.snapshotFullName }}</dd>
            <dt>E-mail</dt><dd>{{ drawerApp.snapshotEmail }}</dd>
            <dt v-if="drawerApp.snapshotPhone">Telefone</dt><dd v-if="drawerApp.snapshotPhone">{{ drawerApp.snapshotPhone }}</dd>
            <dt v-if="drawerApp.snapshotLocation">Cidade</dt><dd v-if="drawerApp.snapshotLocation">{{ drawerApp.snapshotLocation }}</dd>
          </dl>
          <p v-if="drawerApp.message" class="drawer-message">"{{ drawerApp.message }}"</p>
        </section>

        <section v-if="drawerApp.cv" class="drawer-section">
          <h4>Currículo enviado</h4>
          <a v-if="drawerApp.cv.fileUrl" :href="drawerApp.cv.fileUrl" target="_blank" rel="noopener" class="drawer-cv-link">
            📄 {{ drawerApp.cv.label || 'Baixar currículo' }}
          </a>
        </section>

        <section class="drawer-section">
          <h4>Linha do tempo</h4>
          <ol class="timeline">
            <li v-for="(h, i) in drawerApp.stageHistory" :key="i" class="timeline__item">
              <div class="timeline__dot" />
              <div>
                <p class="timeline__stage">{{ prettyStage(h.stage) }}</p>
                <p class="timeline__meta">{{ fmtDate(h.enteredAt) }}</p>
              </div>
            </li>
          </ol>
        </section>
      </template>
    </UiDrawer>
  </div>
</template>

<style scoped>
.candidaturas__header { margin-bottom: var(--sp-6); }
.candidaturas__filters { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); margin-bottom: var(--sp-4); flex-wrap: wrap; }
.candidaturas__search { max-width: 280px; }
.cell-vaga { display: flex; flex-direction: column; }
.cell-vaga__company { font-size: var(--text-12); color: var(--ink-500); }
.cell-actions { display: flex; gap: var(--sp-3); justify-content: flex-end; }
.cell-actions__link { background: none; border: none; color: var(--brand-700); font-size: var(--text-13); font-weight: 600; cursor: pointer; text-decoration: none; }
.cell-actions__link--danger { color: var(--red-500); }

.drawer-section { margin-bottom: var(--sp-6); }
.drawer-section h3 { font-size: var(--text-18); margin-bottom: var(--sp-2); }
.drawer-section h4 { font-size: var(--text-14); color: var(--ink-500); margin-bottom: var(--sp-2); text-transform: uppercase; letter-spacing: 0.03em; }
.drawer-hint { font-size: var(--text-12); color: var(--ink-500); margin-bottom: var(--sp-3); }
.snapshot { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-1) var(--sp-4); font-size: var(--text-14); }
.snapshot dt { color: var(--ink-500); }
.snapshot dd { margin: 0; color: var(--ink-900); }
.drawer-message { margin-top: var(--sp-3); font-style: italic; color: var(--ink-700); }
.drawer-cv-link { color: var(--brand-700); font-weight: 600; text-decoration: none; }
.timeline { list-style: none; padding: 0; margin: 0; }
.timeline__item { position: relative; padding-left: var(--sp-6); padding-bottom: var(--sp-4); border-left: 2px solid var(--ink-100); }
.timeline__item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline__dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--brand-600); }
.timeline__stage { font-weight: 600; color: var(--ink-900); font-size: var(--text-14); }
.timeline__meta { color: var(--ink-500); font-size: var(--text-12); margin-top: 2px; }
</style>
