<script setup lang="ts">
// T-E07 — Faturas de fee (design-spec/05_WORKSPACE_EMPRESA.md). Cobrança real
// (Asaas) do fee da empresa quando um placement vindo de hunter é marcado
// HIRED (fecha o gap do B11 — antes o fee só era calculado, nunca cobrado).
// Banner vermelho de inadimplência: fatura vencida há mais de 7 dias bloqueia
// novas publicações de vaga (ver VagaEditor.vue — código INVOICE_OVERDUE_BLOCKED).
import type { TableColumn } from '~/components/ui/Table.vue'
import type { Invoice, InvoiceBillingType, InvoiceCheckoutPayload, InvoiceCheckoutResult } from '~/types/invoice'
import { INVOICE_STATUS_LABEL, invoiceStatusVariant } from '~/types/invoice'

definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Faturas — Empresa' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const { data: invoices, pending, refresh } = await useAsyncData('empresa-invoices', () =>
  api.get<Invoice[]>('/me/invoices').catch(() => []))

const rows = computed(() => invoices.value ?? [])
const hasOverdue = computed(() => rows.value.some(i => i.status === 'OVERDUE'))

const columns: TableColumn[] = [
  { key: 'ref', label: 'Referência' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'dueDate', label: 'Vencimento' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

function fmtBRL(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—'
}
function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

// -- Detalhe (drawer) --
const viewing = ref<Invoice | null>(null)
const feeComposition = computed(() => {
  const p = viewing.value?.placement
  if (!p) return null
  return {
    hunter: p.hunterShareAmount ?? null,
    platform: p.platformShareAmount ?? null,
    total: p.feeAmount ?? null,
  }
})

// -- Contestar --
const disputing = ref<Invoice | null>(null)
const disputeReason = ref('')
const sendingDispute = ref(false)

function abrirDisputa(inv: Invoice) {
  disputing.value = inv
  disputeReason.value = ''
}
async function enviarDisputa() {
  if (!disputing.value || !disputeReason.value.trim()) return
  sendingDispute.value = true
  try {
    await api.post(`/invoices/${disputing.value.id}/dispute`, { reason: disputeReason.value.trim() })
    toast.info('Contestação enviada. Um administrador vai revisar.')
    disputing.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível enviar a contestação.')
  }
  finally { sendingDispute.value = false }
}

// -- Checkout (Pix/Boleto/Cartão) --
const paying = ref<Invoice | null>(null)
const billingType = ref<InvoiceBillingType>('PIX')
const paymentTabs = [
  { value: 'CREDIT_CARD', label: 'Cartão' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
]
const cpfCnpj = ref('')
const postalCode = ref('')
const addressNumber = ref('')
const cardHolder = ref('')
const cardNumber = ref('')
const cardExpiryMonth = ref('')
const cardExpiryYear = ref('')
const cardCcv = ref('')
const submittingPay = ref(false)
const payError = ref('')
const payPhase = ref<'form' | 'waiting' | 'success'>('form')
const payResult = ref<InvoiceCheckoutResult | null>(null)

function abrirPagamento(inv: Invoice) {
  paying.value = inv
  billingType.value = 'PIX'
  cpfCnpj.value = auth.user?.cpfCnpj ?? ''
  postalCode.value = auth.user?.billingPostalCode ?? ''
  addressNumber.value = auth.user?.billingAddressNumber ?? ''
  cardHolder.value = ''; cardNumber.value = ''; cardExpiryMonth.value = ''; cardExpiryYear.value = ''; cardCcv.value = ''
  payError.value = ''
  payPhase.value = 'form'
  payResult.value = null
}
function fecharPagamento() {
  paying.value = null
  stopPolling()
}

function validarPagamento(): string | null {
  if (!cpfCnpj.value.trim()) return 'Informe o CPF/CNPJ.'
  if (!postalCode.value.trim()) return 'Informe o CEP.'
  if (!addressNumber.value.trim()) return 'Informe o número do endereço.'
  if (billingType.value === 'CREDIT_CARD') {
    if (!cardHolder.value.trim() || !cardNumber.value.trim() || !cardExpiryMonth.value.trim() || !cardExpiryYear.value.trim() || !cardCcv.value.trim()) {
      return 'Preencha todos os dados do cartão.'
    }
  }
  return null
}

async function finalizarPagamento() {
  if (!paying.value) return
  const validation = validarPagamento()
  if (validation) { payError.value = validation; return }

  payError.value = ''
  submittingPay.value = true
  try {
    const payload: InvoiceCheckoutPayload = {
      billingType: billingType.value,
      cpfCnpj: cpfCnpj.value.trim(),
      postalCode: postalCode.value.trim(),
      addressNumber: addressNumber.value.trim(),
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
    const res = await api.post<InvoiceCheckoutResult>(`/invoices/${paying.value.id}/checkout`, payload)
    payResult.value = res
    if (res.status === 'PAID') {
      payPhase.value = 'success'
      await refresh()
    }
    else {
      payPhase.value = 'waiting'
      startPolling(paying.value.id)
    }
  }
  catch (e) {
    const err = e as { message?: string }
    payError.value = err.message || 'Não foi possível processar o pagamento. Tente novamente.'
  }
  finally {
    submittingPay.value = false
  }
}

let pollHandle: ReturnType<typeof setInterval> | null = null
function startPolling(invoiceId: string) {
  pollHandle = setInterval(async () => {
    try {
      const list = await api.get<Invoice[]>('/me/invoices')
      const updated = list.find(i => i.id === invoiceId)
      if (updated?.status === 'PAID') {
        stopPolling()
        invoices.value = list
        payPhase.value = 'success'
      }
    }
    catch { /* erro transitório de polling - mantém tentando */ }
  }, 4000)
}
function stopPolling() {
  if (pollHandle) { clearInterval(pollHandle); pollHandle = null }
}
onUnmounted(stopPolling)

async function copiarPix() {
  if (!payResult.value?.pixCopyPaste) return
  const { copy } = useClipboard()
  await copy(payResult.value.pixCopyPaste)
  toast.success('Código Pix copiado!')
}
</script>

<template>
  <div class="fat">
    <header class="fat__header">
      <h1>Faturas</h1>
      <p class="fat__sub">Cobranças do fee de placements feitos via hunter.</p>
    </header>

    <div v-if="hasOverdue" class="fat__banner" role="alert">
      <strong>Pagamentos pendentes</strong> — novas publicações bloqueadas. Regularize as faturas vencidas
      abaixo para voltar a publicar vagas.
    </div>

    <UiTable
      :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending"
      empty-title="Nenhuma fatura ainda" empty-description="Faturas de fee aparecem aqui quando uma indicação de hunter é marcada como contratada."
    >
      <template #cell-ref="{ row }">
        <strong class="fat__link" @click="viewing = row as Invoice">{{ shortId((row as Invoice).id) }}</strong>
        <span class="fat__muted">{{ (row as Invoice).placement?.vaga?.title ?? 'Fee de placement' }}</span>
      </template>
      <template #cell-amount="{ value }">{{ fmtBRL(value as string) }}</template>
      <template #cell-dueDate="{ value }">{{ fmtData(value as string) }}</template>
      <template #cell-status="{ value }">
        <UiBadge :variant="invoiceStatusVariant(value as Invoice['status'])">{{ INVOICE_STATUS_LABEL[value as Invoice['status']] }}</UiBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="fat__btns">
          <UiButton size="sm" variant="ghost" @click="viewing = row as Invoice">Ver detalhe</UiButton>
          <template v-if="['PENDING', 'OVERDUE'].includes((row as Invoice).status)">
            <UiButton size="sm" @click="abrirPagamento(row as Invoice)">Pagar</UiButton>
            <UiButton size="sm" variant="secondary" @click="abrirDisputa(row as Invoice)">Contestar</UiButton>
          </template>
          <a v-if="(row as Invoice).invoiceUrl" :href="(row as Invoice).invoiceUrl!" target="_blank" rel="noopener" class="fat__pdf-link">Baixar PDF</a>
        </div>
      </template>
    </UiTable>

    <!-- Drawer de detalhe -->
    <UiModal :open="!!viewing" title="Detalhe da fatura" size="md" @close="viewing = null">
      <div v-if="viewing" class="fat__detail">
        <div class="fat__detail-row">
          <span class="fat__label">Vaga</span>
          <span>{{ viewing.placement?.vaga?.title ?? '—' }}</span>
        </div>
        <div class="fat__detail-row">
          <span class="fat__label">Valor</span>
          <span>{{ fmtBRL(viewing.amount) }}</span>
        </div>
        <div class="fat__detail-row">
          <span class="fat__label">Status</span>
          <UiBadge :variant="invoiceStatusVariant(viewing.status)">{{ INVOICE_STATUS_LABEL[viewing.status] }}</UiBadge>
        </div>
        <div v-if="feeComposition" class="fat__detail-row">
          <span class="fat__label">Composição do fee</span>
          <span>Hunter: {{ fmtBRL(feeComposition.hunter) }} · Plataforma: {{ fmtBRL(feeComposition.platform) }}</span>
        </div>
        <div class="fat__detail-row">
          <span class="fat__label">Criada em</span>
          <span>{{ fmtData(viewing.createdAt) }}</span>
        </div>
        <div class="fat__detail-row">
          <span class="fat__label">Vencimento</span>
          <span>{{ fmtData(viewing.dueDate) }}</span>
        </div>
        <div v-if="viewing.paidAt" class="fat__detail-row">
          <span class="fat__label">Paga em</span>
          <span>{{ fmtData(viewing.paidAt) }}</span>
        </div>
        <div v-if="viewing.disputeReason" class="fat__detail-row">
          <span class="fat__label">Motivo da contestação</span>
          <span>{{ viewing.disputeReason }}</span>
        </div>
      </div>
    </UiModal>

    <!-- Contestar -->
    <UiModal :open="!!disputing" title="Contestar fatura" size="sm" @close="disputing = null">
      <div v-if="disputing" class="fat__modal">
        <p class="text-secondary">{{ fmtBRL(disputing.amount) }} — {{ disputing.placement?.vaga?.title ?? 'Fee de placement' }}</p>
        <p class="fat__hint">Um administrador vai revisar sua contestação. A fatura fica marcada "Em disputa" enquanto isso.</p>
        <label class="fat__field">
          <span class="fat__label">Motivo</span>
          <textarea v-model="disputeReason" rows="3" placeholder="Explique o motivo da contestação..." />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="disputing = null">Cancelar</UiButton>
        <UiButton variant="danger" :loading="sendingDispute" :disabled="!disputeReason.trim()" @click="enviarDisputa">Enviar contestação</UiButton>
      </template>
    </UiModal>

    <!-- Pagar -->
    <UiModal :open="!!paying" title="Pagar fatura" size="md" @close="fecharPagamento">
      <div v-if="paying">
        <template v-if="payPhase === 'success'">
          <div class="fat__pay-success">
            <div class="fat__pay-icon">✓</div>
            <h2>Fatura paga!</h2>
            <p class="text-secondary">Obrigado — o pagamento foi confirmado.</p>
          </div>
        </template>
        <template v-else-if="payPhase === 'waiting'">
          <div class="fat__pay-waiting">
            <template v-if="billingType === 'PIX' && payResult?.pixQrCode">
              <h2>Pague com Pix</h2>
              <p class="text-secondary">Escaneie o QR code ou copie o código abaixo.</p>
              <img class="fat__qr" :src="`data:image/png;base64,${payResult.pixQrCode}`" alt="QR code Pix">
              <UiButton v-if="payResult.pixCopyPaste" variant="secondary" size="sm" @click="copiarPix">Copiar código Pix</UiButton>
            </template>
            <template v-else>
              <h2>{{ billingType === 'BOLETO' ? 'Boleto gerado' : 'Aguardando pagamento' }}</h2>
              <p class="text-secondary">
                {{ billingType === 'BOLETO' ? 'O pagamento pode levar de 1 a 2 dias úteis para compensar.' : 'Assim que confirmado, a fatura é marcada como paga automaticamente.' }}
              </p>
              <UiButton v-if="payResult?.invoiceUrl" variant="secondary" size="sm" @click="window.open(payResult!.invoiceUrl, '_blank')">
                Abrir {{ billingType === 'BOLETO' ? 'boleto' : 'fatura' }}
              </UiButton>
            </template>
            <div class="fat__pay-spinner"><span class="spinner" /> aguardando confirmação…</div>
          </div>
        </template>
        <template v-else>
          <p class="fat__pay-amount">{{ fmtBRL(paying.amount) }} — {{ paying.placement?.vaga?.title ?? 'Fee de placement' }}</p>
          <div class="fat__pay-form">
            <div class="fat__row">
              <UiInput v-model="cpfCnpj" label="CPF/CNPJ" placeholder="Só números" required />
            </div>
            <div class="fat__row fat__row--2">
              <UiInput v-model="postalCode" label="CEP" placeholder="00000-000" required />
              <UiInput v-model="addressNumber" label="Número" placeholder="123" required />
            </div>
            <UiTabs v-model="billingType" :tabs="paymentTabs" />
            <div v-if="billingType === 'CREDIT_CARD'" class="fat__card-form">
              <UiInput v-model="cardHolder" label="Nome no cartão" required />
              <UiInput v-model="cardNumber" label="Número do cartão" placeholder="0000 0000 0000 0000" required />
              <div class="fat__row fat__row--3">
                <UiInput v-model="cardExpiryMonth" label="Mês" placeholder="MM" required />
                <UiInput v-model="cardExpiryYear" label="Ano" placeholder="AAAA" required />
                <UiInput v-model="cardCcv" label="CVV" placeholder="000" required />
              </div>
            </div>
            <p v-else-if="billingType === 'PIX'" class="fat__hint">Você vai receber um QR code e código copia-e-cola.</p>
            <p v-else class="fat__hint">Vamos gerar um boleto (PDF).</p>
          </div>
          <p v-if="payError" class="fat__alert">{{ payError }}</p>
        </template>
      </div>
      <template v-if="payPhase === 'form'" #footer>
        <UiButton variant="ghost" @click="fecharPagamento">Cancelar</UiButton>
        <UiButton :loading="submittingPay" @click="finalizarPagamento">Pagar {{ fmtBRL(paying?.amount) }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.fat__header h1 { font-size: var(--text-22); }
.fat__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); }
.fat__banner {
  background: #FEF2F2; border: 1px solid var(--red-500, #ef4444); color: var(--red-600, #dc2626);
  border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4); font-size: var(--text-14); margin-bottom: var(--sp-4);
}
.fat__muted { display: block; font-size: var(--text-12); color: var(--ink-500); }
.fat__link { cursor: pointer; }
.fat__link:hover { text-decoration: underline; }
.fat__btns { display: flex; gap: var(--sp-2); justify-content: flex-end; flex-wrap: wrap; align-items: center; }
.fat__pdf-link { font-size: var(--text-13); color: var(--brand-700); text-decoration: underline; }
.fat__detail { display: flex; flex-direction: column; gap: var(--sp-3); }
.fat__detail-row { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-14); }
.fat__label { font-size: var(--text-12); color: var(--ink-500); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.fat__modal { display: flex; flex-direction: column; gap: var(--sp-3); }
.fat__hint { font-size: var(--text-13); color: var(--ink-500); }
.fat__field { display: flex; flex-direction: column; gap: 4px; }
.fat__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.fat__pay-amount { font-size: var(--text-16); font-weight: 600; margin-bottom: var(--sp-4); }
.fat__pay-form { display: flex; flex-direction: column; gap: var(--sp-3); }
.fat__row { display: flex; gap: var(--sp-3); }
.fat__row--2 > *, .fat__row--3 > * { flex: 1; }
.fat__card-form { display: flex; flex-direction: column; gap: var(--sp-3); }
.fat__alert {
  background: #FEF2F2; border: 1px solid var(--red-500, #ef4444); color: var(--red-600, #dc2626);
  border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4); font-size: var(--text-14); margin-top: var(--sp-3);
}
.fat__pay-success, .fat__pay-waiting { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-3); padding: var(--sp-6) var(--sp-4); }
.fat__pay-icon { width: 56px; height: 56px; border-radius: var(--radius-full); background: var(--brand-100); color: var(--brand-700); font-size: var(--text-28); display: flex; align-items: center; justify-content: center; }
.fat__qr { width: 200px; height: 200px; border-radius: var(--radius-card); border: 1px solid var(--ink-100); }
.fat__pay-spinner { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-13); color: var(--ink-500); }
.spinner { width: 14px; height: 14px; border: 2px solid var(--ink-300); border-top-color: var(--brand-600); border-radius: var(--radius-full); animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
