<script setup lang="ts">
// Conta & Transversais (design-spec 06 §C) — acessível pelo avatar-menu de
// qualquer persona. Escopo desta rodada: só "Dados de acesso" e "Indicações"
// (M4) — as tabs "Assinatura" (M1) e "Privacidade" (exportar/excluir conta,
// B26) ficam de fora de propósito: a primeira depende do gateway de
// pagamento real (B11, não construído), a segunda é o gap LGPD B26
// (pré-launch, ainda não desenhado/implementado). "Notificações" também não
// entrou aqui porque cada workspace já tem sua própria página de
// Configurações com a matriz sino/e-mail (ver empresa/consultoria config.vue)
// — duplicar uma 3ª cópia transversal não foi pedido nesta rodada.
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Minha Conta' })

// Página transversal: não é dona de nenhum workspace-nav — mantém a sidebar
// do workspace de onde o usuário veio (não zera `nav`), só troca o
// breadcrumb do topo pra deixar claro onde ele está.
useState<string>('workspace-label').value = 'Conta'

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const section = ref<'dados' | 'indicacoes'>('dados')
const sections = [
  { value: 'dados' as const, label: 'Dados de acesso' },
  { value: 'indicacoes' as const, label: 'Indicações' },
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
@media (max-width: 640px) {
  .conta__layout { grid-template-columns: 1fr; }
  .conta__nav { flex-direction: row; overflow-x: auto; }
}
</style>
