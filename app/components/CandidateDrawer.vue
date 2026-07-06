<script setup lang="ts">
// Drawer do candidato (T-H05): info, mensagem, CV, mover etapa, rejeitar, nota da etapa, histórico.
import type { PipelineStage } from '~/components/PipelineStagesModal.vue'

export interface Application {
  id: string
  /** B4 — 'DIRECT' (candidatura direta) ou 'HUNTER' (submetido por hunter). */
  source?: 'DIRECT' | 'HUNTER'
  pipelineStage: string
  isRejected: boolean
  message: string | null
  snapshotFullName: string
  snapshotEmail: string | null
  snapshotPhone: string | null
  snapshotLocation: string | null
  /** B4 — RN-NOVA-03: true quando o contato foi ocultado (candidato de hunter
   *  ainda não chegou na etapa de liberação configurada em /profile). */
  contactMasked?: boolean
  /** B21 — nota/score gerais e por etapa, agora vindos na projeção de listByVaga. */
  generalScore?: number | null
  generalNote?: string | null
  stageNotes?: Record<string, { observacoes: string, nota: number | null, updatedAt: string, byUserId: string }>
  createdAt: string
  cv: { id: string, label: string | null, fileUrl: string | null } | null
  user: { id: string, firstName: string, lastName: string, username: string | null, avatarUrl: string | null } | null
}
interface HistoryItem { stage: string, enteredAt: string, byUserName: string, note: string | null }

const props = defineProps<{ open: boolean, application: Application | null, stages: PipelineStage[] }>()
const emit = defineEmits<{ close: [], changed: [] }>()

const api = useApi()
const toast = useToast()

const stageOptions = computed(() => props.stages
  .filter(s => !s.isRejected).sort((a, b) => a.order - b.order)
  .map(s => ({ value: s.id, label: s.label })))

const moveTo = ref<string | null>(null)
const nota = ref('')
const notaScore = ref<number | null>(null)
const history = ref<HistoryItem[]>([])
const savingNote = ref(false)
const moving = ref(false)
const shareOpen = ref(false)
const downloadingPdf = ref(false)

