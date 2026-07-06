// Tipos do B5 (perfil público de hunter) + B8 (verificação). Contrato:
// ../vitrinepro-bakend/src/hunters/*.

export type HunterVerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface HunterMetrics {
  totalIndicacoes: number
  taxaAproveitamento: number | null
  tempoMedioAteAbordagemDias: number | null
  avaliacaoMedia: number | null
}

/** Resposta de GET /hunters — HuntersService.listDirectory não usa o shape { data, lastPage } do PaginatedResult comum. */
export interface HunterDirectoryResponse {
  items: HunterDirectoryCard[]
  total: number
  page: number
  limit: number
}

/** Item de GET /hunters (T07 — diretório público). */
export interface HunterDirectoryCard {
  username: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  profession: string | null
  location: string | null
  hunterSpecialties: string[] | null
  hunterYearsExperience: number | null
  isVerified: boolean
  metrics: HunterMetrics
}

/** GET /hunters/:username (T08 — perfil público). */
export interface HunterPublicProfile {
  username: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  profession: string | null
  bio: string | null
  location: string | null
  socialLinks: Record<string, string> | null
  hunterSpecialties: string[] | null
  hunterYearsExperience: number | null
  isVerified: boolean
  metrics: HunterMetrics
}

export interface VerificationDocument {
  url: string
  label: string
  uploadedAt: string
}

/** Item de GET /admin/hunters/verifications (A2 — fila de análise). */
export interface HunterVerificationRequest {
  id: string
  username: string | null
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  verificationDocs: VerificationDocument[] | null
  verificationLinkedinUrl: string | null
  verificationRequestedAt: string | null
}

export const VERIFICATION_STATUS_LABEL: Record<HunterVerificationStatus, string> = {
  NONE: 'Não verificado',
  PENDING: 'Em análise',
  APPROVED: 'Verificado',
  REJECTED: 'Recusado',
}

export const VERIFICATION_STATUS_VARIANT: Record<HunterVerificationStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  NONE: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}
