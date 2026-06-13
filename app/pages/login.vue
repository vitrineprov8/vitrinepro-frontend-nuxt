<script setup lang="ts">
// T12 — Login (design-spec/01)
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrar' })

const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const formError = ref('')

async function submit() {
  formError.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    navigateTo((route.query.redirect as string) || '/app')
  }
  catch (e) {
    const err = e as { status?: number }
    formError.value = err.status === 401 || err.status === 400
      ? 'E-mail ou senha incorretos'
      : 'Não foi possível entrar. Tente novamente.'
  }
  finally {
    loading.value = false
  }
}

const config = useRuntimeConfig()
function oauth(provider: 'google' | 'linkedin') {
  window.location.href = `${config.public.backendUrl}/auth/${provider}`
}
</script>

<template>
  <div class="login">
    <h2>Bem-vindo de volta</h2>
    <p class="text-secondary">Entre para acessar seu painel</p>

    <div v-if="route.query.reset === 'success'" class="login__banner login__banner--success" role="status">
      Senha redefinida com sucesso. Entre com sua nova senha.
    </div>
    <div v-if="formError" class="login__alert" role="alert">{{ formError }}</div>

    <form class="login__form" @submit.prevent="submit">
      <UiInput v-model="email" label="E-mail" type="email" autocomplete="email" required placeholder="voce@email.com" />
      <div>
        <UiInput v-model="password" label="Senha" type="password" autocomplete="current-password" required />
        <NuxtLink to="/recuperar-senha" class="login__forgot">Esqueci minha senha</NuxtLink>
      </div>
      <UiButton type="submit" block :loading="loading">Entrar</UiButton>
    </form>

    <div class="login__divider"><span>ou</span></div>

    <div class="login__oauth">
      <UiButton variant="secondary" block @click="oauth('google')">Continuar com Google</UiButton>
      <UiButton variant="secondary" block @click="oauth('linkedin')">Continuar com LinkedIn</UiButton>
    </div>

    <p class="login__signup">
      Não tem conta? <NuxtLink to="/cadastro"><strong>Criar conta grátis</strong></NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.login h2 { margin-bottom: var(--sp-1); }
.login__alert {
  margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); font-size: var(--text-14);
}
.login__banner--success {
  margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  background: var(--brand-100); color: var(--brand-700);
  border-radius: var(--radius-input); font-size: var(--text-14);
}
.login__form { display: flex; flex-direction: column; gap: var(--sp-4); margin-top: var(--sp-6); }
.login__forgot { display: block; text-align: right; font-size: var(--text-13); margin-top: var(--sp-1); }
.login__divider {
  display: flex; align-items: c