// B25 — pagamento da comissão do hunter (fee share) via Asaas Transfers.
// Contrato: ../vitrinepro-bakend/src/payouts/* (entidade, service, controller).
// Decisão arquitetural (design-spec, PLANO_DESENVOLVIMENTO.md §B25): admin
// aprova manualmente (gate de segurança) → sistema executa automaticamente.
export type PayoutStatus = 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'FAILED'
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'
export type PayoutLegalType = 'PF' | 'PJ' | 'MEI'

export interface Payout {
  id: string
  placementId: string
  placement?: { id: string, vaga?: { id: string, title: string, slug: string } | null } | null
  hunterId: string
  amount: number | string
  status: PayoutStatus
  pixKeySnapshot: string | null
  pixKeyTypeSnapshot: PixKeyType | null
  legalTypeSnapshot: PayoutLegalType | null
  cpfCnpjSnapshot: string | null
  nfUrl: string | null
  nfKey: string | null
  reviewedByAdminId: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  asaasTransferId: string | null
  processedAt: string | null
  paidAt: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface PayoutConfig {
  pixKey: string | null
  pixKeyType: PixKeyType | null
  legalType: PayoutLegalType | null
  cpfCnpj: string | null
  configuredAt: string | null
}

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING_REVIEW: 'Aguardando revisão',
  APPROVED: 'Aprovado',
  PROCESSING: 'Processando',
  PAID: 'Pago',
  REJECTED: 'Rejeitado',
  FAILED: 'Falhou',
}

export function payoutStatusVariant(status: PayoutStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID') return 'success'
  if (status === 'REJECTED' || status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'APPROVED') return 'neutral'
  return 'warning' // PENDING_REVIEW
}

export const PIX_KEY_TYPE_OPTIONS: { value: PixKeyType, label: string }[] = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'EVP', label: 'Chave aleatória' },
]

export const PAYOUT_LEGAL_TYPE_OPTIONS: { value: PayoutLegalType, label: string }[] = [
  { value: 'PF', label: 'Pessoa física' },
  { value: 'PJ', label: 'Pessoa jurídica' },
  { value: 'MEI', label: 'MEI' },
]
