<script setup lang="ts">
// M3 — Checkout real (design-spec/06 §M3): /app/conta/assinatura/checkout?plan=team
// 2 colunas: esquerda formulário (1. Dados de cobrança 2. Pagamento com tabs
// Cartão/Pix/Boleto), direita resumo do pedido sticky (plano/cupom/total).
// Backend real (B11, Asaas sandbox) já validado via fetch direto — esta
// página é a UI que faltava. Sucesso: tela cheia de check verde. Falha de
// cartão: alert vermelho com o motivo do gateway.
import type { PlanTier } from '~/stores/auth'
import type { AsaasBillingType, CheckoutPayload, CheckoutResult, PlanInfo, SubscriptionRecord } from '~/types/subscription'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Finalizar assinatura' })
useState<string>('workspace-label').value = 'Assinatura'

const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const route = useRoute()

// ── Plano selecionado (via query ?plan=recruiter) ───────────────────────────
const { data: plans, pending: plansPending } = await useAsyncData('checkout-plans', () =>
  api.get<PlanInfo[]>('/plans').catch(() => null))

const planTier = computed<PlanTier>(() => String(route.query.plan ?? '').toUpperCase() as PlanTier)
const selectedPlan = computed(() => plans.value?.find(p => p.tier === planTier.value) ?? null)
const planInvalido = computed(() => !plansPending.value && (!selectedPlan.value || planTier.value === 'FREE'))

// ── 1. Dados de cobrança (prefill com o que já foi salvo num checkout anterior) ──
const cpfCnpj = ref(auth.user?.cpfCnpj ?? '')
const postalCode = ref(auth.user?.billingPostalCode ?? '')
const addressNumber = ref(auth.user?.billingAddressNumber ?? '')

// ── Cupom ─────────────────────────────────────────────────────────────────
const couponInput = ref((route.query.cupom as string) ?? '')
const couponApplied = ref<{ code: string, discountBRL: number } | null>(null)
const couponError = ref('')
const couponChecking = ref(false)

function computeDiscount(priceBRL: number, discountType?: string, discountValue?: number): number {
  if (!discountType || discountValue == null) return 0
  if (discountType === 'PERCENT') return Math.round((priceBRL * discountValue) / 100 * 100) / 100
  return Math.min(discountValue, priceBRL)
}

async function aplicarCupom() {
  if (!couponInput.value.trim() || !selectedPlan.value) return
  couponChecking.value = true
  couponError.value = ''
  try {
    const res = await api.get<{ valid: boolean, discountType?: string, discountValue?: number }>(
      `/coupons/${encodeURIComponent(couponInput.value.trim().toUpperCase())}/validate`,
    )
    if (!res.valid) {
      couponError.value = 'Cupom inválido ou expirado.'
      couponApplied.value = null
      return
    }
    const discountBRL = computeDiscount(selectedPlan.value.priceBRL, res.discountType, res.discountValue)
    couponApplied.value = { code: couponInput.value.trim().toUpperCase(), discountBRL }
  }
  catch {
    couponError.value = 'Não foi possível validar o cupom.'
    couponApplied.value = null
  }
  finally {
    couponChecking.value = false
  }
}
function removerCupom() {
  couponApplied.value = null
  couponInput.value = ''
  couponError.value = ''
}

