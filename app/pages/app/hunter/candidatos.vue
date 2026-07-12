<script setup lang="ts">
// T-H08 — Meus Candidatos (talent pool/CRM do hunter).
// Dados reais: GET /hunter-candidates + GET /hunter-candidates/submissions (B3).
import type { HunterCandidate, HunterSubmission, ConsentRequestResult } from '~/types/hunterCandidate'
import { CONSENT_LABEL, CONSENT_VARIANT } from '~/types/hunterCandidate'
import { PLACEMENT_STATUS_LABEL, placementStatusVariant } from '~/types/placement'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Meus Candidatos' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()
// B8 — submissão real só funciona com perfil verificado; avisa aqui pra não
// só descobrir o bloqueio dentro do modal de submissão.
const isVerified = computed(() => auth.user?.verificationStatus === 'APPROVED')

const { data: list, pending, refresh } = await useAsyncData('hunter-candidates', () =>
  api.get<HunterCandidate[]>('/hunter-candidates').catch(() => []))
const { data: subs, refresh: refreshSubs } = await useAsyncData('hunter-submissions', () =>
  api.get<HunterSubmission[]>('/hunter-candidates/submissions').catch(() => []))

const candidates = computed<HunterCandidate[]>(() => list.value ?? [])
const submissions = computed<HunterSubmission[]>(() => subs.value ?? [])

// nº de processos por candidato
const processCount = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const s of submissions.value) {
    if (s.hunterCandidateId) m[s.hunterCandidateId] = (m[s.hunterCandidateId] ?? 0) + 1
  }
  return m
})

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return candidates.value
  return candidates.value.filter(c =>
    [c.fullName, c.email, c.headline, c.location].filter(Boolean).some(v => v!.toLowerCase().includes(q)))
})

// Drawer de detalhe
const selected = ref<HunterCandidate | null>(null)
const selectedSubs = computed(() =>
  selected.value ? submissions.value.filter(s => s.hunterCandidateId === selected.value!.id) : [])

// Modais
const showAdd = ref(false)
const submitFor = ref<HunterCandidate | null>(null)

// Menu de ações (dropdown teleportado p/ body — evita clipping do overflow da tabela)
const menuFor = ref<HunterCandidate | null>(null)
const menuPos = ref({ top: 0, left: 0 })

// Excluir
const toDelete = ref<HunterCandidate | null>(null)
const deleting = ref(false)

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

async function requestConsent(c: HunterCandidate) {
  try {
    const r = await api.post<ConsentRequestResult>(`/hunter-candidates/${c.id}/request-consent`)
    toast.success('Pedido de autorização enviado ao candidato.')
    // Em dev o backend devolve o token (e-mail é stub — B14).
    if (r.consentToken) console.info('[dev] consentToken:', r.consentToken)
    await refresh()
    if (selected.value?.id === c.id) selected.value = { ...c, consentStatus: r.status }
  }
  catch {
    toast.error('Não foi possível enviar o pedido.')
  }
}

async function doDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await api.del(`/hunter-candidates/${toDelete.value.id}`)
    toast.success('Candidato removido.')
    if (selected.value?.id === toDelete.value.id) selected.value = null
    toDelete.value = null
    await Promise.all([refresh(), refreshSubs()])
  }
  catch {
    toast.error('Não foi possível remover.')
  }
  finally {
    deleting.value = false
  }
}

async function onAdded() {
  showAdd.value = false
  await refresh()
}

function openSubmit(c: HunterCandidate | null) {
  if (!c) return
  submitFor.value = c
  selected.value = null // fecha o drawer para o modal ficar em primeiro plano
}

async function onSubmitted() {
  submitFor.value = null
  toast.success('Candidato submetido! A empresa foi notificada.')
  await Promise.all([refresh(), refreshSubs()])
}

function origin(c: HunterCandidate) {
  return c.linkedUserId ? 'Usuário VitrinePro' : 'Cadastrado por mim'
}

function toggleMenu(c: HunterCandidate, ev: MouseEvent) {
  if (menuFor.value?.id === c.id) {
    menuFor.value = null
    return
  }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  menuPos.value = { top: r.bottom + 4, left: Math.max(8, r.right - 190) }
  menuFor.value = c
}
function closeMenu() {
  menuFor.value = null
}
function menuAction(kind: 'perfil' | 'submeter' | 'consent' | 'remover') {
  const c = menuFor.value
  menuFor.value = null
  if (!c) return
  if (kind === 'perfil') selected.value = c
  else if (kind === 'submeter') openSubmit(c)
  else if (kind === 'consent') requestConsent(c)
  else if (kind === 'remover') toDelete.value = c
}
// Fecha o menu ao rolar (posição é fixa) ou apertar Esc
onKeyStroke('Escape', closeMenu)
useEventListener(window, 'scroll', closeMenu, true)

