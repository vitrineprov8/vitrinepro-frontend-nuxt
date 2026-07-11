// Tipos da Vaga — espelham a entidade NestJS em ../vitrinepro-bakend/src/vagas/vaga.entity.ts
// Mantido alinhado ao backend reutilizado. NÃO inventar campos que o backend não retorna.

export type VagaStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type VagaType = 'CLT' | 'PJ' | 'FREELA' | 'ESTAGIO'
export type VagaWorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE'
export type VagaSegment =
  | 'COMERCIO_VENDAS' | 'LOGISTICA_TRANSPORTE' | 'FINANCAS_CONTABILIDADE'
  | 'ADMINISTRATIVO' | 'TECNOLOGIA' | 'RH' | 'SAUDE' | 'EDUCACAO'
  | 'MARKETING' | 'JURIDICO' | 'OUTROS'

export interface Vaga {
  id: string
  title: string
  slug: string
  description: string
  requirements: string | null
  benefits: string | null
  location: string | null
  type: VagaType | null
  workMode: VagaWorkMode | null
  salaryMin: number | string | null // numeric do Postgres pode chegar como string
  salaryMax: number | string | null
  deadline: string | null
  status: VagaStatus
  publishedAt: string | null
  segment: VagaSegment | null
  /** Vaga aceita interesse de hunters externos. */
  allowHunters: boolean
  /** WhatsApp/telefone mostrado aos hunters quando allowHunters=true. */
  hunterContactPhone: string | null
  /** B4 — fee % sobre o salário contratado (ex.: 50 = 50%). */
  feePercent: number | string | null
  /** B4 — valor fixo do fee em R$ (alternativa/complemento ao feePercent). */
  feeAmount: number | string | null
  /** B4 — máx. de hunters com interesse ACEITO simultâneo. Default 5. */
  maxHunters: number
  /** B4 — janela de exclusividade (dias) contra resubmissão do mesmo candidato. Default 90. */
  exclusivityDays: number
  createdAt: string
  updatedAt: string
  /** Só presente em /vagas/me (listMine). Ausente no público. */
  applicationsCount?: number
  /** T-E03 — só presente em /vagas/me quando allowHunters=true. */
  hunterInterestsAcceptedCount?: number
  /** T-E03 — só presente em /vagas/me quando allowHunters=true. */
  hunterInterestsPendingCount?: number
  /** Carregado em GET /vagas/:slug (findBySlugPublic). */
  company?: VagaCompany | null
}

export interface VagaCompany {
  id: string
  name: string
  logoUrl: string | null
}

/** B6 — projeção enxuta de GET /empresas/:slug (vagasAbertas). Não é o Vaga completo. */
export interface CompanyVagaSummary {
  id: string
  slug: string
  title: string
  location: string | null
  type: VagaType | null
  workMode: VagaWorkMode | null
  segment: VagaSegment | null
  salaryMin: number | string | null
  salaryMax: number | string | null
  publishedAt: string | null
  allowHunters?: boolean
  feePercent?: number | string | null
  feeAmount?: number | string | null
}

/** B4 — item de GET /me/hunter-interests (vaga aninhada com termos). */
export interface HunterInterestVaga {
  id: string
  title: string
  slug: string
  segment: VagaSegment | null
  status: VagaStatus
  location: string | null
  feePercent: number | string | null
  feeAmount: number | string | null
  maxHunters: number
  exclusivityDays: number
  hunterContactPhone: string | null
  contactEmail: string | null
}

export interface HunterInterest {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  termsAcceptedAt: string | null
  createdAt: string
  vaga: HunterInterestVaga | null
}

// Currículo do candidato (GET /cv)
export interface CV {
  id: string
  label: string | null
  fileUrl: string | null
  isActive?: boolean
  createdAt: string
}

// Item de GET /me/applications
export interface MyApplication {
  id: string
  pipelineStage: string | null
  isRejected: boolean
  message: string | null
  createdAt: string
  vaga: { id: string, slug: string, title: string, status: VagaStatus } | null
}

// Forma de paginação do backend (common/paginate.helper.ts)
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  lastPage: number
}

// Rótulos PT-BR para exibição
export const VAGA_TYPE_LABEL: Record<VagaType, string> = {
  CLT: 'CLT', PJ: 'PJ', FREELA: 'Freela', ESTAGIO: 'Estágio',
}
export const VAGA_WORK_MODE_LABEL: Record<VagaWorkMode, string> = {
  REMOTE: 'Remoto', HYBRID: 'Híbrido', ONSITE: 'Presencial',
}
export const VAGA_SEGMENT_LABEL: Record<VagaSegment, string> = {
  COMERCIO_VENDAS: 'Comércio e Vendas',
  LOGISTICA_TRANSPORTE: 'Logística e Transporte',
  FINANCAS_CONTABILIDADE: 'Finanças e Contabilidade',
  ADMINISTRATIVO: 'Administrativo',
  TECNOLOGIA: 'Tecnologia',
  RH: 'RH',
  SAUDE: 'Saúde',
  EDUCACAO: 'Educação',
  MARKETING: 'Marketing',
  JURIDICO: 'Jurídico',
  OUTROS: 'Outros',
}

// Slugs SEO para a rota /vagas/[segmento]
export const VAGA_SEGMENT_SLUG: Record<VagaSegment, string> = {
  COMERCIO_VENDAS: 'comercio-vendas',
  LOGISTICA_TRANSPORTE: 'logistica-transporte',
  FINANCAS_CONTABILIDADE: 'financas-contabilidade',
  ADMINISTRATIVO: 'administrativo',
  TECNOLOGIA: 'tecnologia',
  RH: 'rh',
  SAUDE: 'saude',
  EDUCACAO: 'educacao',
  MARKETING: 'marketing',
  JURIDICO: 'juridico',
  OUTROS: 'outros',
}

const SLUG_TO_SEGMENT = Object.fromEntries(
  Object.entries(VAGA_SEGMENT_SLUG).map(([seg, slug]) => [slug, seg as VagaSegment]),
) as Record<string, VagaSegment>

export function segmentFromSlug(slug: string): VagaSegment | null {
  return SLUG_TO_SEGMENT[slug] ?? null
}

export const VAGA_SEGMENTS: VagaSegment[] = Object.keys(VAGA_SEGMENT_LABEL) as VagaSegment[]