const totalBRL = computed(() => {
  if (!selectedPlan.value) return 0
  return Math.max(0, selectedPlan.value.priceBRL - (couponApplied.value?.discountBRL ?? 0))
})
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── 2. Pagamento ──────────────────────────────────────────────────────────
const billingType = ref<AsaasBillingType>('PIX')
const paymentTabs = [
  { value: 'CREDIT_CARD', label: 'Cartão' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
]

const cardHolder = ref('')
const cardNumber = ref('')
const cardExpiryMonth = ref('')
const cardExpiryYear = ref('')
const cardCcv = ref('')

// ── Submissão ─────────────────────────────────────────────────────────────
const submitting = ref(false)
const errorMsg = ref('')
const phase = ref<'form' | 'waiting' | 'success'>('form')
const result = ref<CheckoutResult | null>(null)

function validarFormulario(): string | null {
  if (!cpfCnpj.value.trim()) return 'Informe seu CPF ou CNPJ.'
  if (!postalCode.value.trim()) return 'Informe o CEP.'
  if (!addressNumber.value.trim()) return 'Informe o número do endereço.'
  if (billingType.value === 'CREDIT_CARD') {
    if (!cardHolder.value.trim() || !cardNumber.value.trim() || !cardExpiryMonth.value.trim()
      || !cardExpiryYear.value.trim() || !cardCcv.value.trim()) {
      return 'Preencha todos os dados do cartão.'
    }
  }
  return null
}

async function finalizar() {
  if (!selectedPlan.value) return
  const validation = validarFormulario()
  if (validation) { errorMsg.value = validation; return }

  errorMsg.value = ''
  submitting.value = true
  try {
    const payload: CheckoutPayload = {
      plan: selectedPlan.value.tier,
      billingType: billingType.value,
      cpfCnpj: cpfCnpj.value.trim(),
      postalCode: postalCode.value.trim(),
      addressNumber: addressNumber.value.trim(),
      ...(couponApplied.value ? { couponCode: couponApplied.value.code } : {}),
      ...(billingType.value === 'CREDIT_CARD'
        ? {
            creditCard: {
              holderName: cardHolder.value.trim(),
              number: cardNumber.value.trim().replace(/\s/g, ''),
              expiryMonth: cardExpiryMonth.value.trim(),
              expiryYear: cardExpiryYear.value.trim(),
              ccv: cardCcv.value.trim(),
            },
          }
        : {}),
    }
    const res = await api.post<CheckoutResult>('/subscriptions/checkout', payload)
    result.value = res
    if (res.status === 'ACTIVE') {
      phase.value = 'success'
      await auth.fetchMe()
    }
    else {
      phase.value = 'waiting'
      startPolling(res.subscriptionId)
    }
  }
  catch (e) {
    const err = e as { message?: string }
    errorMsg.value = err.message || 'Não foi possível processar o pagamento. Tente novamente.'
  }
  finally {
    submitting.value = false
  }
}

// ── Polling (Pix/Boleto aguardando confirmação) ─────────────────────────────
let pollHandle: ReturnType<typeof setInterval> | null = null
function startPolling(subscriptionId: string) {
  pollHandle = setInterval(async () => {
    try {
      const sub = await api.get<SubscriptionRecord>(`/subscriptions/${subscriptionId}`)
      if (sub.status === 'ACTIVE') {
        stopPolling()
        phase.value = 'success'
        await auth.fetchMe()
      }
    }
    catch {
      // erro transitório de polling - mantém tentando, não interrompe o usuário
    }
  }, 4000)
}
function stopPolling() {
  if (pollHandle) { clearInterval(pollHandle); pollHandle = null }
}
onUnmounted(stopPolling)

function tentarNovamente() {
  phase.value = 'form'
  result.value = null
  errorMsg.value = ''
}

async function copiarPixCopiaECola() {
  if (!result.value?.pixCopyPaste) return
  const { copy } = useClipboard()
  await copy(result.value.pixCopyPaste)
  toast.success('Código Pix copiado!')
}

const redirectTarget = computed(() => (route.query.redirect as string) || '/app')
const successBullets = computed(() => selectedPlan.value?.features?.slice(0, 3) ?? [])
</script>

<template>
  <div class="checkout">
    <!-- Plano inválido/ausente -->
    <UiEmptyState
      v-if="planInvalido"
      title="Plano não encontrado"
      description="Escolha um plano válido para continuar."
    >
      <template #action>
        <UiButton @click="navigateTo('/precos')">Ver planos</UiButton>
      </template>
    </UiEmptyState>

    <div v-else-if="plansPending" class="skeleton" style="height: 320px;" />

    <!-- Sucesso -->
    <div v-else-if="phase === 'success'" class="checkout__success">
      <div class="checkout__success-icon">✓</div>
      <h1>Plano {{ selectedPlan?.name }} ativo! 🎉</h1>
      <ul v-if="successBullets.length" class="checkout__success-bullets">
        <li v-for="b in successBullets" :key="b">{{ b }}</li>
      </ul>
      <UiButton size="lg" @click="navigateTo(redirectTarget)">Ir para o app</UiButton>
    </div>

    <!-- Aguardando confirmação (Pix/Boleto) -->
    <div v-else-if="phase === 'waiting'" class="checkout__waiting">
      <template v-if="billingType === 'PIX' && result?.pixQrCode">
        <h1>Pague com Pix</h1>
        <p class="text-secondary">Escaneie o QR code ou copie o código abaixo no app do seu banco.</p>
        <img class="checkout__qr" :src="`data:image/png;base64,${result.pixQrCode}`" alt="QR code Pix">
        <UiButton v-if="result.pixCopyPaste" variant="secondary" @click="copiarPixCopiaECola">Copiar código Pix</UiButton>
      </template>
      <template v-else>
        <h1>{{ billingType === 'BOLETO' ? 'Boleto gerado' : 'Aguardando pagamento' }}</h1>
        <p class="text-secondary">
          {{ billingType === 'BOLETO'
            ? 'O pagamento pode levar de 1 a 2 dias úteis para compensar.'
            : 'Assim que o pagamento for confirmado, sua assinatura é ativada automaticamente.' }}
        </p>
        <UiButton v-if="result?.invoiceUrl" variant="secondary" @click="window.open(result!.invoiceUrl, '_blank')">
          Abrir {{ billingType === 'BOLETO' ? 'boleto' : 'fatura' }}
        </UiButton>
      </template>
      <div class="checkout__waiting-spinner">
        <span class="spinner" /> aguardando confirmação do pagamento…
      </div>
      <UiButton variant="link" size="sm" @click="tentarNovamente">Tentar outro método</UiButton>
    </div>

    <!-- Formulário -->
    <div v-else class="checkout__grid">
      <div class="checkout__form">
        <h1 class="checkout__title">Finalizar assinatura</h1>

        <UiCard class="checkout__section">
          <h2>1. Dados de cobrança</h2>
          <div class="checkout__row">
            <UiInput v-model="cpfCnpj" label="CPF/CNPJ" placeholder="Só números" required />
          </div>
          <div class="checkout__row checkout__row--2">
            <UiInput v-model="postalCode" label="CEP" placeholder="00000-000" required />
            <UiInput v-model="addressNumber" label="Número" placeholder="123" required />
          </div>
        </UiCard>

        <UiCard class="checkout__section">
          <h2>2. Pagamento</h2>
          <UiTabs v-model="billingType" :tabs="paymentTabs" />

          <div v-if="billingType === 'CREDIT_CARD'" class="checkout__card-form">
            <UiInput v-model="cardHolder" label="Nome no cartão" placeholder="Como está no cartão" required />
            <UiInput v-model="cardNumber" label="Número do cartão" placeholder="0000 0000 0000 0000" required />
            <div class="checkout__row checkout__row--3">
              <UiInput v-model="cardExpiryMonth" label="Mês" placeholder="MM" required />
              <UiInput v-model="cardExpiryYear" label="Ano" placeholder="AAAA" required />
              <UiInput v-model="cardCcv" label="CVV" placeholder="000" required />
            </div>
          </div>
          <p v-else-if="billingType === 'PIX'" class="checkout__hint">
            Você vai receber um QR code e um código copia-e-cola para pagar no app do seu banco.
          </p>
          <p v-else class="checkout__hint">
            Vamos gerar um boleto (PDF). O pagamento pode levar de 1 a 2 dias úteis para compensar.
          </p>
        </UiCard>

        <p v-if="errorMsg" class="checkout__alert">{{ errorMsg }}</p>
      </div>

      <aside class="checkout__summary">
        <UiCard v-if="selectedPlan" class="checkout__summary-card">
          <h2>Resumo do pedido</h2>
          <div class="checkout__summary-row">
            <span>Plano {{ selectedPlan.name }}</span>
            <span>R$ {{ fmtBRL(selectedPlan.priceBRL) }}</span>
          </div>

          <div class="checkout__coupon">
            <div class="checkout__coupon-input">
              <UiInput v-model="couponInput" placeholder="Cupom de desconto" :disabled="!!couponApplied" />
              <UiButton
                size="sm" variant="secondary" :loading="couponChecking"
                :disabled="!!couponApplied || !couponInput.trim()" @click="aplicarCupom"
              >
                Aplicar
              </UiButton>
            </div>
            <p v-if="couponError" class="checkout__coupon-error">{{ couponError }}</p>
            <div v-if="couponApplied" class="checkout__summary-row checkout__summary-row--discount">
              <span>{{ couponApplied.code }} <button class="checkout__coupon-remove" @click="removerCupom">✕</button></span>
              <span>−R$ {{ fmtBRL(couponApplied.discountBRL) }} ✓</span>
            </div>
          </div>

          <div class="checkout__summary-total">
            <span>Total</span>
            <span>R$ {{ fmtBRL(totalBRL) }}<span class="checkout__summary-period">/mês</span></span>
          </div>

          <UiButton block size="lg" :loading="submitting" @click="finalizar">
            Finalizar assinatura
          </UiButton>
        </UiCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.checkout { max-width: 960px; margin: 0 auto; }
.checkout__title { font-size: var(--text-22); margin-bottom: var(--sp-5); }
.checkout__grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-6); align-items: start; }
.checkout__form { display: flex; flex-direction: column; gap: var(--sp-4); min-width: 0; }
.checkout__section { display: flex; flex-direction: column; gap: var(--sp-4); }
.checkout__section h2 { font-size: var(--text-16); }
.checkout__row { display: flex; gap: var(--sp-3); }
.checkout__row--2 > * { flex: 1; }
.checkout__row--3 > * { flex: 1; }
.checkout__card-form { display: flex; flex-direction: column; gap: var(--sp-3); }
.checkout__hint { font-size: var(--text-13); color: var(--ink-500); }
.checkout__alert {
  background: #FEF2F2; border: 1px solid var(--red-500, #ef4444); color: var(--red-600, #dc2626);
  border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4); font-size: var(--text-14);
}

