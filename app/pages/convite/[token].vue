<script setup lang="ts">
// T16 — Aceitar convite de time (B7).
// GET /public/team-invite/:token é público (sem auth) — mostra quem convidou e para qual e-mail.
// POST /team-invite/:token/accept exige login com o MESMO e-mail do convite.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Convite de time — VitrinePro', robots: 'noindex' })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const token = computed(() => String(route.params.token || ''))

interface InviteInfo {
  teamName: string
  role: 'OWNER' | 'MANAGER' | 'RECRUITER'
  invitedEmail: string
  status: 'PENDING' | 'ACTIVE'
}

const ROLE_LABEL: Record<InviteInfo['role'], string> = {
  OWNER: 'Proprietário(a)',
  MANAGER: 'Gerente',
  RECRUITER: 'Recrutador(a)',
}

const { data: invite } = await useAsyncData(`team-invite-${token.value}`, () =>
  api.get<InviteInfo>(`/public/team-invite/${token.value}`).catch(() => null))

type Phase = 'idle' | 'accepting' | 'accepted' | 'error'
const phase = ref<Phase>('idle')
const errorMessage = ref('')

const emailMatches = computed(() =>
  !!invite.value && !!auth.user
  && auth.user.email.toLowerCase() === invite.value.invitedEmail.toLowerCase(),
)

async function accept() {
  if (!invite.value || phase.value === 'accepting') return
  phase.value = 'accepting'
  errorMessage.value = ''
  try {
    await api.post(`/team-invite/${token.value}/accept`)
    phase.value = 'accepted'
  }
  catch (e) {
    const err = e as { message?: string }
    errorMessage.value = err.message || 'Não foi possível aceitar o convite. Tente novamente.'
    phase.value = 'error'
  }
}

function goAuth(path: 'login' | 'cadastro') {
  navigateTo(`/${path}?redirect=${encodeURIComponent(route.fullPath)}`)
}
</script>

<template>
  <div class="invite">
    <div class="invite__card">
      <span class="invite__logo">Vitrine<span>Pro</span></span>

      <template v-if="!invite">
        <div class="invite__icon invite__icon--err">!</div>
        <h1>Convite inválido ou expirado</h1>
        <p class="invite__lead">Este link de convite não é mais válido. Peça para quem te convidou enviar um novo.</p>
      </template>

      <template v-else-if="invite.status === 'ACTIVE' && phase !== 'accepted'">
        <div class="invite__icon invite__icon--ok">✓</div>
        <h1>Convite já aceito</h1>
        <p class="invite__lead">Este convite já foi utilizado. Entre com sua conta para acessar o time.</p>
        <UiButton block @click="navigateTo('/login')">Entrar</UiButton>
      </template>

      <template v-else-if="phase === 'accepted'">
        <div class="invite__icon invite__icon--ok">✓</div>
        <h1>Convite aceito!</h1>
        <p class="invite__lead">Você agora faz parte do time <strong>{{ invite.teamName }}</strong>.</p>
        <UiButton block @click="navigateTo('/app')">Ir para o painel</UiButton>
      </template>

      <template v-else>
        <h1>Convite para um time</h1>
        <p class="invite__lead">
          Você foi convidado(a) para o time <strong>{{ invite.teamName }}</strong>
          como <strong>{{ ROLE_LABEL[invite.role] }}</strong>.
        </p>
        <p class="invite__email">Convite para: <strong>{{ invite.invitedEmail }}</strong></p>

        <div v-if="errorMessage" class="invite__alert" role="alert">{{ errorMessage }}</div>

        <template v-if="!auth.isAuthenticated">
          <p class="invite__hint">Entre ou crie uma conta com este e-mail para aceitar o convite.</p>
          <div class="invite__actions">
            <UiButton block @click="goAuth('login')">Entrar</UiButton>
            <UiButton variant="secondary" block @click="goAuth('cadastro')">Criar conta</UiButton>
          </div>
        </template>

        <template v-else-if="!emailMatches">
          <p class="invite__hint">
            Você está logado como <strong>{{ auth.user?.email }}</strong>, mas este convite é para
            <strong>{{ invite.invitedEmail }}</strong>. Saia e entre com a conta correta para aceitar.
          </p>
          <UiButton variant="secondary" block @click="auth.logout()">Sair e trocar de conta</UiButton>
        </template>

        <template v-else>
          <UiButton block :loading="phase === 'accepting'" @click="accept">Aceitar convite</UiButton>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.invite {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--ink-100); padding: var(--sp-5);
}
.invite__card {
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card, 12px);
  box-shadow: var(--shadow-md); padding: var(--sp-6); max-width: 440px; width: 100%; text-align: center;
}
.invite__logo { font-family: var(--font-display); font-weight: 700; font-size: var(--text-18); color: var(--ink-900); }
.invite__logo span { color: var(--brand-600); }
.invite__card h1 { font-size: var(--text-20); margin: var(--sp-4) 0 var(--sp-2); }
.invite__lead { font-size: var(--text-14); color: var(--ink-700); line-height: 1.6; }
.invite__email { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-2); }
.invite__hint { font-size: var(--text-13); color: var(--ink-500); margin: var(--sp-4) 0; line-height: 1.5; }
.invite__actions { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-4); }
.invite__alert {
  margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); font-size: var(--text-14);
}
.invite__icon {
  width: 56px; height: 56px; border-radius: var(--radius-full); display: inline-flex; align-items: center;
  justify-content: center; font-size: var(--text-22); font-weight: 700; margin-top: var(--sp-2);
}
.invite__icon--ok { background: var(--green-50, #dcfce7); color: var(--green-700, #15803d); }
.invite__icon--err { background: #fee2e2; color: var(--red-500, #ef4444); }
</style>
