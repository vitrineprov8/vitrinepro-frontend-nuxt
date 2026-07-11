// Tipos do B13 (notificações in-app — sino). Contrato: ../vitrinepro-bakend/src/notifications/*.

export type NotificationType =
  | 'CANDIDATE_SUBMITTED'
  | 'STAGE_CHANGED'
  | 'HUNTER_INTEREST_REQUESTED'
  | 'HUNTER_INTEREST_DECIDED'
  | 'CONSENT_REQUESTED'
  | 'PLACEMENT_HIRED'
  | 'PLACEMENT_CONFIRMED'
  | 'PLACEMENT_DISPUTED'
  | 'PLACEMENT_GUARANTEE_BROKEN'
  | 'PLACEMENT_FEE_RELEASED'
  | 'TEAM_INVITE'
  | 'VERIFICATION_DECIDED'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  data: NotificationItem[]
  total: number
  unreadCount: number
  page: number
  lastPage: number
}

export interface NotificationPreferenceItem {
  type: NotificationType
  inAppEnabled: boolean
  emailEnabled: boolean
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  CANDIDATE_SUBMITTED: 'Novo candidato submetido',
  STAGE_CHANGED: 'Mudança de etapa',
  HUNTER_INTEREST_REQUESTED: 'Novo interesse de hunter',
  HUNTER_INTEREST_DECIDED: 'Interesse decidido',
  CONSENT_REQUESTED: 'Consentimento solicitado',
  PLACEMENT_HIRED: 'Indicação contratada',
  PLACEMENT_CONFIRMED: 'Placement confirmado',
  PLACEMENT_DISPUTED: 'Placement contestado',
  PLACEMENT_GUARANTEE_BROKEN: 'Garantia quebrada',
  PLACEMENT_FEE_RELEASED: 'Comissão liberada',
  TEAM_INVITE: 'Convite para time',
  VERIFICATION_DECIDED: 'Verificação decidida',
}
