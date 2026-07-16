// Faturas de fee (T-E07) — cobrança real (Asaas) do fee da empresa quando um
// placement vindo de hunter é marcado HIRED. Fecha o gap do B11 (o fee era só
// calculado, nunca cobrado). Contrato: ../vitrinepro-bakend/src/invoices/*.
export type InvoiceType = 'FEE' | 'SUBSCRIPTION' | 'BOOST'
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'DISPUTED'
export type InvoiceBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export interface Invoice {
  id: string
  companyId: string
  placementId: string | null
  placement?: {
    id: string
    finalSalary: number | string
    feeAmount: number | string | null
    hunterShareAmount?: number | string | null
    platformShareAmount?: number | string | null
    vaga?: { id: string, title: string, slug: string } | null
  } | null
  type: InvoiceType
  amount: number | string
  dueDate: string
  status: InvoiceStatus
  billingType: InvoiceBillingType | null
  invoiceUrl: string | null
  paidAt: string | null
  disputeReason: string | null
  disputedAt: string | null
  disputeResolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceCheckoutPayload {
  billingType: InvoiceBillingType
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
}

export interface InvoiceCheckoutResult {
  invoiceId: string
  amount: number
  billingType: InvoiceBillingType
  status: InvoiceStatus
  invoiceUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  pixExpirationDate?: string
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'A pagar',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
  DISPUTED: 'Em disputa',
}

export function invoiceStatusVariant(status: InvoiceStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE') return 'danger'
  if (status === 'DISPUTED') return 'neutral'
  return 'warning' // PENDING
}
