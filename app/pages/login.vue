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

// B27 — login em 2 etapas. `challengeToken` fica só em memória (nunca no
// cookie): o backend o rejeita em rotas autenticadas, ele só serve pro
// POST /auth/2fa/verify.
const step = ref<'credentials' | 'twoFactor'>('credentials')
const challengeToken = ref('')
const twoFactorCode = ref('')
const useBackupCode = ref(false)
// UiInput expõe `focus()` (ver defineExpose lá) — `ref` num componente
// devolve a instância, não o elemento.
const codeInput = ref<{ focus: () => void } | null>(null)

async function submit() {
  formError.value = ''
  loading.value = true
  try {
    const res = await auth.login(email.value, password.value)

    if (res.twoFactorRequired) {
      challengeToken.value = res.challengeToken
      step.value = 'twoFactor'
      // Foca o campo do código assim que ele existir no DOM.
      await nextTick()
      codeInput.value?.focus()
      return
    }

    navigateTo(res.twoFactorSetupRequired
      // ADMIN sem 2FA: obrigatório ativar (B27). Não bloqueamos o login — seria
      // um deadlock — mas mandamos direto pra tela de ativação.
      ? '/app/conta?2fa=required'
      : safeInternalPath(route.query.redirect))
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

async function submitTwoFactor() {
  formError.value = ''
  loading.value = true
  try {
    const res = await auth.verifyTwoFactor(challengeToken.value, twoFactorCode.value)

    if (res.usedBackupCode) {
      useToast().warning(
        `Você entrou com um código de recuperação. Restam ${res.backupCodesRemaining}.`,
      )
    }

    navigateTo(safeInternalPath(route.query.redirect))
  }
  catch (e) {
    const err = e as { status?: number, message?: string }
    if (err.status === 429) {
      formError.value = 'Muitas tentativas. Aguarde um minuto e tente de novo.'
    }
    else if (err.status === 401) {
      // O challenge token expira em 5 min — distinguir "código errado" de
      // "sessão de verificação expirada" evita o usuário ficar tentando códigos
      // novos contra um token morto.
      const expired = (err.message ?? '').toLowerCase().includes('expirada')
      formError.value = expired
        ? 'A verificação expirou. Faça login novamente.'
        : 'Código inválido. Tente novamente.'
      if (expired) backToCredentials()
    }
    else {
      formError.value = 'Não foi possível verificar. Tente novamente.'
    }
    twoFactorCode.value = ''
  }
  finally {
    loading.value = false
  }
}

function backToCredentials() {
  step.value = 'credentials'
  challengeToken.value = ''
  twoFactorCode.value = ''
  useBackupCode.value = false
  password.value = ''
}

const config = useRuntimeConfig()
const googleAuthEnabled = computed(() => config.public.googleAuthEnabled)
const linkedinAuthEnabled = computed(() => config.public.linkedinAuthEnabled)
const oauthEnabled = computed(() => googleAuthEnabled.value || linkedinAuthEnabled.value)
function oauth(provider: 'google' | 'linkedin') {
  window.location.href = `${config.public.backendUrl}/auth/${provider}`
}
</script>

<template>
  <div class="login">
    <!-- ETAPA 1 — credenciais -->
    <template v-if="step === 'credentials'">
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

      <template v-if="oauthEnabled">
        <div class="login__divider"><span>ou</span></div>

        <div class="login__oauth">
          <UiButton v-if="googleAuthEnabled" variant="secondary" block @click="oauth('google')">Continuar com Google</UiButton>
          <UiButton v-if="linkedinAuthEnabled" variant="secondary" block @click="oauth('linkedin')">Continuar com LinkedIn</UiButton>
        </div>
      </template>

      <p class="login__signup">
        Não tem conta? <NuxtLink to="/cadastro"><strong>Criar conta grátis</strong></NuxtLink>
      </p>
    </template>

    <!-- ETAPA 2 — B27: verificação em duas etapas -->
    <template v-else>
      <h2>Verificação em duas etapas</h2>
      <p class="text-secondary">
        {{ useBackupCode
          ? 'Digite um dos seus códigos de recuperação.'
          : 'Digite o código de 6 dígitos do seu app autenticador.' }}
      </p>

      <div v-if="formError" class="login__alert" role="alert">{{ formError }}</div>

      <form class="login__form" @submit.prevent="submitTwoFactor">
        <!-- inputmode numeric + autocomplete one-time-code: o teclado do
             celular abre em números e o iOS oferece o código automaticamente. -->
        <UiInput
          ref="codeInput"
          v-model="twoFactorCode"
          :label="useBackupCode ? 'Código de recuperação' : 'Código de verificação'"
          :placeholder="useBackupCode ? 'XXXX-XXXX' : '000000'"
          :inputmode="useBackupCode ? 'text' : 'numeric'"
          :maxlength="useBackupCode ? 9 : 6"
          autocomplete="one-time-code"
          autofocus
          required
        />
        <UiButton type="submit" block :loading="loading">Verificar</UiButton>
      </form>

      <div class="login__2fa-actions">
        <button type="button" class="login__link-btn" @click="useBackupCode = !useBackupCode; twoFactorCode = ''">
          {{ useBackupCode ? 'Usar código do app' : 'Não consigo acessar o app' }}
        </button>
        <button type="button" class="login__link-btn" @click="backToCredentials">
          Voltar
        </button>
      </div>
    </template>
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
  display: flex; align-items: center; gap: var(--sp-3); margin: var(--sp-6) 0;
  color: var(--ink-500); font-size: var(--text-13);
}
.login__divider::before, .login__divider::after { content: ''; flex: 1; height: 1px; background: var(--ink-300); }
.login__oauth { display: flex; flex-direction: column; gap: var(--sp-3); }
.login__signup { margin-top: var(--sp-6); text-align: center; font-size: var(--text-14); }

/* B27 — etapa de verificação em duas etapas */
.login__2fa-actions {
  display: flex; flex-wrap: wrap; justify-content: space-between;
  gap: var(--sp-2); margin-top: var(--sp-5);
}
.login__link-btn {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--brand-700); font-size: var(--text-13); text-decoration: underline;
}
.login__link-btn:hover { color: var(--brand-900, var(--brand-700)); }
</style>
