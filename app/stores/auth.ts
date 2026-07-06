// Pinia store de autenticação — contrato do backend NestJS v1 (auth.controller)
import { defineStore } from 'pinia'
import type { HunterVerificationStatus, VerificationDocument } from '~/types/hunter'

export type PlanTier = 'FREE' | 'RECRUITER' | 'TEAM' | 'ENTERPRISE'
export type WorkspaceKind = 'candidato' | 'hunter' | 'consultoria' | 'empresa' | 'admin'
/** B1 — persona/role de produto (backend `UserPersona`). */
export type Persona = 'CANDIDATO' | 'HUNTER' | 'EMPRESA'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string | null
  avatarUrl: string | null
  role: 'USER' | 'ADMIN'
  plan: PlanTier
  planStatus: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'PENDING'
  planExpiresAt: string | null
  isCompany: boolean
  companyName: string | null
  isVisible: boolean
  activeContextTeamId: string | null
  /** B1 — personas ativas da conta; null/[] em contas antigas pré-migração. */
  personas: Persona[] | null
  /** B5 — chips de especialidade e anos de experiência do hunter. */
  hunterSpecialties: string[] | null
  hunterYearsExperience: number | null
  /** B8 — gate do marketplace: só APPROVED pode trabalhar vagas com fee. */
  verificationStatus: HunterVerificationStatus
  verificationRejectionReason: string | null
  verificationDocs: VerificationDocument[] | null
  verificationLinkedinUrl: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const api = useApi()

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  /** Plano efetivo: só vale se ACTIVE e não expirado (RN-PLAN-01) */
  const effectivePlan = computed<PlanTier>(() => {
    const u = user.value
    if (!u) return 'FREE'
    const active = u.planStatus === 'ACTIVE' && u.planExpiresAt && new Date(u.planExpiresAt) > new Date()
    return active ? u.plan : 'FREE'
  })

  async function fetchMe() {
    if (!api.token.value) return
    loading.value = true
    try {
      user.value = await api.get<User>('/profile/me')
    }
    catch {
      user.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ access_token: string }>('/auth/login', { email, password })
    api.token.value = res.access_token
    await fetchMe()
  }

  /** Aplica um token vindo do OAuth (callback) e carrega o usuário.
   *  Usa a MESMA instância de api do store para o token não ficar dessincronizado. */
  async function loginWithToken(token: string) {
    api.token.value = token
    await fetchMe()
    return user.value
  }

  async function register(payload: {
    email: string, password: string, firstName: string, lastName: string
    isCompany?: boolean, companyName?: string, companyIndustry?: string
    /** B1 — persona escolhida no passo 1 do /cadastro. Ignorada se isCompany=true. */
    persona?: 'CANDIDATO' | 'HUNTER'
  }) {
    const res = await api.post<{ access_token: string }>('/auth/register', payload)
    api.token.value = res.access_token
    await fetchMe()
  }

  /**
   * B1 — Ativa uma persona adicional (CANDIDATO/HUNTER) na conta já
   * autenticada — usado no fluxo OAuth (persona é escolhida antes do
   * redirect, mas só pode ser persistida depois que o usuário existe).
   * Idempotente no backend; erros são engolidos (não bloqueia o login).
   */
  async function activatePersona(persona: 'CANDIDATO' | 'HUNTER') {
    try {
      const updated = await api.patch<User>('/profile/me/personas', { persona })
      user.value = updated
    }
    catch {
      // não crítico — o usuário pode ativar a persona depois manualmente
    }
  }

  function logout() {
    api.token.value = null
    user.value = null
    navigateTo('/login')
  }

  /** Troca de contexto ativo ANTES de navegar (regra do WorkspaceSwitcher, 00 §3.9) */
  async function setActiveContext(teamId: string | null) {
    await api.patch('/profile/me/active-context', { teamId })
    if (user.value) user.value.activeContextTeamId = teamId
  }

  /**
   * B2 — Solicita link de redefinição de senha. Backend responde sempre com
   * mensagem genérica (anti-enumeração), independente do e-mail existir.
   */
  async function forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email })
  }

  /**
   * B2 — Redefine a senha a partir do token emailado.
   * Token expira em 1h (backend); 404/410 = link inválido ou expirado.
   */
  async function resetPassword(token: string, password: string) {
    await api.post(`/auth/reset-password/${token}`, { password })
  }

  return { user, loading, isAuthenticated, isAdmin, effectivePlan, fetchMe, login, loginWithToken, register, logout, setActiveContext, forgotPassword, resetPassword, activatePersona }
})
