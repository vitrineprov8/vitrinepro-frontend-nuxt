// Middleware de rota: exige sessão para /app/**
export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>('vp_token')
  if (!token.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
