<script setup lang="ts">
// T14 — Recuperar senha (design-spec/01)
// Resposta sempre genérica (anti-enumeração) — ver auth.forgotPassword (TODO backend B2)
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Recuperar senha' })

const auth = useAuthStore()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const cooldown = ref(0)

let timer: ReturnType<typeof setInterval> | undefined

function startCooldown() {
  cooldown.value = 60
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function submit() {
  loading.value = true
  try {
    await auth.forgotPassword(email.value)
  }
  finally {
    loading.value = false
    sent.value = true
    startCooldown()
  }
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="recuperar">
    <template v-if="!sent">
      <h2>Recuperar senha</h2>
      <p class="text-secondary">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>

      <form class="recuperar__form" @submit.prevent="submit">
        <UiInput v-model="email" label="E-mail" type="email" autocomplete="email" required placeholder="voce@email.com" />
        <UiButton type="submit" block :loading="loading">Enviar link</UiButton>
      </form>
    </template>

    <template v-else>
      <div class="recuperar__icon">📩</div>
      <h2>Verifique seu e-mail</h2>
      <p class="text-secondary">
        Se <strong>{{ email }}</strong> estiver cadastrado, você vai receber um e-mail com instruções para redefinir sua senha em alguns minutos.
      </p>

      <UiButton variant="secondary" block :disabled="cooldown > 0" @click="submit">
        Reenviar{{ cooldown > 0 ? ` (${cooldown}s)` : '' }}
      </UiButton>
    </template>

    <p class="recuperar__back">
      <NuxtLink to="/login">← Voltar ao login</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.recuperar h2 { margin-bottom: var(--sp-1); }
.recuperar__form { display: flex; flex-direction: column; gap: var(--sp-4); margin-top: var(--sp-6); }
.recuperar__icon { font-size: var(--text-28); margin-bottom: var(--sp-2); }
.recuperar__back { margin-top: var(--sp-6); text-align: center; font-size: var(--text-14); }
</style>
