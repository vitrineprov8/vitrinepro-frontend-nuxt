<script setup lang="ts">
// Conta & Transversais (design-spec 06 §C) — acessível pelo avatar-menu de
// qualquer persona. "Dados de acesso" (senha + sessões ativas, B26),
// "Indicações" (M4) e "Privacidade" (exportar dados/excluir conta, B26). A
// tab "Assinatura" (M1) fica de fora — depende do gateway de pagamento real
// (B11, não construído). "Notificações" também não entrou aqui porque cada
// workspace já tem sua própria página de Configurações com a matriz
// sino/e-mail (ver empresa/consultoria config.vue) — duplicar uma 3ª cópia
// transversal não foi pedido.
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Minha Conta' })

// Página transversal: não é dona de nenhum workspace-nav — mantém a sidebar
// do workspace de onde o usuário veio (não zera `nav`), só troca o
// breadcrumb do topo pra deixar claro onde ele está.
useState<string>('workspace-label').value = 'Conta'

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const section = ref<'dados' | 'indicacoes' | 'privacidade'>('dados')
const sections = [
  { value: 'dados' as const, label: 'Dados de acesso' },
  { value: 'indicacoes' as const, label: 'Indicações' },
  { value: 'privacidade' as const, label: 'Privacidade' },
]

// ── Dados de acesso — e-mail + reenvio de verificação ───────────────────────
const resending = ref(false)
async function reenviarVerificacao() {
  resending.value = true
  try {
    await api.post('/auth/resend-verification')
    toast.success('E-mail de confirmação reenviado.')
  }
  catch {
    toast.error('Não foi possível reenviar. Tente novamente.')
  }
  finally {
    resending.value = false
  }
}

// ── Dados de acesso — trocar senha ──────────────────────────────────────────
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordError = ref('')

async function trocarSenha() {
  passwordError.value = ''
  if (newPassword.value.length < 8) {
    passwordError.value = 'A nova senha precisa ter pelo menos 8 caracteres.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'As senhas não coincidem.'
    return
  }
  changingPassword.value = true
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    toast.success('Senha alterada com sucesso.')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  catch (e) {
    passwordError.value = (e as { message?: string })?.message ?? 'Não foi possível trocar a senha. Confira a senha atual.'
  }
  finally {
    changingPassword.value = false
  }
}

// ── Dados de acesso — sessões ativas (B26) ──────────────────────────────────
interface SessionItem {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastSeenAt: string | null
  current: boolean
}

const { data: sessions, pending: sessionsPending, refresh: refreshSessions } = await useAsyncData('conta-sessoes', () =>
  api.get<SessionItem[]>('/me/sessions').catch(() => []))

const revokingId = ref<string | null>(null)
async function revogarSessao(id: string) {
  if (!window.confirm('Encerrar esta sessão? O dispositivo vai precisar fazer login novamente.')) return
  revokingId.value = id
  try {
    await api.del(`/me/sessions/${id}`)
    toast.success('Sessão encerrada.')
    await refreshSessions()
  }
  catch {
    toast.error('Não foi possível encerrar a sessão.')
  }
  finally {
    revokingId.value = null
  }
}

function fmtDataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

/** Extração bem simples de "dispositivo/navegador" a partir do User-Agent — não precisa ser perfeita, só legível. */
function formatarDispositivo(ua: string | null) {
  if (!ua) return 'Dispositivo desconhecido'
  const isMobile = /Mobile|Android|iPhone/.test(ua)
  let os = 'Desconhecido'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  let browser = 'Navegador'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  return `${browser} · ${os}${isMobile ? ' (mobile)' : ''}`
}

// ── Privacidade (B26) — exportar dados LGPD ─────────────────────────────────
const exporting = ref(false)
async function exportarDados() {
  exporting.value = true
  try {
    const data = await api.get('/me/account/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meus-dados-vitrinepro-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado.')
  }
  catch {
    toast.error('Não foi possível exportar seus dados. Tente novamente.')
  }
  finally {
    exporting.value = false
  }
}

