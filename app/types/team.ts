// Tipos do Workspace Consultoria (Fase 4). Contrato: ../vitrinepro-bakend/src/teams/*,
// ../vitrinepro-bakend/src/companies/*, ../vitrinepro-bakend/src/vaga-applications/*
// (endpoint me-as-team) e ../vitrinepro-bakend/src/placements/* (endpoint me-as-team).

export type TeamRole = 'OWNER' | 'MANAGER' | 'RECRUITER'
export type TeamMemberStatus = 'PENDING' | 'ACTIVE'

/** GET /me/team — GET /me/team/accessible. */
export interface Team {
  id: string
  name: string
  logoUrl: string | null
  cnpj: string | null
  bio: string | null
  ownerId: string
  members?: TeamMember[]
  createdAt: string
  updatedAt: string
}

/** Item de GET /me/team/accessible (multi-contexto). */
export interface AccessibleTeam {
  id: string
  name: string
  ownerId: string
  role: TeamRole
}

/** GET /me/team/members. */
export interface TeamMember {
  id: string
  teamId: string
  userId: string | null
  invitedEmail: string | null
  role: TeamRole
  status: TeamMemberStatus
  joinedAt: string
  user?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    username: string | null
    avatarUrl: string | null
  } | null
}

/** GET /companies (T-T05 — Clientes). */
export interface Company {
  id: string
  name: string
  logoUrl: string | null
  industry: string | null
  description: string | null
  website: string | null
  ownerId: string
  assignedRecruiters?: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }>
  createdAt: string
  updatedAt: string
}

/** Item de GET /applications/me-as-team (T-T04 — Pipeline Geral). */
export interface TeamPipelineApplication {
  id: string
  vagaId: string
  vagaTitle: string | null
  vagaSlug: string | null
  company: { id: string, name: string, logoUrl: string | null } | null
  assignedTo: {
    id: string
    firstName: string | null
    lastName: string | null
    username: string | null
    avatarUrl: string | null
  } | null
  source: 'DIRECT' | 'HUNTER'
  pipelineStage: string
  snapshotFullName: string
  snapshotEmail: string | null
  snapshotPhone: string | null
  snapshotLocation: string | null
  contactMasked: boolean
  generalScore: number | string | null
  createdAt: string
}

/** Resposta de GET /applications/me-as-team. */
export interface TeamPipelineResponse {
  items: TeamPipelineApplication[]
  stageCounts: Record<string, number>
}

/** Item de GET /placements/me-as-team (T-T07 — Faturamento & Ganhos). */
export interface TeamPlacement {
  id: string
  vagaId: string | null
  vagaTitle: string | null
  company: { id: string, name: string, logoUrl: string | null } | null
  responsavel: {
    id: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    isExternalHunter: boolean
  } | null
  finalSalary: number | string
  feeAmount: number | string | null
  status: 'HIRED' | 'CONFIRMED' | 'DISPUTED' | 'GUARANTEE_BROKEN' | 'REPLACED' | 'FEE_RELEASED' | 'CANCELLED'
  confirmedAt: string | null
  feeReleasedAt: string | null
  createdAt: string
}

/** GET /stats/consultoria (T-T02 — Início). */
export interface ConsultoriaDashboardStats {
  vagasAtivas: number
  candidatosEmProcesso: number
  placementsNoMes: number
  receitaDoMes: number
  pipelineOverview: Array<{ stage: string, count: number }>
  atividadeRecente: Array<{
    vagaId: string
    applicationId: string
    stage: string
    enteredAt: string
    byUserId: string
  }>
}

/** GET /stats/consultoria/ganhos (T-T07 — KPIs de Faturamento). */
export interface ConsultoriaGanhosStats {
  aReceber: number
  recebidoNoAno: number
  placements: number
  ticketMedioFee: number | null
}

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: 'Proprietário',
  MANAGER: 'Gerente',
  RECRUITER: 'Recrutador',
}

export const TEAM_ROLE_DESCRIPTION: Record<TeamRole, string> = {
  OWNER: 'Controle total da consultoria, faturamento e membros.',
  MANAGER: 'Gerencia vagas, clientes e recrutadores.',
  RECRUITER: 'Trabalha vagas e clientes atribuídos.',
}

export const PLACEMENT_STATUS_LABEL: Record<TeamPlacement['status'], string> = {
  HIRED: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  DISPUTED: 'Em disputa',
  GUARANTEE_BROKEN: 'Garantia quebrada',
  REPLACED: 'Substituído',
  FEE_RELEASED: 'Fee liberado',
  CANCELLED: 'Cancelado',
}
