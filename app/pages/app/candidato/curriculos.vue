<script setup lang="ts">
// T-C08 — Currículos. GET/POST/PATCH/DELETE /cv.
// Nota: a entidade CV não guarda tamanho do arquivo (sem coluna `fileSize`) —
// não exibimos "tamanho" para não fabricar um dado que o backend não tem
// (mesma convenção do projeto: "visualizações do perfil" também vira "—").
// `isActive` no backend não é exclusivo entre CVs (não há regra de "só um
// padrão" no service) — a exclusividade do radio "Padrão" é garantida aqui no
// front, desmarcando os demais ao marcar um novo.
import type { CV } from '~/types/vaga'

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Currículos — Candidato' })

const api = useApi()
const toast = useToast()

const { data: cvs, pending, refresh } = await useAsyncData('candidato-curriculos', () =>
  api.get<CV[]>('/cv').catch(() => []))

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Upload (dropzone) ────────────────────────────────────────────────────────
const uploadInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
function pickUpload() { uploadInput.value?.click() }
async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 20 * 1024 * 1024) {
    toast.error('Arquivo maior que 20MB.')
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('label', file.name.replace(/\.pdf$/i, ''))
    await api.post('/cv', form)
    toast.success('Currículo enviado.')
    refresh()
  }
  catch {
    toast.error('Não foi possível enviar o currículo.')
  }
  finally {
    uploading.value = false
    if (uploadInput.value) uploadInput.value.value = ''
  }
}

// ── Substituir (mesmo fluxo de upload, mas depois exclui o antigo) ──────────
const replaceTargetId = ref<string | null>(null)
const replaceInput = ref<HTMLInputElement | null>(null)
function pickReplace(id: string) {
  replaceTargetId.value = id
  replaceInput.value?.click()
}
async function onReplace(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  const targetId = replaceTargetId.value
  if (!file || !targetId) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const old = (cvs.value ?? []).find(c => c.id === targetId)
    form.append('label', old?.label || file.name.replace(/\.pdf$/i, ''))
    await api.post('/cv', form)
    await api.del(`/cv/${targetId}`)
    toast.success('Currículo substituído.')
    refresh()
  }
  catch {
    toast.error('Não foi possível substituir o currículo.')
  }
  finally {
    uploading.value = false
    replaceTargetId.value = null
    if (replaceInput.value) replaceInput.value.value = ''
  }
}

// ── Label editável inline ───────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editingLabel = ref('')
function startEdit(cv: CV) {
  editingId.value = cv.id
  editingLabel.value = cv.label || ''
}
async function saveLabel(cv: CV) {
  const label = editingLabel.value.trim()
  editingId.value = null
  if (!label || label === cv.label) return
  try {
    await api.patch(`/cv/${cv.id}`, { label })
    refresh()
  }
  catch {
    toast.error('Não foi possível renomear.')
  }
}

// ── Marcar como padrão (exclusivo, aplicado no front) ───────────────────────
async function markDefault(cv: CV) {
  try {
    await Promise.all((cvs.value ?? []).map(c =>
      api.patch(`/cv/${c.id}`, { isActive: c.id === cv.id })))
    refresh()
  }
  catch {
    toast.error('Não foi possível atualizar.')
  }
}

// ── Baixar ───────────────────────────────────────────────────────────────────
async function download(cv: CV) {
  try {
    const res = await api.get<{ url: string }>(`/cv/${cv.id}/download`)
    window.open(res.url, '_blank')
  }
  catch {
    toast.error('Não foi possível baixar.')
  }
}