// ── Privacidade (B26) — excluir conta ───────────────────────────────────────
const showDeleteModal = ref(false)
const deleteEmailInput = ref('')
const deleting = ref(false)
const deleteError = ref('')

const canConfirmDelete = computed(() =>
  !!auth.user?.email && deleteEmailInput.value.trim().toLowerCase() === auth.user.email.trim().toLowerCase())

function abrirModalExclusao() {
  deleteEmailInput.value = ''
  deleteError.value = ''
  showDeleteModal.value = true
}

async function confirmarExclusao() {
  if (!canConfirmDelete.value) return
  deleteError.value = ''
  deleting.value = true
  try {
    await api.del('/me/account', { email: deleteEmailInput.value.trim() })
    toast.success('Conta excluída. Sentiremos sua falta.')
    showDeleteModal.value = false
    auth.logout()
  }
  catch (e) {
    deleteError.value = (e as { message?: string })?.message ?? 'Não foi possível excluir a conta. Tente novamente.'
  }
  finally {
    deleting.value = false
  }
}

// ── Indicações (M4) ──────────────────────────────────────────────────────────
interface MyRedemption { id: string, indicadoMasked: string, createdAt: string, status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' }
interface MyCouponResponse { coupon: { code: string, discountValue: number }, totalDiasGanhos: number, redemptions: MyRedemption[] }

const { data: indicacoes, pending: indicacoesPending } = await useAsyncData('conta-indicacoes', () =>
  api.get<MyCouponResponse>('/me/coupon/redemptions').catch(() => null))

const statusLabel: Record<MyRedemption['status'], string> = {
  PENDING_VALIDATION: 'Aguardando validação',
  VALIDATED: 'Validada',
  REJECTED: 'Rejeitada',
}
const statusVariant: Record<MyRedemption['status'], 'warning' | 'success' | 'danger'> = {
  PENDING_VALIDATION: 'warning',
  VALIDATED: 'success',
  REJECTED: 'danger',
}

const copied = ref(false)
async function copiarCodigo() {
  if (!indicacoes.value) return
  const { copy } = useClipboard()
  await copy(indicacoes.value.coupon.code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function compartilharWhatsapp() {
  if (!indicacoes.value) return
  const texto = `Usa meu código ${indicacoes.value.coupon.code} na VitrinePro e ganha ${indicacoes.value.coupon.discountValue}% de desconto! ${useRuntimeConfig().public.frontendUrl}/precos?cupom=${indicacoes.value.coupon.code}`
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="conta">
    <header class="conta__header">
      <h1>Minha Conta</h1>
    </header>

    <div class="conta__layout">
      <nav class="conta__nav">
        <button
          v-for="s in sections" :key="s.value" class="conta__nav-item"
          :class="{ 'conta__nav-item--active': section === s.value }"
          @click="section = s.value"
        >
          {{ s.label }}
        </button>
      </nav>

      <div class="conta__body">
        <template v-if="section === 'dados'">
          <UiCard class="conta__card">
            <h2>E-mail</h2>
            <p class="conta__email">{{ auth.user?.email }}</p>
            <p v-if="auth.user?.emailVerified" class="conta__badge conta__badge--ok">✓ Verificado</p>
            <template v-else>
              <p class="conta__badge conta__badge--warn">E-mail não confirmado</p>
              <UiButton size="sm" variant="secondary" :loading="resending" @click="reenviarVerificacao">
                Reenviar confirmação
              </UiButton>
            </template>
          </UiCard>

          <UiCard class="conta__card">
            <h2>Trocar senha</h2>
            <form class="conta__pw-form" @submit.prevent="trocarSenha">
              <UiInput v-model="currentPassword" type="password" label="Senha atual" autocomplete="current-password" />
              <UiInput v-model="newPassword" type="password" label="Nova senha" autocomplete="new-password" />
              <UiInput v-model="confirmPassword" type="password" label="Confirmar nova senha" autocomplete="new-password" />
              <p v-if="passwordError" class="conta__error">{{ passwordError }}</p>
              <UiButton type="submit" size="sm" :loading="changingPassword">Salvar nova senha</UiButton>
            </form>
          </UiCard>

          <UiCard class="conta__card conta__card--wide">
            <h2>Sessões ativas</h2>
            <p class="conta__hint">Dispositivos onde sua conta está logada atualmente.</p>
            <div v-if="sessionsPending" class="skeleton" style="height: 100px;" />
            <ul v-else-if="sessions?.length" class="conta__sessions">
              <li v-for="s in sessions" :key="s.id" class="conta__session">
                <div class="conta__session-info">
                  <strong>{{ formatarDispositivo(s.userAgent) }}</strong>
                  <span class="conta__session-meta">
                    {{ s.ip || 'IP desconhecido' }} · último acesso: {{ fmtDataHora(s.lastSeenAt) }}
                  </span>
                </div>
                <UiBadge v-if="s.current" variant="success">Sessão atual</UiBadge>
                <UiButton
                  v-else size="sm" variant="secondary" :loading="revokingId === s.id"
                  @click="revogarSessao(s.id)"
                >
                  Revogar
                </UiButton>
              </li>
            </ul>
            <p v-else class="conta__hint">Nenhuma sessão encontrada.</p>
          </UiCard>
        </template>

        <template v-else-if="section === 'privacidade'">
          <UiCard class="conta__card">
            <h2>Exportar meus dados</h2>
            <p class="conta__hint">
              Baixe uma cópia dos principais dados vinculados à sua conta na VitrinePro (LGPD art. 18).
            </p>
            <UiButton size="sm" variant="secondary" :loading="exporting" @click="exportarDados">
              Exportar meus dados
            </UiButton>
          </UiCard>

          <UiCard class="conta__card conta__card--danger">
            <h2>Excluir minha conta</h2>
            <p class="conta__hint">
              Anonimiza seus dados pessoais e desativa sua conta. Esta ação não pode ser desfeita.
            </p>
            <UiButton size="sm" variant="danger" @click="abrirModalExclusao">
              Excluir minha conta
            </UiButton>
          </UiCard>
        </template>

        <template v-else-if="section === 'indicacoes'">
          <div v-if="indicacoesPending" class="skeleton" style="height: 160px;" />
          <template v-else-if="indicacoes">
            <UiCard class="conta__card conta__hero">
              <div>
                <p class="conta__hero-label">Seu código de indicação</p>
                <p class="conta__hero-code">{{ indicacoes.coupon.code }}</p>
                <p class="conta__hint">
                  Quem usar ganha {{ indicacoes.coupon.discountValue }}% de desconto · você ganha +30 dias de
                  plano a cada assinatura validada.
                </p>
              </div>
              <div class="conta__hero-actions">
                <UiButton size="sm" variant="secondary" @click="copiarCodigo">{{ copied ? 'Copiado ✓' : 'Copiar código' }}</UiButton>
                <UiButton size="sm" variant="secondary" @click="compartilharWhatsapp">Compartilhar no WhatsApp</UiButton>
              </div>
            </UiCard>

            <UiCard class="conta__card">
              <div class="conta__indic-head">
                <h2>Suas indicações</h2>
                <span class="conta__dias-ganhos">Total de dias ganhos: <strong>{{ indicacoes.totalDiasGanhos }}</strong></span>
              </div>
              <div v-if="indicacoes.redemptions.length" class="conta__table-wrap">
                <table class="conta__table">
                  <thead><tr><th>Indicado</th><th>Data</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr v-for="r in indicacoes.redemptions" :key="r.id">
                      <td>{{ r.indicadoMasked }}</td>
                      <td>{{ fmtData(r.createdAt) }}</td>
                      <td><UiBadge :variant="statusVariant[r.status]">{{ statusLabel[r.status] }}</UiBadge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <UiEmptyState v-else title="Nenhuma indicação ainda" description="Compartilhe seu código para começar a ganhar dias de plano." />
            </UiCard>
          </template>
        </template>
      </div>
    </div>

    <UiModal :open="showDeleteModal" title="Excluir minha conta" size="md" @close="showDeleteModal = false">
      <div class="conta__delete">
        <p>Ao excluir sua conta:</p>
        <ul class="conta__delete-list">
          <li>Seu nome, e-mail, telefone, foto e demais dados pessoais são anonimizados.</li>
          <li>Sua conta é desativada e você é desconectado de todos os dispositivos.</li>
          <li>Vagas, candidaturas e placements não são apagados, mas viram registros anônimos (sem seus dados pessoais).</li>
          <li>Faturas e histórico de pagamentos são mantidos anonimizados, conforme exigido por lei.</li>
        </ul>
        <p class="conta__delete-confirm-label">
          Para confirmar, digite seu e-mail (<strong>{{ auth.user?.email }}</strong>):
        </p>
        <UiInput v-model="deleteEmailInput" type="email" placeholder="seu@email.com" />
        <p v-if="deleteError" class="conta__error">{{ deleteError }}</p>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showDeleteModal = false">Cancelar</UiButton>
        <UiButton variant="danger" :disabled="!canConfirmDelete" :loading="deleting" @click="confirmarExclusao">
          Excluir minha conta
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.conta__header { margin-bottom: var(--sp-6); }
.conta__header h1 { font-size: var(--text-22); }
.conta__layout { display: grid; grid-template-columns: 200px 1fr; gap: var(--sp-6); align-items: start; }
.conta__nav { display: flex; flex-direction: column; gap: 2px; }
.conta__nav-item {
  text-align: left; padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-input); border: none;
  background: none; font-size: var(--text-14); color: var(--ink-700); cursor: pointer;
}
.conta__nav-item:hover { background: var(--ink-100); }
.conta__nav-item--active { background: var(--brand-100); color: var(--brand-700); font-weight: 600; }
.conta__body { display: flex; flex-direction: column; gap: var(--sp-5); min-width: 0; }
.conta__card { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 560px; }
.conta__card h2 { font-size: var(--text-16); }
.conta__email { font-size: var(--text-15); color: var(--ink-900); }
.conta__badge { font-size: var(--text-13); font-weight: 600; }
.conta__badge--ok { color: var(--brand-700); }
.conta__badge--warn { color: #92400E; }
.conta__pw-form { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 320px; }
.conta__error { color: var(--red-600, #dc2626); font-size: var(--text-13); }
.conta__hero { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-5); max-width: none; flex-wrap: wrap; }
.conta__hero-label { font-size: var(--text-13); color: var(--ink-500); }
.conta__hero-code { font-size: var(--text-22); font-weight: 700; font-family: monospace; letter-spacing: 0.05em; color: var(--brand-700); }
.conta__hint { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-2); max-width: 420px; }
.conta__hero-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.conta__indic-head { display: flex; align-items: center; justify-content: space-between; }
.conta__dias-ganhos { font-size: var(--text-13); color: var(--ink-500); }
.conta__table-wrap { overflow-x: auto; }
.conta__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); }
.conta__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.conta__table td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.conta__card--wide { max-width: 640px; }
.conta__card--danger { border: 1px solid var(--red-200, #fecaca); }
.conta__sessions { display: flex; flex-direction: column; gap: var(--sp-3); }
.conta__session {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
  padding: var(--sp-3); border: 1px solid var(--ink-100); border-radius: var(--radius-md); flex-wrap: wrap;
}
.conta__session-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.conta__session-meta { font-size: var(--text-13); color: var(--ink-500); }
.conta__delete { display: flex; flex-direction: column; gap: var(--sp-3); }
.conta__delete-list { display: flex; flex-direction: column; gap: var(--sp-2); padding-left: var(--sp-5); font-size: var(--text-14); color: var(--ink-700); }
.conta__delete-confirm-label { font-size: var(--text-14); margin-top: var(--sp-2); }
@media (max-width: 640px) {
  .conta__layout { grid-template-columns: 1fr; }
  .conta__nav { flex-direction: row; overflow-x: auto; }
  .conta__session { flex-direction: column; align-items: flex-start; }
}
</style>
