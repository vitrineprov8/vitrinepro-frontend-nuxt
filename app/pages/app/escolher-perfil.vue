<script setup lang="ts">
// F3 — T-C00 Escolher perfil. Antes disso, app/index.vue mandava direto pro
// workspace hunter (default silencioso) quando não havia persona nem
// vp_last_workspace salvos. Agora existe uma tela real de escolha.
definePageMeta({ layout: 'auth', middleware: 'auth' })
useSeoMeta({ title: 'Como você quer usar o VitrinePro?' })

const auth = useAuthStore()

// Contas empresa não escolhem nada por aqui — a persona é fixa desde o
// cadastro (isCompany=true). Evita expor uma escolha que sempre dá 403.
onMounted(async () => {
  if (!auth.user) await auth.fetchMe()
  if (auth.user?.isCompany) await navigateTo('/app/empresa', { replace: true })
})

type PersonaOption = 'HUNTER' | 'CANDIDATO'

const options: { value: PersonaOption, icon: string, title: string, description: string, to: string }[] = [
  { value: 'HUNTER', icon: '🎯', title: 'Sou recrutador / hunter', description: 'Encontre vagas no marketplace e indique candidatos', to: '/app/hunter' },
  { value: 'CANDIDATO', icon: '👤', title: 'Sou profissional', description: 'Monte seu portfólio e candidate-se a vagas', to: '/app/candidato' },
]

const loading = ref<PersonaOption | null>(null)
const errorMsg = ref('')

const activePersonas = computed(() => auth.user?.personas ?? [])

async function choose(opt: typeof options[number]) {
  errorMsg.value = ''
  loading.value = opt.value
  try {
    // Idempotente no backend — se já ativa, só confirma e segue.
    await auth.activatePersona(opt.value)
    if (import.meta.client) localStorage.setItem('vp_last_workspace', opt.to)
    await navigateTo(opt.to, { replace: true })
  }
  catch {
    errorMsg.value = 'Não foi possível ativar esse perfil agora. Tente novamente.'
  }
  finally {
    loading.value = null
  }
}
</script>

<template>
  <div class="escolher">
    <h2>Como você quer usar o VitrinePro?</h2>
    <p class="text-secondary">Você pode ativar mais de um perfil e trocar depois nas configurações da conta.</p>

    <div v-if="errorMsg" class="escolher__alert" role="alert">{{ errorMsg }}</div>

    <div class="escolher__options">
      <UiCard
        v-for="opt in options" :key="opt.value"
        clickable
        class="persona-card"
        :class="{ 'persona-card--active': activePersonas.includes(opt.value) }"
        @click="choose(opt)"
      >
        <span class="persona-card__icon">{{ opt.icon }}</span>
        <h3 class="persona-card__title">
          {{ opt.title }}
          <span v-if="activePersonas.includes(opt.value)" class="persona-card__badge">já ativo</span>
        </h3>
        <p class="persona-card__description text-secondary">{{ opt.description }}</p>
        <span class="persona-card__cta">
          <span v-if="loading === opt.value" class="persona-card__spinner" aria-hidden="true" />
          {{ loading === opt.value ? 'Entrando...' : (activePersonas.includes(opt.value) ? 'Entrar →' : 'Ativar e entrar →') }}
        </span>
      </UiCard>
    </div>
  </div>
</template>

<style scoped>
.escolher__alert {
  margin: var(--sp-4) 0; padding: var(--sp-3) var(--sp-4);
  background: var(--red-100); color: var(--red-500); border-radius: var(--radius-input); font-size: var(--text-14);
}
.escolher__options { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-6); }
.persona-card { display: flex; flex-direction: column; gap: var(--sp-1); border: 2px solid transparent; align-items: flex-start; }
.persona-card--active { border-color: var(--brand-600); }
.persona-card__icon { font-size: var(--text-22); }
.persona-card__title { margin: 0; font-size: var(--text-15); display: flex; align-items: center; gap: var(--sp-2); }
.persona-card__badge {
  font-size: var(--text-12); font-weight: 600; color: var(--brand-700);
  background: var(--brand-100); padding: 2px var(--sp-2); border-radius: var(--radius-full);
}
.persona-card__description { margin: 0 0 var(--sp-2); font-size: var(--text-13); }
.persona-card__cta { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-13); font-weight: 600; color: var(--brand-700); }
.persona-card__spinner {
  width: 14px; height: 14px; border-radius: var(--radius-full);
  border: 2px solid var(--brand-200, #bbf7d0); border-top-color: var(--brand-700); animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