async function baixarPdf() {
  if (!props.application) return
  downloadingPdf.value = true
  try {
    const cfg = useRuntimeConfig()
    const token = useCookie<string | null>('vp_token').value
    const blob = await $fetch<Blob>(`/applications/${props.application.id}/pdf`, {
      baseURL: cfg.public.backendUrl,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `processo-${props.application.snapshotFullName.replace(/\s+/g, '-').toLowerCase()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
  catch { toast.error('Não foi possível gerar o PDF.') }
  finally { downloadingPdf.value = false }
}

function stageLabel(id: string) {
  return props.stages.find(s => s.id === id)?.label ?? id
}

watch(() => props.open, async (o) => {
  if (!o || !props.application) return
  moveTo.value = props.application.pipelineStage
  // B21 — pré-carrega a nota/score já salvos para a etapa atual (antes o
  // drawer sempre abria em branco, mesmo já existindo uma nota salva).
  const existing = props.application.stageNotes?.[props.application.pipelineStage]
  nota.value = existing?.observacoes ?? ''
  notaScore.value = existing?.nota ?? null
  history.value = []
  try {
    history.value = await api.get<HistoryItem[]>(`/applications/${props.application.id}/history`)
  }
  catch { history.value = [] }
})

async function mover() {
  if (!props.application || !moveTo.value || moveTo.value === props.application.pipelineStage) return
  moving.value = true
  try {
    await api.patch(`/applications/${props.application.id}/status`, { pipelineStage: moveTo.value })
    toast.success('Candidato movido.')
    emit('changed')
  }
  catch { toast.error('Não foi possível mover.') }
  finally { moving.value = false }
}

async function rejeitar() {
  if (!props.application) return
  moving.value = true
  try {
    await api.patch(`/applications/${props.application.id}/status`, { isRejected: true, pipelineStage: 'rejected' })
    toast.info('Candidato rejeitado.')
    emit('changed')
    emit('close')
  }
  catch { toast.error('Não foi possível rejeitar.') }
  finally { moving.value = false }
}

async function salvarNota() {
  if (!props.application) return
  const stageKey = props.application.pipelineStage
  savingNote.value = true
  try {
    await api.patch(`/applications/${props.application.id}/stage-notes/${stageKey}`, {
      observacoes: nota.value.trim() || undefined,
      nota: notaScore.value,
    })
    toast.success('Nota salva.')
    // B21 — sem isso, a lista pai ficava com stageNotes desatualizado e a
    // próxima abertura do drawer não pré-carregava a nota recém-salva.
    emit('changed')
  }
  catch { toast.error('Não foi possível salvar a nota.') }
  finally { savingNote.value = false }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <UiDrawer :open="open" :title="application?.snapshotFullName || 'Candidato'" size="lg" @close="emit('close')">
    <div v-if="application" class="cd">
      <!-- Resumo -->
      <section class="cd__section">
        <div class="cd__head">
          <UiAvatar :src="application.user?.avatarUrl ?? null" :name="application.snapshotFullName" size="lg" />
          <div>
            <h3 class="cd__name">{{ application.snapshotFullName }}</h3>
            <p class="cd__meta">Candidatura em {{ fmt(application.createdAt) }}</p>
            <div class="cd__badges">
              <UiBadge variant="neutral">Etapa: {{ stageLabel(application.pipelineStage) }}</UiBadge>
              <UiBadge v-if="application.source === 'HUNTER'" variant="outline">Indicado por hunter</UiBadge>
            </div>
          </div>
        </div>

        <dl class="cd__contact">
          <template v-if="application.contactMasked">
            <div class="cd__masked">
              <dt>Contato</dt>
              <dd>🔒 Oculto até avançar de etapa <span class="cd__masked-hint">(preferência de mascaramento em Conta)</span></dd>
            </div>
          </template>
          <template v-else>
            <div v-if="application.snapshotEmail"><dt>E-mail</dt><dd>{{ application.snapshotEmail }}</dd></div>
            <div v-if="application.snapshotPhone"><dt>Telefone</dt><dd>{{ application.snapshotPhone }}</dd></div>
          </template>
          <div v-if="application.snapshotLocation"><dt>Local</dt><dd>{{ application.snapshotLocation }}</dd></div>
        </dl>

        <div class="cd__links">
          <UiButton v-if="application.cv?.fileUrl" size="sm" variant="secondary" @click="navigateTo(application.cv!.fileUrl!, { external: true, open: { target: '_blank' } })">Ver CV</UiButton>
          <UiButton v-if="application.user?.username" size="sm" variant="secondary" @click="navigateTo(`/perfil/${application.user!.username}`, { external: true, open: { target: '_blank' } })">Perfil público</UiButton>
        </div>

        <div v-if="application.message" class="cd__message">
          <span class="cd__label">Mensagem do candidato</span>
          <p>{{ application.message }}</p>
        </div>
      </section>

      <!-- Mover / rejeitar -->
      <section class="cd__section">
        <span class="cd__label">Mover de etapa</span>
        <div class="cd__move">
          <UiSelect v-model="moveTo" :options="stageOptions" />
          <UiButton size="sm" :loading="moving" :disabled="moveTo === application.pipelineStage" @click="mover">Mover</UiButton>
        </div>
        <UiButton v-if="!application.isRejected" size="sm" variant="ghost" class="cd__reject" :loading="moving" @click="rejeitar">Rejeitar candidato</UiButton>
        <div class="cd__share-actions">
          <UiButton size="sm" variant="secondary" @click="shareOpen = true">Compartilhar processo</UiButton>
          <UiButton size="sm" variant="secondary" :loading="downloadingPdf" @click="baixarPdf">Baixar PDF</UiButton>
        </div>
      </section>

      <!-- Nota da etapa -->
      <section class="cd__section">
        <span class="cd__label">Nota desta etapa ({{ stageLabel(application.pipelineStage) }})</span>
        <textarea v-model="nota" class="cd__textarea" rows="3" placeholder="Observações sobre o candidato nesta etapa..." />
        <div class="cd__nota-row">
          <input v-model.number="notaScore" type="number" min="0" max="10" step="0.5" placeholder="Nota 0–10" class="cd__score">
          <UiButton size="sm" :loading="savingNote" @click="salvarNota">Salvar nota</UiButton>
        </div>
      </section>

      <!-- Histórico -->
      <section class="cd__section">
        <span class="cd__label">Histórico</span>
        <ol v-if="history.length" class="cd__timeline">
          <li v-for="(h, i) in history" :key="i">
            <strong>{{ stageLabel(h.stage) }}</strong>
            <span class="cd__hist-meta">{{ fmt(h.enteredAt) }} · {{ h.byUserName }}</span>
            <p v-if="h.note">{{ h.note }}</p>
          </li>
        </ol>
        <p v-else class="cd__empty">Sem histórico ainda.</p>
      </section>
    </div>

    <ShareProcessModal v-if="application" :open="shareOpen" :application-id="application.id" @close="shareOpen = false" />
  </UiDrawer>
</template>

<style scoped>
.cd { display: flex; flex-direction: column; gap: var(--sp-6); }
.cd__section { display: flex; flex-direction: column; gap: var(--sp-3); }
.cd__head { display: flex; align-items: center; gap: var(--sp-3); }
.cd__name { font-size: var(--text-18); }
.cd__meta { font-size: var(--text-12); color: var(--ink-500); margin: 2px 0 var(--sp-2); }
.cd__contact { display: flex; flex-direction: column; gap: var(--sp-2); margin: 0; }
.cd__contact div { display: flex; justify-content: space-between; gap: var(--sp-3); font-size: var(--text-14); }
.cd__contact dt { color: var(--ink-500); margin: 0; }
.cd__contact dd { color: var(--ink-900); margin: 0; }
.cd__badges { display: flex; gap: var(--sp-2); margin-top: var(--sp-1); flex-wrap: wrap; }
.cd__masked dd { text-align: right; }
.cd__masked-hint { display: block; font-size: var(--text-12); color: var(--ink-500); }
.cd__links { display: flex; gap: var(--sp-2); }
.cd__label { font-size: var(--text-13); font-weight: 600; color: var(--ink-700); }
.cd__message p { color: var(--ink-700); line-height: 1.5; margin-top: var(--sp-1); }
.cd__move { display: flex; gap: var(--sp-2); align-items: flex-end; }
.cd__move > :first-child { flex: 1; }
.cd__reject { color: var(--red-500); align-self: flex-start; }
.cd__share-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.cd__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.cd__textarea:focus { outline: none; border-color: var(--brand-600); }
.cd__nota-row { display: flex; gap: var(--sp-2); align-items: center; }
.cd__score { width: 110px; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2); font-size: var(--text-14); }
.cd__timeline { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.cd__timeline li { border-left: 2px solid var(--ink-100); padding-left: var(--sp-3); }
.cd__timeline strong { display: block; font-size: var(--text-14); }
.cd__hist-meta { font-size: var(--text-12); color: var(--ink-500); }
.cd__timeline p { font-size: var(--text-13); color: var(--ink-700); margin-top: 2px; }
.cd__empty { color: var(--ink-500); font-size: var(--text-13); }
</style>
