// Middleware de rota: exige sessão (igual a `auth`) + role ADMIN.
// Usado nas páginas /app/admin/** — o backend também valida via RolesGuard,
// isto é só para não expor a UI a quem não é admin.
export default defineNuxtRouteMiddleware(async (to) => {
  const token = useCookie<string | null>('vp_token')
  if (!token.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const auth = useAuthStore()
  if (!auth.user) await auth.fetchMe()
  if (auth.user?.role !== 'ADMIN') {
    return navigateTo('/app')
  }
})
