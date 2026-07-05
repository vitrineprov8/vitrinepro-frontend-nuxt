<script setup lang="ts">
// T15 — Redefinir senha (design-spec/01) — ver auth.resetPassword (backend B2 ✅)
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Redefinir senha' })

const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const token = route.params.token as string

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const formError = ref('')
const tokenInvalid = ref(false)

const passwordError = computed(() => {
  if (!password.value) return undefined
  return password.value.length < 8 ? 'A senha precisa ter pelo menos 8 caracteres' : undefined
})

const confirmError = computed(() => {
  if (!confirmPassword.value) return undefined
  return confirmPassword.value !== password.value ? 'As senhas não coincidem' : undefined
})

const canSubmit = computed(() =>
  password.value.length >= 8 && confirmPassword.value === password.value,
)

async function submit() {
  if (!canSubmit.value) return
  formError.value = ''
  loading.value = true
  try {
    await auth.resetPassword(token, password.value)
    toast.success('Senha redefinida com sucesso')
    navigateTo('/login?reset=success')
  }
  catch (e) {
    const err = e as { status?: number }
    if (err.status === 410 || err.status === 404) {
      tokenInvalid.value = true
    }
    else {
      formError.value = 'Não foi possível redefinir sua senha. Tente novamente.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="redefinir">
    <template v-if="!tokenInvalid">
      <h2>Crie uma nova senha</h2>
      <p class="text-secondary">Escolha uma senha forte para proteger sua conta.</p>

      <div v-if="formError" class="redefinir__alert" role="alert">{{ formError }}</div>

      <form class="redefinir__form" @submit.prevent="submit">
        <div>
          <UiInput v-model="password" label="Nova senha" type="password" autocomplete="new-password" required :error="passwordError" />
          <UiPasswordStrength :value="password" />
        </div>
        <UiInput v-model="confirmPassword" label="Confirmar senha" type="password" autocomplete="new-password" required :error="confirmError" />
        <UiButton type="submit" block :loading="loading" :disabled="!canSubmit">Salvar nova senha</UiButton>
      </form>
    </template>

    <template v-else>
      <div class="redefinir__icon">⚠️</div>
      <h2>Link inválido ou expirado</h2>
      <p class="text-secondary">Este link de redefinição de senha não é mais válido. Solicite um novo link para continuar.</p>
      <UiButton block @click="navigateTo('/recuperar-senha')">Pedir novo link</UiButton>
    </template>

    <p class="redefinir__back">
      <NuxtLink to="/login">← Voltar ao login</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.redefinir h2 { margin-bottom: var(--sp-1); }
.redefinir__alert {
  margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); font-size: var(--text-14);
}
.redefinir__form { display: flex; flex-direction: column; gap: var(--sp-4); margin-top: var(--sp-6); }
.redefinir__icon { font-size: var(--text-28); margin-bottom: var(--sp-2); }
.redefinir__back { margin-top: var(--sp-6); text-align: center; font-size: var(--text-14); }
</style>