// ── P2 — confirmação bilateral do placement (design-spec/06 §P) ──────────────
// Só existe quando a submissão desse hunter foi marcada como contratada pela
// empresa (application.placement, vindo agora de listSubmissions()).
const confirmingId = ref<string | null>(null)
const contestingId = ref<string | null>(null)
const contestReason = ref('')
const sendingContest = ref(false)
const expandedTimelineId = ref<string | null>(null)

async function confirmarPlacement(s: HunterSubmission) {
  if (!s.placement) return
  confirmingId.value = s.placement.id
  try {
    await api.post(`/placements/${s.placement.id}/confirm`)
    toast.success('Placement confirmado! A garantia de 90 dias começou a contar.')
    s.placement = { ...s.placement, status: 'CONFIRMED' }
    await refreshSubs()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível confirmar o placement.')
  }
  finally { confirmingId.value = null }
}

function abrirContestacao(s: HunterSubmission) {
  contestingId.value = s.placement?.id ?? null
  contestReason.value = ''
}

async function enviarContestacao(s: HunterSubmission) {
  if (!s.placement || !contestReason.value.trim()) return
  sendingContest.value = true
  try {
    await api.post(`/placements/${s.placement.id}/contest`, { reason: contestReason.value.trim() })
    toast.info('Contestação enviada. Um administrador vai revisar.')
    s.placement = { ...s.placement, status: 'DISPUTED' }
    contestingId.value = null
    await refreshSubs()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível enviar a contestação.')
  }
  finally { sendingContest.value = false }
}
</script>

