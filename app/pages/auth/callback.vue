<script setup lang="ts">
// /auth/callback — recebe ?token= do redirect OAuth do backend (Google/LinkedIn)
// Backend: GoogleAuthGuard/LinkedInAuthGuard redirecionam para `${FRONTEND_URL}/auth/callback?token=...`
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrando...', robots: 'noindex' })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const error = ref(false)

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    error.value = true
    return
  }
  api.token.value = token
  try {
    await auth.fetchMe()
    if (!auth.user) throw new Error('no-user')

    // Onboarding por persona escolhida no /cadastro (ver PLANO §BACKEND B1 —
    // hoje não há campo `personas` no backend; usamos o valor local como heurística)
    const persona = localStorage.getItem('vp_persona_choice')
    if (persona && !auth.user.isCompany) {
      localStorage.setItem('vp_last_workspace', `/app/${persona}`)
      localStorage.removeItem('vp_persona_choice')
    }

    navigateTo((route.query.redirect as string) || '/app')
  }
  catch {
    api.token.value = null
    error.value = true
  }
})
</script>

<template>
  <div class="callback">
    <template v-if="!error">
      <div class="skeleton callback__spinner" />
      <p class="text-secondary">Entrando na sua conta...</p>
    </template>
    <template v-else>
      <h2>Não foi possível entrar</h2>
      <p class="text-secondary">O link de autenticação expirou ou é inválido.</p>
      <UiButton block @click="navigateTo('/login')">Voltar ao login</UiButton>
    </template>
  </div>
</template>

<style scoped>
.callback { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); text-align: center; }
.callback__spinner { width: 48px; height: 48px; border-radius: var(--radius-full); }
.callback h2 { margin-bottom: 0; }
</style>
