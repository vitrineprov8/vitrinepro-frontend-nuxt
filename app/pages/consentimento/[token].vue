<script setup lang="ts">
// Página pública de consentimento LGPD (B14) — aberta pelo link do e-mail.
// Chama POST /public/candidate-consent/:token. Sem autenticação.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Autorização de indicação — VitrinePro', robots: 'noindex' })

const route = useRoute()
const api = useApi()
const token = computed(() => String(route.params.token || ''))

type State = 'idle' | 'submitting' | 'granted' | 'declined' | 'error'
const state = ref<State>('idle')
const candidateName = ref('')

async function decide(decision: 'GRANTED' | 'DECLINED') {
  if (state.value === 'submitting') return
  state.value = 'submitting'
  try {
    const r = await api.post<{ status: string, candidateName: string }>(
      `/public/candidate-consent/${token.value}`,
      { decision },
    )
    candidateName.value = r.candidateName
    state.value = decision === 'GRANTED' ? 'granted' : 'declined'
  }
  catch {
    state.value = 'error'
  }
}
</script>

<template>
  <div class="consent">
    <div class="consent__card">
      <span class="consent__logo">Vitrine<span>Pro</span></span>

      <template v-if="state === 'idle' || state === 'submitting'">
        <h1>Autorização de indicação</h1>
        <p class="consent__lead">
          Um recrutador da VitrinePro gostaria de incluir seu perfil no banco de talentos dele e
          indicá-lo a vagas. Você autoriza o uso dos seus dados para esse fim (LGPD)?
        </p>
        <div class="consent__actions">
          <UiButton :loading="state === 'submitting'" @click="decide('GRANTED')">Autorizar</UiButton>
          <UiButton variant="ghost" :disabled="state === 'submitting'" @click="decide('DECLINED')">
            Recusar
          </UiButton>
        </div>
        <p class="consent__fine">
          Você pode revogar esta autorização a qualquer momento entrando em contato com a VitrinePro.
        </p>
      </template>

      <template v-else-if="state === 'granted'">
        <div class="consent__icon consent__icon--ok">✓</div>
        <h1>Autorização concedida</h1>
        <p class="consent__lead">
          Obrigado{{ candidateName ? `, ${candidateName.split(' ')[0]}` : '' }}! O recrutador já pode
          indicá-lo a vagas. Você pode fechar esta página.
        </p>
      </template>

      <template v-else-if="state === 'declined'">
        <div class="consent__icon consent__icon--muted">✕</div>
        <h1>Autorização recusada</h1>
        <p class="consent__lead">
          Tudo certo — seus dados não serão usados para indicações. Você pode fechar esta página.
        </p>
      </template>

      <template v-else>
        <div class="consent__icon consent__icon--err">!</div>
        <h1>Link inválido ou expirado</h1>
        <p class="consent__lead">
          Este link de autorização não é mais válido. Peça ao recrutador para enviar um novo.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.consent {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--ink-100); padding: var(--sp-5);
}
.consent__card {
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card, 12px);
  box-shadow: var(--shadow-md); padding: var(--sp-6); max-width: 440px; width: 100%; text-align: center;
}
.consent__logo { font-family: var(--font-display); font-weight: 700; font-size: var(--text-18); color: var(--ink-900); }
.consent__logo span { color: var(--brand-600); }
.consent__card h1 { font-size: var(--text-20); margin: var(--sp-4) 0 var(--sp-2); }
.consent__lead { font-size: var(--text-14); color: var(--ink-700); line-height: 1.6; }
.consent__actions { display: flex; gap: var(--sp-3); justify-content: center; margin: var(--sp-5) 0 var(--sp-3); }
.consent__fine { font-size: var(--text-12); color: var(--ink-500); }
.consent__icon {
  width: 56px; height: 56px; border-radius: var(--radius-full); display: inline-flex; align-items: center;
  justify-content: center; font-size: var(--text-22); font-weight: 700; margin-top: var(--sp-2);
}
.consent__icon--ok { background: var(--green-50, #dcfce7); color: var(--green-700, #15803d); }
.consent__icon--muted { background: var(--ink-100); color: var(--ink-500); }
.consent__icon--err { background: #fee2e2; color: var(--red-500, #ef4444); }
</style>
