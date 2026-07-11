<script setup lang="ts">
// T-E09 — Configurações (workspace Empresa).
//  - Preferência de mascaramento de contato de candidatos indicados por hunter
//    (B4 RN-NOVA-03): PATCH /profile { hunterContactRevealStageOrder }.
//  - Matriz de notificações (sino/e-mail) por evento (B13): GET/PATCH /notifications/preferences.
import type { PipelineStage } from '~/components/PipelineStagesModal.vue'
import type { NotificationPreferenceItem } from '~/types/notification'
import { NOTIFICATION_TYPE_LABEL } from '~/types/notification'

definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Configurações' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

// ── Mascaramento de contato ──────────────────────────────────────────────
const { data: template } = await useAsyncData('empresa-config-template', () =>
  api.get<{ stages: PipelineStage[] }>('/me/pipeline-template').catch(() => null))
const stages = computed<PipelineStage[]>(() => (template.value?.stages ?? []).filter(s => !s.isRejected).slice().sort((a, b) => a.order - b.order))
const revealOptions = computed(() => [
  { value: '0', label: 'Desde a 1ª etapa (nunca oculta)' },
  ...stages.value.map(s => ({ value: String(s.order), label: `A partir de "${s.label}"` })),
])
const revealStageOrder = ref('2')
const savingReveal = ref(false)

const initialized = ref(false)
watch(
  () => auth.user,
  (u) => {
    if (!u || initialized.value) return
    revealStageOrder.value = String(u.hunterContactRevealStageOrder ?? 2)
    initialized.value = true
  },
  { immediate: true },
)

async function salvarReveal() {
  savingReveal.value = true
  try {
    await api.patch('/profile', { hunterContactRevealStageOrder: Number(revealStageOrder.value) })
    await auth.fetchMe()
    toast.success('Preferência salva.')
  }
  catch {
    toast.error('Não foi possível salvar.')
  }
  finally {
    savingReveal.value = false
  }
}

// ── Notificações (B13) ───────────────────────────────────────────────────
const { data: prefsResp, refresh: refreshPrefs } = await useAsyncData('empresa-config-notif-prefs', () =>
  api.get<NotificationPreferenceItem[]>('/notifications/preferences').catch(() => []))
const prefs = ref<NotificationPreferenceItem[]>([])
watch(prefsResp, (v) => { if (v) prefs.value = v.map(p => ({ ...p })) }, { immediate: true })
const savingPrefs = ref(false)

async function togglePref(type: string, field: 'inAppEnabled' | 'emailEnabled') {
  const item = prefs.value.find(p => p.type === type)
  if (!item) return
  item[field] = !item[field]
  savingPrefs.value = true
  try {
    await api.patch('/notifications/preferences', {
      preferences: [{ type: item.type, inAppEnabled: item.inAppEnabled, emailEnabled: item.emailEnabled }],
    })
  }
  catch {
    item[field] = !item[field]
    toast.error('Não foi possível atualizar a preferência.')
  }
  finally {
    savingPrefs.value = false
  }
}
</script>

<template>
  <div class="cfg">
    <header class="cfg__header">
      <h1>Configurações</h1>
      <p class="text-secondary">Preferências da conta empresa.</p>
    </header>

    <UiCard class="cfg__card">
      <h2>Contato de candidatos indicados por hunter</h2>
      <p class="cfg__hint">
        Controla a partir de qual etapa do pipeline o contato (e-mail/telefone) de um candidato
        submetido por um hunter deixa de ficar oculto para você.
      </p>
      <UiSelect v-model="revealStageOrder" :options="revealOptions" />
      <UiButton size="sm" :loading="savingReveal" @click="salvarReveal">Salvar preferência</UiButton>
    </UiCard>

    <UiCard class="cfg__card">
      <h2>Notificações</h2>
      <p class="cfg__hint">Escolha como quer ser avisado para cada tipo de evento.</p>
      <div class="cfg__table-wrap">
        <table class="cfg__table">
          <thead>
            <tr><th>Evento</th><th>Sino</th><th>E-mail</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in prefs" :key="p.type">
              <td>{{ NOTIFICATION_TYPE_LABEL[p.type] }}</td>
              <td class="cfg__checkbox-cell">
                <input type="checkbox" :checked="p.inAppEnabled" :disabled="savingPrefs" @change="togglePref(p.type, 'inAppEnabled')">
              </td>
              <td class="cfg__checkbox-cell">
                <input type="checkbox" :checked="p.emailEnabled" :disabled="savingPrefs" @change="togglePref(p.type, 'emailEnabled')">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.cfg__header { margin-bottom: var(--sp-6); }
.cfg__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-1); }
.cfg__card { display: flex; flex-direction: column; gap: var(--sp-3); margin-bottom: var(--sp-5); max-width: 640px; }
.cfg__card h2 { font-size: var(--text-16); }
.cfg__hint { font-size: var(--text-13); color: var(--ink-500); }
.cfg__table-wrap { overflow-x: auto; }
.cfg__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); }
.cfg__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.cfg__table td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.cfg__checkbox-cell { text-align: center; width: 80px; }
</style>