.checkout__summary { position: sticky; top: var(--sp-6); }
.checkout__summary-card { display: flex; flex-direction: column; gap: var(--sp-4); }
.checkout__summary-card h2 { font-size: var(--text-16); }
.checkout__summary-row { display: flex; justify-content: space-between; font-size: var(--text-14); color: var(--ink-700); }
.checkout__summary-row--discount { color: var(--brand-700); font-weight: 600; }
.checkout__coupon { display: flex; flex-direction: column; gap: var(--sp-2); border-top: 1px solid var(--ink-100); border-bottom: 1px solid var(--ink-100); padding: var(--sp-3) 0; }
.checkout__coupon-input { display: flex; gap: var(--sp-2); align-items: flex-end; }
.checkout__coupon-input > :first-child { flex: 1; }
.checkout__coupon-error { font-size: var(--text-12); color: var(--red-500); }
.checkout__coupon-remove { background: none; border: none; color: var(--ink-500); cursor: pointer; margin-left: var(--sp-1); }
.checkout__summary-total { display: flex; justify-content: space-between; align-items: baseline; font-size: var(--text-20); font-weight: 700; color: var(--ink-900); }
.checkout__summary-period { font-size: var(--text-13); font-weight: 400; color: var(--ink-500); }

.checkout__success, .checkout__waiting {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4);
  padding: var(--sp-16) var(--sp-4);
}
.checkout__success-icon {
  width: 64px; height: 64px; border-radius: var(--radius-full); background: var(--brand-100);
  color: var(--brand-700); font-size: var(--text-36); display: flex; align-items: center; justify-content: center;
}
.checkout__success h1, .checkout__waiting h1 { font-size: var(--text-24); }
.checkout__success-bullets { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--sp-1); }
.checkout__success-bullets li { font-size: var(--text-14); color: var(--ink-700); }
.checkout__success-bullets li::before { content: '✓ '; color: var(--brand-700); font-weight: 700; }
.checkout__qr { width: 220px; height: 220px; border-radius: var(--radius-card); border: 1px solid var(--ink-100); }
.checkout__waiting-spinner { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-13); color: var(--ink-500); }
.spinner {
  width: 14px; height: 14px; border: 2px solid var(--ink-300); border-top-color: var(--brand-600);
  border-radius: var(--radius-full); animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .checkout__grid { grid-template-columns: 1fr; }
  .checkout__summary { position: static; }
}
</style>
