<script setup lang="ts">
// Modal de Consentimento LGPD — disparado pela notificação "Um hunter quer te
// indicar para uma vaga" (link `/app/candidato?consentId=...`).
// GET /me/consent-requests + POST /me/consent-requests/:id/decide (autenticado).
export interface ConsentRequest {
  id: string
  hunterName: string
  fullName: string
  email: string
  phone: string | null
  linkedinUrl: string | null
  headline: string | null
  location: string | null
  status: 'PENDING' | 'GRANTED' | 'DECLINED'
}

const props = defineProps<{ open: boolean, request: ConsentRequest | null }>()
const emit = defineEmits<{ close: [], decided: [] }>()

const api = useApi()
const toast = useToast()
const deciding = ref(false)

async function decide(decision: 'GRANTED' | 'DECLINED') {
  if (!props.request) return
  deciding.value = true
  try {
    await api.post(`/me/consent-requests/${props.request.id}/decide`, { decision })
    toast.success(decision === 'GRANTED' ? 'Indicação autorizada.' : 'Indicação recusada.')
    emit('decided')
    emit('close')
  }
  catch {
    toast.error('Não foi possível registrar sua decisão.')
  }
  finally {
    deciding.value = false
  }
}
</script>

<template>
  <UiModal :open="props.open" title="Um hunter quer te indicar para uma vaga" size="md" @close="emit('close')">
    <div v-if="props.request" class="consent">
      <p class="consent__intro">
        <strong>{{ props.request.hunterName }}</strong> quer submeter seu perfil para uma vaga. Revise os dados que
        serão compartilhados com a empresa antes de autorizar.
      </p>

      <dl class="consent__data">
        <dt>Nome</dt><dd>{{ props.request.fullName }}</dd>
        <dt>E-mail</dt><dd>{{ props.request.email }}</dd>
        <dt v-if="props.request.phone">Telefone</dt><dd v-if="props.request.phone">{{ props.request.phone }}</dd>
        <dt v-if="props.request.headline">Cargo</dt><dd v-if="props.request.headline">{{ props.request.headline }}</dd>
        <dt v-if="props.request.location">Cidade</dt><dd v-if="props.request.location">{{ props.request.location }}</dd>
        <dt v-if="props.request.linkedinUrl">LinkedIn</dt><dd v-if="props.request.linkedinUrl">{{ props.request.linkedinUrl }}</dd>
      </dl>

      <p class="consent__notice">
        Ao autorizar, esses dados serão compartilhados com a empresa da vaga indicada. Você pode recusar sem custo.
      </p>
    </div>
    <template #footer>
      <UiButton variant="danger" :disabled="deciding" :loading="deciding" @click="decide('DECLINED')">Recusar</UiButton>
      <UiButton :disabled="deciding" :loading="deciding" @click="decide('GRANTED')">Autorizar</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.consent { display: flex; flex-direction: column; gap: var(--sp-4); }
.consent__intro { color: var(--ink-700); font-size: var(--text-14); }
.consent__data { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-1) var(--sp-4); font-size: var(--text-14); background: var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); }
.consent__data dt { color: var(--ink-500); }
.consent__data dd { margin: 0; color: var(--ink-900); }
.consent__notice { font-size: var(--text-12); color: var(--ink-500); }
</style>