// ── Excluir ──────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const deleting = ref(false)
const toDelete = ref<CV | null>(null)
function askDelete(cv: CV) {
  toDelete.value = cv
  confirmOpen.value = true
}
async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await api.del(`/cv/${toDelete.value.id}`)
    toast.success('Currículo excluído.')
    confirmOpen.value = false
    refresh()
  }
  catch {
    toast.error('Não foi possível excluir.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="curriculos">
    <h1>Meu Perfil</h1>
    <CandidatoPerfilSubnav />
    <header class="curriculos__header"><h2>Currículos</h2></header>

    <div class="dropzone" @click="pickUpload">
      <input ref="uploadInput" type="file" accept="application/pdf" class="hidden-input" @change="onUpload">
      <span>{{ uploading ? 'Enviando...' : 'Arraste seu CV (PDF, máx. 20MB) ou clique para selecionar' }}</span>
    </div>
    <input ref="replaceInput" type="file" accept="application/pdf" class="hidden-input" @change="onReplace">

    <div v-if="pending" class="curriculos__list">
      <div v-for="n in 2" :key="n" class="skeleton curriculos__skel" />
    </div>

    <ul v-else-if="(cvs ?? []).length" class="curriculos__list">
      <li v-for="cv in cvs" :key="cv.id" class="cv-row">
        <span class="cv-row__icon">📄</span>
        <div class="cv-row__main">
          <input
            v-if="editingId === cv.id" v-model="editingLabel" class="cv-row__label-input"
            autofocus @blur="saveLabel(cv)" @keyup.enter="saveLabel(cv)"
          >
          <span v-else class="cv-row__label" @click="startEdit(cv)">{{ cv.label || 'Currículo' }} ✎</span>
          <span class="cv-row__meta">Enviado em {{ fmtDate(cv.createdAt) }}</span>
        </div>
        <label class="cv-row__default">
          <input type="radio" name="cv-default" :checked="cv.isActive" @change="markDefault(cv)">
          <UiBadge v-if="cv.isActive" variant="success">Padrão</UiBadge>
          <span v-else class="text-secondary">Tornar padrão</span>
        </label>
        <div class="cv-row__actions">
          <button @click="download(cv)">Baixar</button>
          <button @click="pickReplace(cv.id)">Substituir</button>
          <button class="cv-row__danger" @click="askDelete(cv)">Excluir</button>
        </div>
      </li>
    </ul>

    <UiEmptyState v-else title="Nenhum currículo enviado" description="Envie seu currículo em PDF para se candidatar mais rápido." />

    <UiConfirmDialog
      :open="confirmOpen"
      title="Excluir currículo?"
      description="Candidaturas já enviadas mantêm a cópia do currículo enviada no momento (snapshot) — excluir aqui não as afeta."
      variant="danger"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDelete"
      @close="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.curriculos h1 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.curriculos__header { margin-bottom: var(--sp-4); }
.curriculos__header h2 { font-size: var(--text-18); }
.dropzone {
  border: 2px dashed var(--ink-300); border-radius: var(--radius-card); padding: var(--sp-6);
  text-align: center; color: var(--ink-500); cursor: pointer; margin-bottom: var(--sp-6); font-size: var(--text-14);
}
.dropzone:hover { border-color: var(--brand-600); }
.hidden-input { display: none; }
.curriculos__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.curriculos__skel { height: 64px; border-radius: var(--radius-card); }
.cv-row {
  display: flex; align-items: center; gap: var(--sp-4);
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-3) var(--sp-4);
}
.cv-row__icon { font-size: 24px; }
.cv-row__main { flex: 1; display: flex; flex-direction: column; }
.cv-row__label { cursor: pointer; font-weight: 600; color: var(--ink-900); font-size: var(--text-14); }
.cv-row__label-input { font-weight: 600; font-size: var(--text-14); border: 1px solid var(--brand-600); border-radius: var(--radius-input); padding: 2px 6px; }
.cv-row__meta { font-size: var(--text-12); color: var(--ink-500); }
.cv-row__default { display: flex; align-items: center; gap: var(--sp-2); cursor: pointer; font-size: var(--text-13); }
.cv-row__actions { display: flex; gap: var(--sp-3); }
.cv-row__actions button { background: none; border: none; color: var(--brand-700); font-size: var(--text-13); font-weight: 600; cursor: pointer; }
.cv-row__danger { color: var(--red-500) !important; }
</style>
