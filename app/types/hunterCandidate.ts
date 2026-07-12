// Tipos do B3 — pool de candidatos do hunter (T-H08). Contrato: ../vitrinepro-bakend/src/hunter-candidates.
import type { PlacementSummary } from './placement'

export type ConsentStatus = 'PENDING' | 'GRANTED' | 'DECLINED'

export interface HunterCandidate {
  id: string
  hunterId: string
  fullName: string
  email: string
  phone: string | null
  linkedinUrl: string | null
  headline: string | null
  location: string | null
  cvUrl: string | null
  notes: string | null
  linkedUserId: string | null
  consentStatus: ConsentStatus
  consentRequestedAt: string | null
  consentDecidedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Resposta de POST /hunter-candidates/:id/request-consent (consentToken só em dev). */
export interface ConsentRequestResult {
  status: ConsentStatus
  consentToken?: string
}

/** Item de GET /hunter-candidates/submissions (VagaApplication com relações). */
export interface HunterSubmission {
  id: string
  vagaId: string
  hunterCandidateId: string | null
  pipelineStage: string
  isRejected: boolean
  createdAt: string
  vaga?: { id: string, slug: string, title: string, status: string } | null
  hunterCandidate?: { id: string, fullName: string } | null
  /** B9/Placement — presente quando essa submissão virou uma contratação. */
  placement?: PlacementSummary | null
}

export const CONSENT_LABEL: Record<ConsentStatus, string> = {
  GRANTED: 'Autorizado',
  PENDING: 'Pendente',
  DECLINED: 'Recusado',
}

export const CONSENT_VARIANT: Record<ConsentStatus, 'success' | 'warning' | 'danger'> = {
  GRANTED: 'success',
  PENDING: 'warning',
  DECLINED: 'danger',
}
