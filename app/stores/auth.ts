// Pinia store de autenticação — contrato do backend NestJS v1 (auth.controller)
import { defineStore } from 'pinia'

export type PlanTier = 'FREE' | 'RECRUITER' | 'TEAM' | 'ENTERPRISE'
export type WorkspaceKind = 'candidato' | 'hunter' | 'consultoria' | 'empresa' | 'admin'

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

  async function register(payload: {
    email: string, password: string, firstName: string, lastName: string
    isCompany?: boolean, companyName?: string, companyIndustry?: string
  }) {
    const res = await api.post<{ access_token: string }>('/auth/register', payload)
    api.token.value = res.access_token
    await fetchMe()
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
   * TODO(backend B2): `POST /auth/forgot-password` não existe ainda (sem módulo de e-mail, B14).
   * Resposta dev