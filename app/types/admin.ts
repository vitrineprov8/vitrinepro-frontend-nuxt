// Tipos do painel Admin (design-spec/06 §A). Contrato:
// ../vitrinepro-bakend/src/admin-users/*, /placements/* (B22 split), /vagas/admin-vagas.controller.ts
import type { PlanTier } from '~/stores/auth'

export type PlanStatus = 'NONE' | 'ACTIVE' | 'EXPIRED' | 'PENDING'

// A6 — GET /admin/users (B24). Nunca inclui password/tokens (ADMIN_USER_LIST_FIELDS no backend).
export interface AdminUserListItem {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  role: 'USER' | 'ADMIN'
  personas: string[] | null
  plan: PlanTier
  planStatus: PlanStatus
  planExpiresAt: string | null
  isCompany: boolean
  companyName: string | null
  isActive: boolean
  createdAt: string
}

export const PLAN_TIER_OPTIONS: { value: PlanTier, label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'RECRUITER', label: 'Recruiter' },
  { value: 'TEAM', label: 'Team' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

// A6 — vagas (admin/list), agora com dono resumido (owner join no backend).
export interface AdminVagaOwner {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  companyName: string | null
  isCompany: boolean
}
export interface AdminVagaListItem {
  id: string
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  type: string | null
  workMode: string | null
  createdAt: string
  createdBy?: AdminVagaOwner | null
}

// A5 — cupons (design-spec/06 §A). Tab 1 (resgates) já existia; tab 2
// (campanhas) é CRUD novo desta rodada.
export type DiscountType = 'PERCENT' | 'FIXED'
export interface AdminCouponRedemption {
  id: string
  couponId: string
  coupon: {
    id: string
    code: string
    discountType: DiscountType
    discountValue: number
    owner: { id: string, firstName: string | null, lastName: string | null, email: string } | null
  } | null
  redeemedById: string | null
  redeemedBy: { id: string, firstName: string | null, lastName: string | null, email: string } | null
  subscriptionId: string | null
  status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED'
  bonusGranted: boolean
  createdAt: string
}
export interface AdminCouponCampaign {
  id: string
  code: string
  discountType: DiscountType
  discountValue: number | string
  isActive: boolean
  validFrom: string | null
  validUntil: string | null
  usageLimit: number | null
  usageCount: number
  createdAt: string
}

// A3/A4 — GET /admin/placements (listagem global; A3 usa ?status=DISPUTED).
export interface AdminPlacementListItem {
  id: string
  status: string
  finalSalary: number | string
  feeAmount: number | string | null
  hunterShareAmount: number | string | null
  platformShareAmount: number | string | null
  confirmedAt: string | null
  guaranteeEndsAt: string | null
  feeReleasedAt: string | null
  disputedAt: string | null
  disputeReason: string | null
  createdAt: string
  candidateName: string | null
  vaga: { id: string, title: string, slug: string } | null
  company: { id: string, name: string, email: string } | null
  hunter: { id: string, name: string, email: string } | null
}

// Empresas (F13, B22 — split negociável).
export interface AdminCompanyListItem {
  id: string
  companyName: string | null
  email: string
  plan: PlanTier
  vagasCount: number
  placementsCount: number
  platformSharePercent: number
  isCustomSplit: boolean
}
export interface AdminCompanySplitHistoryEntry {
  changedAt: string
  changedByAdminId: string
  previousPercent: number | null
  newPercent: number
  reason: string
}
export interface AdminCompanySplitUpdateResponse {
  id: string
  platformSharePercent: number
  placementSplitHistory: AdminCompanySplitHistoryEntry[]
}
