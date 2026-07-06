<script setup lang="ts">
// A2 — Fila de verificação de hunter (B8). Página mínima: sem ela o fluxo de
// verificação (upload de docs → aprovar/recusar) seria um beco sem saída,
// já que a Fase 5 (workspace de Admin) ainda não foi construída no PLANO.
import type { HunterVerificationRequest } from '~/types/hunter'

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Verificações de hunter — Admin' })

const api = useApi()
const toast = useToast()

const { data: list, pending, refresh } = await useAsyncData('admin-hunter-verifications', () =>
  api.get<HunterVerificationRequest[]>('/admin/hunters/verifications').catch(() => []))

const requests = computed(() => list.value ?? [])

const rejecting = ref<HunterVerificationRequest | null>(null)
const rejectReason = ref('')
const acting = ref<string | null>(null)

async function approve(r: HunterVerificationRequest) {
  acting.value = r.id
  try {
    await api.post(`/admin/hunters/verifications/${r.id}/approve`)
    toast.success(`${r.firstName} ${r.lastName} foi verificado(a).`)
    await refresh()
  }
  catch {
    toast.error('Não foi possível aprovar.')
  }
  finally {
    acting.value = null
  }
}

function openReject(r: HunterVerificationRequest) {
  rejecting.value = r
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejecting.value || !rejectReason.value.trim()) return
  acting.value = rejecting.value.id
  try {
    await api.post(`/admin/hunters/verifications/${rejecting.value.id}/reject`, {
      reason: rejectReason.value.trim(),
    })
    toast.success('Verificação recusada.')
    rejecting.value = null
    await refresh()
  }
  catch {
    toast.error('Não foi possível recusar.')
  }
  finally {
    acting.value = null
  }
}
</script>

<template>
  <div class="ver">
    <header class="ver__header">
      <h1>Verificações de hunter</h1>
      <p class="text-secondary">Aprove ou recuse pedidos de verificação de perfil (selo "Verificado" + acesso ao marketplace).</p>
    </header>

    <div v-if="pending" class="ver__skel">
      <div v-for="n in 3" :key="n" class="skeleton ver__skel-row" />
    </div>

    <UiEmptyState
      v-else-if="!requests.length"
      title="Nenhum pedido pendente"
      description="Novos pedidos de verificação aparecem aqui assim que os hunters enviarem seus documentos."
    />

    <div v-else class="ver__list">
      <UiCard v-for="r in requests" :key="r.id" class="ver__item">
        <div class="ver__top">
          <UiAvatar :src="r.avatarUrl" :name="`${r.firstName} ${r.lastName}`" size="md" />
          <div class="ver__info">
            <span class="ver__name">{{ r.firstName }} {{ r.lastName }}</span>
            <span class="ver__email">{{ r.email }}</span>
            <span v-if="r.verificationRequestedAt" class="ver__date">
              Solicitado em {{ new Date(r.verificationRequestedAt).toLocaleDateString('pt-BR') }}
            </span>
          </div>
        </div>

        <div v-if="r.verificationLinkedinUrl" class="ver__linkedin">
          <a :href="r.verificationLinkedinUrl" target="_blank" rel="noopener">Ver LinkedIn</a>
        </div>

        <ul v-if="r.verificationDocs?.length" class="ver__docs">
          <li v-for="d in r.verificationDocs" :key="d.url">
            <a :href="d.url" target="_blank" rel="noopener">📄 {{ d.label }}</a>
          </li>
        </ul>

        <div class="ver__actions">
          <UiButton variant="danger" size="sm" :disabled="acting === r.id" @click="openReject(r)">Recusar</UiButton>
          <UiButton size="sm" :loading="acting === r.id" @click="approve(r)">Aprovar</UiButton>
        </div>
      </UiCard>
    </div>

    <UiModal :open="!!rejecting" title="Recusar verificação" size="sm" @close="rejecting = null">
      <p class="text-secondary">
        Explique o motivo da recusa — o hunter vê esta mensagem e pode corrigir e reenviar.
      </p>
      <label class="ver__reason-field">
        <span class="ver__label">Motivo</span>
        <textarea v-model="rejectReason" rows="4" placeholder="Ex.: Documento ilegível, dados divergentes..." />
      </label>
      <template #footer>
        <UiButton variant="ghost" @click="rejecting = null">Cancelar</UiButton>
        <UiButton variant="danger" :disabled="!rejectReason.trim()" :loading="acting === rejecting?.id" @click="confirmReject">
          Confirmar recusa
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.ver__header { margin-bottom: var(--sp-6); }
.ver__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-1); }
.ver__skel { display: flex; flex-direction: column; gap: var(--sp-3); }
.ver__skel-row { height: 140px; border-radius: var(--radius-card); }
.ver__list { display: flex; flex-direction: column; gap: var(--sp-4); }
.ver__item { display: flex; flex-direction: column; gap: var(--sp-3); }
.ver__top { display: flex; align-items: center; gap: var(--sp-3); }
.ver__info { display: flex; flex-direction: column; gap: 2px; }
.ver__name { font-weight: 600; color: var(--ink-900); }
.ver__email { font-size: var(--text-13); color: var(--ink-500); }
.ver__date { font-size: var(--text-12); color: var(--ink-500); }
.ver__linkedin { font-size: var(--text-13); }
.ver__docs { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--sp-3); font-size: var(--text-13); }
.ver__actions { display: flex; justify-content: flex-end; gap: var(--sp-2); border-top: 1px solid var(--ink-100); padding-top: var(--sp-3); }
.ver__reason-field { display: flex; flex-direction: column; gap: var(--sp-1); margin-top: var(--sp-4); }
.ver__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.ver__reason-field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
</style>
