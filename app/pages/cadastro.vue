<script setup lang="ts">
// T13 — Cadastro em 2 passos (persona + dados) — design-spec/01
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Criar conta' })

const route = useRoute()
const auth = useAuthStore()
const config = useRuntimeConfig()
const googleAuthEnabled = computed(() => config.public.googleAuthEnabled)
const linkedinAuthEnabled = computed(() => config.public.linkedinAuthEnabled)
const oauthEnabled = computed(() => googleAuthEnabled.value || linkedinAuthEnabled.value)

type Persona = 'hunter' | 'empresa' | 'candidato'

const personas: { value: Persona, icon: string, title: string, description: string }[] = [
  { value: 'hunter', icon: '🎯', title: 'Sou recrutador / hunter', description: 'Encontre vagas no marketplace e indique candidatos' },
  { value: 'empresa', icon: '🏢', title: 'Sou empresa', description: 'Publique vagas e contrate com a ajuda de hunters' },
  { value: 'candidato', icon: '👤', title: 'Sou profissional', description: 'Monte seu portfólio e candidate-se a vagas' },
]

// TODO(backend B12/setor): lista estática — não há endpoint de segmentos cadastrado
const industryOptions = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'educacao', label: 'Educação' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'logistica', label: 'Logística' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outro', label: 'Outro' },
]

const stepperItems = [
  { label: 'Perfil', description: 'Como você vai usar' },
  { label: 'Dados', description: 'Crie sua conta' },
]

const queryPerfil = route.query.perfil as string | undefined
const initialPersona = personas.some(p => p.value === queryPerfil) ? (queryPerfil as Persona) : null

const step = ref(initialPersona ? 1 : 0)
const persona = ref<Persona | null>(initialPersona)

function selectPersona(p: Persona) {
  persona.value = p
  step.value = 1
}

function backToPersona() {
  step.value = 0
}

const personaTitles: Record<Persona, string> = {
  hunter: 'Crie sua conta de hunter',
  empresa: 'Crie sua conta de empresa',
  candidato: 'Crie sua conta de profissional',
}

// Dados do formulário
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const companyName = ref('')
const companyIndustry = ref<string | null>(null)
const cnpjDigits = ref('')
const termsAccepted = ref(false)

function maskCnpj(d: string) {
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const cnpjModel = computed({
  get: () => maskCnpj(cnpjDigits.value),
  set: (v: string) => { cnpjDigits.value = v.replace(/\D/g, '').slice(0, 14) },
})

const loading = ref(false)
const formError = ref('')
const emailExists = ref(false)
const fieldErrors = reactive<{ password?: string, companyName?: string, terms?: string }>({})

function clearErrors() {
  formError.value = ''
  emailExists.value = false
  fieldErrors.password = undefined
  fieldErrors.companyName = undefined
  fieldErrors.terms = undefined
}

function validate() {
  clearErrors()
  let ok = true
  if (password.value.length < 8) {
    fieldErrors.password = 'A senha precisa ter pelo menos 8 caracteres'
    ok = false
  }
  if (persona.value === 'empresa' && !companyName.value.trim()) {
    fieldErrors.companyName = 'Nome da empresa é obrigatório'
    ok = false
  }
  if (!termsAccepted.value) {
    fieldErrors.terms = 'É preciso aceitar os termos para continuar'
    ok = false
  }
  return ok
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    await auth.register({
      email: email.value,
      password: password.value,
      firstName: firstName.value,
      lastName: lastName.value,
      isCompany: persona.value === 'empresa',
      companyName: persona.value === 'empresa' ? companyName.value.trim() : undefined,
      companyIndustry: persona.value === 'empresa' ? (companyIndustry.value ?? undefined) : undefined,
      // B1 — persona persistida no backend (User.personas); ignorada se isCompany=true
      persona: persona.value === 'hunter' ? 'HUNTER' : persona.value === 'candidato' ? 'CANDIDATO' : undefined,
      // TODO(backend B1): CNPJ ainda não existe no DTO de /auth/register — capturado para uso futuro em faturas
    })

    // Workspace inicial pós-cadastro (navegação apenas — persona em si já
    // foi persistida no backend via `auth.register`).
    if (persona.value && persona.value !== 'empresa') {
      localStorage.setItem('vp_last_workspace', `/app/${persona.value}`)
    }

    navigateTo(safeInternalPath(route.query.redirect))
  }
  catch (e) {
    const err = e as { status?: number, message?: string }
    if (err.status === 400 && /e-?mail/i.test(err.message ?? '')) {
      emailExists.value = true
    }
    else if (!err.status) {
      // status 0 = falha de rede: backend provavelmente fora do ar
      formError.value = `Não foi possível conectar ao servidor (${config.public.backendUrl}). Confira se o backend está rodando.`
    }
    else {
      // mostra a mensagem real do servidor para facilitar o diagnóstico
      formError.value = err.message || 'Não foi possível criar sua conta. Tente novamente.'
    }
  }
  finally {
    loading.value = false
  }
}

function oauth(provider: 'google' | 'linkedin') {
  if (persona.value && persona.value !== 'empresa') {
    localStorage.setItem('vp_persona_choice', persona.value)
  }
  window.location.href = `${config.public.backendUrl}/auth/${provider}`
}
</script>

