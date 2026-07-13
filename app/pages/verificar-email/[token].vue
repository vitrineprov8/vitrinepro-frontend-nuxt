<script setup lang="ts">
// F10 — Verificação de e-mail (T17). Backend B17 já pronto: POST
// /auth/verify-email/:token (público, 404 inválido/410 expirado, uso único)
// + POST /auth/resend-verification (autenticado, usado só se o link expirou
// e o usuário ainda está logado nesta sessão/navegador).
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Confirmar e-mail' })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const token = route.params.token as string

type State = 'loading' | 'success' | 'invalid' | 'expired' | 'error'
const state = ref<State>('loading')
const resending = ref(false)
const resent = ref(false)

onMounted(async () => {
  try {
    await api.post(`/auth/verify-email/${token}`)
    state.value = 'success'
    // Se o usuário já está logado nesta sessão, refletir emailVerified na hora.
    if (auth.user) await auth.fetchMe()
  }
  catch (e) {
    const err = e as { status?: number }
    if (err.status === 404) state.value = 'invalid'
    else if (err.status === 410) state.value = 'expired'
    else state.value = 'error'
  }
})

async function reenviar() {
  resending.value = true
  try {
    await api.post('/auth/resend-verification')
    resent.value = true
    toast.success('Novo e-mail de confirmação enviado.')
  }
  catch {
    toast.error('Não foi possível reenviar. Faça login e tente novamente pela sua conta.')
  }
  finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="verificar">
    <template v-if="state === 'loading'">
      <div class="skeleton" style="height: 120px;" />
    </template>

    <template v-else-if="state === 'success'">
      <div class="verificar__icon verificar__icon--ok">✓</div>
      <h2>E-mail confirmado!</h2>
      <p class="text-secondary">Sua conta está verificada. Você já pode aproveitar a VitrinePro.</p>
      <UiButton block @click="navigateTo('/app')">Ir para o app</UiButton>
    </template>

    <template v-else-if="state === 'expired'">
      <div class="verificar__icon">⏰</div>
      <h2>Link expirado</h2>
      <p class="text-secondary">Este link de confirmação não é mais válido (expira em 24h). Peça um novo.</p>
      <UiButton v-if="!resent" block :loading="resending" @click="reenviar">Reenviar e-mail de confirmação</UiButton>
      <p v-else class="verificar__resent">Enviado! Confira sua caixa de entrada.</p>
    </template>

    <template v-else-if="state === 'invalid'">
      <div class="verificar__icon">⚠️</div>
      <h2>Link inválido</h2>
      <p class="text-secondary">Este link de confirmação não existe ou já foi usado.</p>
      <UiButton v-if="!resent" block variant="secondary" :loading="resending" @click="reenviar">Reenviar e-mail de confirmação</UiButton>
      <p v-else class="verificar__resent">Enviado! Confira sua caixa de entrada.</p>
    </template>

    <template v-else>
      <div class="verificar__icon">⚠️</div>
      <h2>Algo deu errado</h2>
      <p class="text-secondary">Não conseguimos confirmar seu e-mail agora. Tente novamente em instantes.</p>
    </template>

    <p class="verificar__back">
      <NuxtLink to="/login">← Voltar ao login</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.verificar { text-align: center; }
.verificar__icon { font-size: var(--text-28); margin-bottom: var(--sp-2); }
.verificar__icon--ok { color: var(--brand-600); }
.verificar h2 { margin-bottom: var(--sp-1); }
.verificar .text-secondary { margin-bottom: var(--sp-5); }
.verificar__resent { font-size: var(--text-14); color: var(--brand-700); font-weight: 600; }
.verificar__back { margin-top: var(--sp-6); font-size: var(--text-14); }
</style>
