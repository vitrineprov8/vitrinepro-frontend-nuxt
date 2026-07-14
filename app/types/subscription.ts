// B11/M2-M3 — tipos de planos, checkout e assinatura (Asaas sandbox).
// Espelha os DTOs/respostas reais do backend (subscriptions/plans/coupons).
import type { PlanTier } from '~/stores/auth'

export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export interface PlanInfo {
  tier: PlanTier
  name: string
  priceBRL: number
  vagaLimit: number
  seatLimit: number
  features: string[]
}

export interface CreditCardInput {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CheckoutPayload {
  plan: PlanTier
  billingType: AsaasBillingType
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  couponCode?: string
  creditCard?: CreditCardInput
}

export interface CheckoutResult {
  subscriptionId: string
  priceBRL: number
  discountBRL: number
  totalBRL: number
  couponValid: boolean
  couponId?: string
  billingType: AsaasBillingType | null
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  invoiceUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  pixExpirationDate?: string
}

export interface SubscriptionRecord {
  id: string
  userId: string
  plan: PlanTier
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  priceBRL: string
  couponCode: string | null
  discountApplied: string
  startsAt: string | null
  endsAt: string | null
  billingType: AsaasBillingType | null
  asaasPaymentId: string | null
  invoiceUrl: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CouponValidation {
  valid: boolean
  discountType?: 'PERCENT' | 'FIXED'
  discountValue?: number
  ownerId?: string | null
}

export const PLAN_TIER_ORDER: PlanTier[] = ['FREE', 'RECRUITER', 'TEAM', 'ENTERPRISE']

/** Próximo tier acima do atual — usado pelo UpgradeModal para sugerir o upgrade natural. */
export function nextTier(current: PlanTier): PlanTier {
  const i = PLAN_TIER_ORDER.indexOf(current)
  if (i === -1 || i === PLAN_TIER_ORDER.length - 1) return 'TEAM'
  return PLAN_TIER_ORDER[i + 1] ?? 'TEAM'
}