<template>
  <div class="cand">
    <header class="cand__header">
      <div>
        <h1>Meus candidatos</h1>
        <p class="cand__sub">Seu banco de talentos. Submeta candidatos às vagas do marketplace.</p>
      </div>
      <UiButton @click="showAdd = true">＋ Adicionar candidato</UiButton>
    </header>

    <div v-if="!isVerified" class="cand__gate-banner">
      <span>Verifique seu perfil para poder submeter candidatos a vagas com fee.</span>
      <UiButton size="sm" variant="secondary" @click="navigateTo('/app/hunter/perfil')">Verificar perfil</UiButton>
    </div>

    <div class="cand__toolbar">
      <UiInput v-model="search" placeholder="Buscar por nome, e-mail, cargo ou cidade" class="cand__search" />
    </div>

    <div v-if="pending" class="cand__skel">
      <div v-for="n in 4" :key="n" class="skeleton cand__skel-row" />
    </div>

    <div v-else-if="filtered.length" class="cand__table-wrap">
      <table class="cand__table">
        <thead>
          <tr><th>Candidato</th><th>Origem</th><th>Consentimento</th><th>Em processos</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id" class="cand__row" @click="selected = c">
            <td>
              <div class="cand__person">
                <span class="cand__avatar">{{ initials(c.fullName) }}</span>
                <span class="cand__person-txt">
                  <span class="cand__name">{{ c.fullName }}</span>
                  <span v-if="c.headline" class="cand__headline">{{ c.headline }}</span>
                </span>
              </div>
            </td>
            <td class="cand__muted">{{ origin(c) }}</td>
            <td>
              <UiBadge :variant="CONSENT_VARIANT[c.consentStatus]">{{ CONSENT_LABEL[c.consentStatus] }}</UiBadge>
            </td>
            <td>{{ processCount[c.id] ?? 0 }}</td>
            <td class="cand__actions" @click.stop>
              <button class="cand__menu-btn" aria-label="Ações" @click="toggleMenu(c, $event)">⋯</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiEmptyState
      v-else
      :title="search ? 'Nenhum candidato encontrado' : 'Seu banco está vazio'"
      description="Adicione candidatos para submetê-los às vagas do marketplace."
    >
      <template #action>
        <UiButton @click="showAdd = true">＋ Adicionar candidato</UiButton>
      </template>
    </UiEmptyState>

    <!-- Drawer de detalhe -->
    <UiDrawer :open="!!selected" :title="selected?.fullName || 'Candidato'" size="lg" @close="selected = null">
      <div v-if="selected" class="detail">
        <div class="detail__top">
          <span class="cand__avatar cand__avatar--lg">{{ initials(selected.fullName) }}</span>
          <div>
            <p v-if="selected.headline" class="detail__headline">{{ selected.headline }}</p>
            <UiBadge :variant="CONSENT_VARIANT[selected.consentStatus]">
              LGPD: {{ CONSENT_LABEL[selected.consentStatus] }}
            </UiBadge>
          </div>
        </div>

        <dl class="detail__grid">
          <div><dt>E-mail</dt><dd>{{ selected.email }}</dd></div>
          <div v-if="selected.phone"><dt>Telefone</dt><dd>{{ selected.phone }}</dd></div>
          <div v-if="selected.location"><dt>Cidade</dt><dd>{{ selected.location }}</dd></div>
          <div v-if="selected.linkedinUrl">
            <dt>LinkedIn</dt><dd><a :href="selected.linkedinUrl" target="_blank" rel="noopener">Perfil</a></dd>
          </div>
        </dl>

        <div v-if="selected.notes" class="detail__notes">
          <h3>Notas privadas</h3>
          <p>{{ selected.notes }}</p>
        </div>

        <div v-if="selected.consentStatus !== 'GRANTED'" class="detail__consent">
          <p>É preciso o consentimento do candidato (LGPD) antes de submeter.</p>
          <UiButton variant="secondary" size="sm" @click="requestConsent(selected)">
            Enviar pedido de autorização
          </UiButton>
        </div>

        <div class="detail__history">
          <h3>Histórico de processos</h3>
          <ul v-if="selectedSubs.length" class="detail__proc">
            <li v-for="s in selectedSubs" :key="s.id" class="detail__proc-item">
              <div class="detail__proc-row">
                <span>{{ s.vaga?.title || 'Vaga' }}</span>
                <UiBadge v-if="s.placement" :variant="placementStatusVariant(s.placement.status)">
                  {{ PLACEMENT_STATUS_LABEL[s.placement.status] }}
                </UiBadge>
                <UiBadge v-else :variant="s.isRejected ? 'danger' : 'info'">
                  {{ s.isRejected ? 'Recusado' : s.pipelineStage }}
                </UiBadge>
              </div>

              <!-- P2 — confirmação bilateral (só quando aguardando o hunter) -->
              <div v-if="s.placement?.status === 'HIRED'" class="detail__placement-actions">
                <p class="cand__muted">
                  Contratação registrada. Confirme para liberar a garantia de 90 dias — se você não
                  responder, o placement é confirmado automaticamente em até 7 dias.
                </p>
                <div class="detail__placement-btns">
                  <UiButton size="sm" :loading="confirmingId === s.placement.id" @click="confirmarPlacement(s)">Confirmar</UiButton>
                  <UiButton size="sm" variant="secondary" @click="abrirContestacao(s)">Contestar</UiButton>
                </div>
                <div v-if="contestingId === s.placement.id" class="detail__contest">
                  <textarea v-model="contestReason" rows="3" placeholder="Motivo da contestação..." class="detail__textarea" />
                  <div class="detail__placement-btns">
                    <UiButton size="sm" variant="ghost" @click="contestingId = null">Cancelar</UiButton>
                    <UiButton size="sm" variant="danger" :loading="sendingContest" :disabled="!contestReason.trim()" @click="enviarContestacao(s)">Enviar contestação</UiButton>
                  </div>
                </div>
              </div>

              <div v-else-if="s.placement" class="detail__placement-actions">
                <UiButton size="sm" variant="ghost" @click="expandedTimelineId = expandedTimelineId === s.placement.id ? null : s.placement.id">
                  {{ expandedTimelineId === s.placement.id ? 'Ocultar linha do tempo' : 'Ver linha do tempo' }}
                </UiButton>
                <PlacementTimeline v-if="expandedTimelineId === s.placement.id" :placement-id="s.placement.id" />
              </div>
            </li>
          </ul>
          <p v-else class="cand__muted">Ainda não foi submetido a nenhuma vaga.</p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="toDelete = selected">Remover</UiButton>
        <UiButton :disabled="!selected" @click="openSubmit(selected)">Submeter a uma vaga</UiButton>
      </template>
    </UiDrawer>

    <!-- Menu de ações teleportado (não é clipado pelo overflow da tabela) -->
    <Teleport to="body">
      <div v-if="menuFor" class="cand-menu-backdrop" @click="closeMenu">
        <div class="cand-menu" :style="{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }" @click.stop>
          <button @click="menuAction('perfil')">Ver perfil</button>
          <button @click="menuAction('submeter')">Submeter a uma vaga</button>
          <button v-if="menuFor.consentStatus !== 'GRANTED'" @click="menuAction('consent')">Pedir autorização</button>
          <button class="cand-menu__danger" @click="menuAction('remover')">Remover</button>
        </div>
      </div>
    </Teleport>

    <HunterAddCandidateModal :open="showAdd" @close="showAdd = false" @added="onAdded" />

    <HunterSubmitCandidateModal
      :candidate="submitFor"
      @close="submitFor = null"
      @request-consent="requestConsent"
      @submitted="onSubmitted"
    />

    <UiConfirmDialog
      :open="!!toDelete"
      title="Remover candidato?"
      :description="`“${toDelete?.fullName}” será removido do seu banco. As submissões já feitas permanecem.`"
      confirm-label="Remover"
      variant="danger"
      :loading="deleting"
      @confirm="doDelete"
      @cancel="toDelete = null"
      @close="toDelete = null"
    />
  </div>
