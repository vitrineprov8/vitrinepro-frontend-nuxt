// Tipos do fluxo de Placement (P1-P4, design-spec/06 §P). Contrato:
// ../vitrinepro-bakend/src/placements/* (entidade, service, controller) e
// ../vitrinepro-bakend/src/stats/* (GET /stats/hunter/ganhos).
//
// PLACEMENT_STATUS_LABEL já existe em ~/types/team.ts (usado por T-T07) —
// reexportado aqui para ter um único ponto de import no código de Placement.
import { PLACEMENT_STATUS_LABEL, type TeamPlacement } from './team'

export type PlacementStatus = TeamPlacement['status']
export type PlacementRegime = 'CLT' | 'PJ'

/** Shape completo de um Placement (GET /me/placements/hunter, /placements/:id/timeline). */
export interface Placement {
  id: string
  applicationId: string
  vagaId: string | null
  vaga?: { id: string, title: string, slug: string } | null
  markedById: string | null
  hunterId: string | null
  finalSalary: number | string
  regime: PlacementRegime | null
  startDate: string | null
  feeAmount: number | string | null
  hunterShareAmount: number | string | null
  platformShareAmount: number | string | null
  platformSharePercentApplied: number | null
  termsAcceptedAt: string | null
  status: PlacementStatus
  confirmedAt: string | null
  autoConfirmed: boolean
  guaranteeEndsAt: string | null
  feeReleasedAt: string | null
  disputedAt: string | null
  disputeReason: string | null
  disputeResolvedAt: string | null
  departureReportedAt: string | null
  departureDate: string | null
  departureReason: string | null
  replacedByPlacementId: string | null
  createdAt: string
  updatedAt: string
}

/** Resumo anexado a Application (GET /vaga-applications/vaga/:id, /hunter-candidates/submissions). */
export interface PlacementSummary {
  id: string
  status: PlacementStatus
}

/** Step de GET /placements/:id/timeline (P3 — linha do tempo visual). */
export interface PlacementTimelineStep {
  key: 'HIRED' | 'CONFIRMED' | 'GUARANTEE' | 'FEE_RELEASED'
  label: string
  at: string | null
  done: boolean
}

export interface PlacementTimelineResponse {
  placement: Placement
  steps: PlacementTimelineStep[]
}

export { PLACEMENT_STATUS_LABEL }

export const PLACEMENT_REGIME_LABEL: Record<PlacementRegime, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
}

export function placementStatusVariant(status: PlacementStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'CONFIRMED' || status === 'FEE_RELEASED') return 'success'
  if (status === 'DISPUTED' || status === 'GUARANTEE_BROKEN') return 'danger'
  if (status === 'CANCELLED' || status === 'REPLACED') return 'neutral'
  return 'warning' // HIRED (aguardando confirmação)
}

export const PLACEMENT_GUARANTEE_DAYS = 90
export const PLACEMENT_AUTO_CONFIRM_DAYS = 7