<template>
  <div class="cadastro">
    <UiStepper :steps="stepperItems" :current="step" class="cadastro__stepper" />

    <template v-if="step === 0">
      <h2>Como você quer usar o VitrinePro?</h2>
      <p class="text-secondary">Você pode mudar isso depois nas configurações da conta.</p>

      <div class="cadastro__personas">
        <UiCard
          v-for="p in personas" :key="p.value"
          clickable
          class="persona-card"
          :class="{ 'persona-card--active': persona === p.value }"
          @click="selectPersona(p.value)"
        >
          <span class="persona-card__icon">{{ p.icon }}</span>
          <h3 class="persona-card__title">{{ p.title }}</h3>
          <p class="persona-card__description text-secondary">{{ p.description }}</p>
        </UiCard>
      </div>

      <p class="cadastro__signin">
        Já tem conta? <NuxtLink to="/login"><strong>Entrar</strong></NuxtLink>
      </p>
    </template>

    <template v-else-if="persona">
      <button type="button" class="cadastro__back" @click="backToPersona">← Trocar perfil</button>
      <h2>{{ personaTitles[persona] }}</h2>
      <p class="text-secondary">Leva menos de um minuto.</p>

      <template v-if="oauthEnabled">
        <div class="cadastro__oauth">
          <UiButton v-if="googleAuthEnabled" variant="secondary" block @click="oauth('google')">Continuar com Google</UiButton>
          <UiButton v-if="linkedinAuthEnabled" variant="secondary" block @click="oauth('linkedin')">Continuar com LinkedIn</UiButton>
        </div>
        <div class="cadastro__divider"><span>ou com e-mail</span></div>
      </template>

      <div v-if="formError" class="cadastro__alert" role="alert">{{ formError }}</div>
      <div v-if="emailExists" class="cadastro__alert" role="alert">
        Este e-mail já tem conta. <NuxtLink :to="`/login?email=${encodeURIComponent(email)}`"><strong>Entrar</strong></NuxtLink>
      </div>

      <form class="cadastro__form" @submit.prevent="submit">
        <div class="cadastro__row">
          <UiInput v-model="firstName" label="Nome" autocomplete="given-name" required />
          <UiInput v-model="lastName" label="Sobrenome" autocomplete="family-name" required />
        </div>

        <template v-if="persona === 'empresa'">
          <UiInput v-model="companyName" label="Nome da empresa" required :error="fieldErrors.companyName" autocomplete="organization" />
          <UiSelect v-model="companyIndustry" label="Setor de atuação" :options="industryOptions" placeholder="Selecionar setor" />
          <UiInput
            v-model="cnpjModel" label="CNPJ (opcional)" placeholder="00.000.000/0000-00"
            helper="Usado futuramente para emissão de notas fiscais"
          />
        </template>

        <UiInput v-model="email" label="E-mail" type="email" autocomplete="email" required placeholder="voce@email.com" />
        <div>
          <UiInput v-model="password" label="Senha" type="password" autocomplete="new-password" required :error="fieldErrors.password" />
          <UiPasswordStrength :value="password" />
        </div>

        <label class="cadastro__terms">
          <input v-model="termsAccepted" type="checkbox" class="cadastro__checkbox">
          <span>
            Li e aceito os <NuxtLink to="/termos">Termos de Uso</NuxtLink> e a
            <NuxtLink to="/privacidade">Política de Privacidade</NuxtLink>
          </span>
        </label>
        <p v-if="fieldErrors.terms" class="field__error">{{ fieldErrors.terms }}</p>

        <UiButton type="submit" block :loading="loading">Criar conta</UiButton>
      </form>

      <p class="cadastro__signin">
        Já tem conta? <NuxtLink to="/login"><strong>Entrar</strong></NuxtLink>
      </p>
    </template>
  </div>
</template>

<style scoped>
.cadastro h2 { margin-bottom: var(--sp-1); }
.cadastro__stepper { margin-bottom: var(--sp-6); }

.cadastro__personas { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-6); }
.persona-card { display: flex; flex-direction: column; gap: var(--sp-1); border: 2px solid transparent; }
.persona-card--active { border-color: var(--brand-600); }
.persona-card__icon { font-size: var(--text-22); }
.persona-card__title { margin: 0; font-size: var(--text-15); }
.persona-card__description { margin: 0; font-size: var(--text-13); }

.cadastro__back {
  background: none; border: none; padding: 0; color: var(--ink-500);
  font-size: var(--text-13); cursor: pointer; margin-bottom: var(--sp-2); align-self: flex-start;
}
.cadastro__back:hover { color: var(--ink-900); }

.cadastro__oauth { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-5); }
.cadastro__divider {
  display: flex; align-items: center; gap: var(--sp-3); margin: var(--sp-5) 0;
  color: var(--ink-500); font-size: var(--text-13);
}
.cadastro__divider::before, .cadastro__divider::after { content: ''; flex: 1; height: 1px; background: var(--ink-300); }

.cadastro__alert {
  margin-bottom: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); font-size: var(--text-14);
}

.cadastro__form { display: flex; flex-direction: column; gap: var(--sp-4); }
.cadastro__row { display: flex; gap: var(--sp-3); }
.cadastro__row > * { flex: 1; }

.cadastro__terms { display: flex; align-items: flex-start; gap: var(--sp-2); font-size: var(--text-13); cursor: pointer; }
.cadastro__checkbox { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--brand-600); flex-shrink: 0; }
.field__error { font-size: var(--text-12); color: var(--red-500); margin: 0; }

.cadastro__signin { margin-top: var(--sp-6); text-align: center; font-size: var(--text-14); }

@media (max-width: 640px) {
  .cadastro__row { flex-direction: column; gap: var(--sp-4); }
}
</style>
