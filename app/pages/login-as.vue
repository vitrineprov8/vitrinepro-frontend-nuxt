<script setup lang="ts">
// A6 — ativação do token de suporte "login-as" gerado por um admin
// (POST /admin/users/:id/login-as, B24). Página pública e enxuta: lê o
// token da query, autentica como o usuário-alvo (mesmo padrão do
// auth/callback.vue no fluxo OAuth) e navega pro app. Pensada pra ser aberta
// numa janela anônima/outro navegador, já que cookies não são isoladas por
// aba — abrir aqui mesmo trocaria a sessão do admin que gerou o token.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Sessão de suporte — VitrinePro' })

const route = useRoute()
const auth = useAuthStore()
const status = ref<'loading' | 'error'>('loading')

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    status.value = 'error'
    return
  }
  const user = await auth.loginWithToken(token)
  if (!user) {
    status.value = 'error'
    return
  }
  await navigateTo('/app')
})
</script>

<template>
  <div class="las">
    <div v-if="status === 'loading'" class="las__box">
      <p>Autenticando sessão de suporte...</p>
    </div>
    <div v-else class="las__box">
      <p>Token de suporte inválido ou expirado.</p>
      <NuxtLink to="/login">Ir para o login</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.las { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--ink-100); }
.las__box { background: var(--white); border-radius: var(--radius-card); padding: var(--sp-6); text-align: center; box-shadow: var(--shadow-md); }
</style>