</template>

<style scoped>
.cand__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); }
.cand__header h1 { font-size: var(--text-22); }
.cand__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); max-width: 46ch; }
.cand__gate-banner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); background: var(--amber-100); border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4); margin-top: var(--sp-4); font-size: var(--text-13); color: var(--ink-700); }
.cand__toolbar { margin: var(--sp-5) 0 var(--sp-4); }
.cand__search { max-width: 420px; }
.cand__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.cand__skel-row { height: 60px; border-radius: var(--radius-input); }
.cand__table-wrap { overflow-x: auto; }
.cand__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 680px; }
.cand__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.cand__row { cursor: pointer; }
.cand__row:hover { background: var(--ink-100); }
.cand__row td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.cand__person { display: flex; align-items: center; gap: var(--sp-3); }
.cand__avatar { width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--brand-100); color: var(--brand-700); display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: var(--text-13); flex-shrink: 0; }
.cand__avatar--lg { width: 56px; height: 56px; font-size: var(--text-16); }
.cand__person-txt { display: flex; flex-direction: column; }
.cand__name { font-weight: 600; color: var(--ink-900); }
.cand__headline { font-size: var(--text-12); color: var(--ink-500); }
.cand__muted { color: var(--ink-500); }
.cand__actions { text-align: right; }
.cand__menu-btn { background: none; border: none; cursor: pointer; padding: 0 var(--sp-2); font-size: var(--text-18); color: var(--ink-500); border-radius: var(--radius-input); line-height: 1.4; }
.cand__menu-btn:hover { background: var(--ink-300); }
.cand-menu-backdrop { position: fixed; inset: 0; z-index: 50; }
.cand-menu { position: fixed; z-index: 51; background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input); box-shadow: var(--shadow-md); min-width: 190px; display: flex; flex-direction: column; padding: var(--sp-1); }
.cand-menu button { text-align: left; background: none; border: none; padding: var(--sp-2) var(--sp-3); font-size: var(--text-14); color: var(--ink-700); cursor: pointer; border-radius: var(--radius-input); }
.cand-menu button:hover { background: var(--ink-100); }
.cand-menu__danger { color: var(--red-500) !important; }

.detail { display: flex; flex-direction: column; gap: var(--sp-5); }
.detail__top { display: flex; align-items: center; gap: var(--sp-3); }
.detail__headline { font-weight: 600; margin-bottom: var(--sp-1); }
.detail__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); }
.detail__grid dt { font-size: var(--text-12); color: var(--ink-500); }
.detail__grid dd { font-size: var(--text-14); color: var(--ink-900); }
.detail__notes h3, .detail__history h3 { font-size: var(--text-14); margin-bottom: var(--sp-2); }
.detail__notes p { font-size: var(--text-14); color: var(--ink-700); white-space: pre-wrap; }
.detail__consent { background: var(--amber-50, var(--ink-100)); border: 1px solid var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); font-size: var(--text-13); }
.detail__proc { list-style: none; display: flex; flex-direction: column; gap: var(--sp-2); }
.detail__proc-item { display: flex; flex-direction: column; gap: var(--sp-2); font-size: var(--text-14); padding: var(--sp-3) 0; border-bottom: 1px solid var(--ink-100); }
.detail__proc-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.detail__placement-actions { display: flex; flex-direction: column; gap: var(--sp-2); background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); }
.detail__placement-btns { display: flex; gap: var(--sp-2); }
.detail__contest { display: flex; flex-direction: column; gap: var(--sp-2); }
.detail__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.detail__textarea:focus { outline: none; border-color: var(--brand-600); }
@media (max-width: 768px) {
  .cand__header { flex-direction: column; }
  .detail__grid { grid-template-columns: 1fr; }
}
</style>
