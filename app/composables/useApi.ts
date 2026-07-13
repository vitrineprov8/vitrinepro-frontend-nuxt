// useApi — cliente HTTP para o backend NestJS (reutilizado de vitrinepro-bakend)
// Auth: Bearer JWT (mesmo contrato do v1). Erros padronizados.
export interface ApiError {
  status: number
  code?: string // ex.: PLAN_LIMIT_REACHED, SEAT_LIMIT_REACHED, PLAN_TIER_REQUIRED
  message: string
  data?: Record<string, unknown>
}

export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('vp_token', {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })

  async function request<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      return await $fetch<T>(path, {
        baseURL: config.public.backendUrl,
        ...opts,
        headers: {
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
          ...(opts.headers || {}),
        },
      })
    }
    catch (err: unknown) {
      const e = err as { status?: number, data?: { code?: string, message?: string } & Record<string, unknown> }
      const apiError: ApiError = {
        status: e.status ?? 0,
        code: e.data?.code,
        message: e.data?.message ?? 'Erro de conexão. Tente novamente.',
        data: e.data,
      }
      // Sessão expirada → limpar token e mandar ao login (exceto nas rotas públicas)
      if (apiError.status === 401 && token.value) {
        token.value = null
        navigateTo(`/login?redirect=${encodeURIComponent(useRoute().fullPath)}`)
      }
      throw apiError
    }
  }

  return {
    token,
    get: <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    // `body` opcional — usado por DELETE /admin/users/:id (B24, exige {reason} no corpo).
    del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  }
}
