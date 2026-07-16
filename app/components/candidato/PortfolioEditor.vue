<script setup lang="ts">
// T-C07 — Editor de projeto de portfólio (usado por /portfolio/novo e /portfolio/[id]).
// F16b (2026-07-16) — header/título/ícones alinhados ao padrão do VagaEditor.vue
// (o outro editor de entidade única do app): h1 dinâmico "Novo/Editar", sem a
// subnav do hub "Meu Perfil" (essa subnav é só pras 4 páginas de topo do hub —
// Dados/Portfólio/Currículos/Formação —, não faz sentido numa página de edição
// de item específico, um nível mais fundo), título como UiInput normal (igual
// todo outro campo do form, não um input "hero" sem borda) e ícones lucide
// (igual o resto do design system) em vez de emoji cru.
import { ArrowUp, ArrowDown, Trash2, FileText } from 'lucide-vue-next'

interface Tag { id: string, name: string }
interface PortfolioFile { id: string, fileUrl: string, fileType: 'IMAGE' | 'PDF', caption: string | null, originalFilename: string | null, order: number }
interface PortfolioDetail {
  id: string
  title: string
  subtitle: string | null
  slug: string
  content: { html?: string } | null
  coverImageUrl: string | null
  clientName: string | null
  year: number | null
  duration: string | null
  role: string | null
  projectStatus: string | null
  status: 'DRAFT' | 'PUBLISHED'
  externalUrl: string | null
  tags: Tag[]
  files: PortfolioFile[]
}

const props = defineProps<{ itemId?: string }>()

const api = useApi()
const toast = useToast()
const router = useRouter()

const loading = ref(!!props.itemId)
const item = ref<PortfolioDetail | null>(null)

const title = ref('')
const subtitle = ref('')
const contentHtml = ref('')
const clientName = ref('')
const year = ref<number | null>(null)
const duration = ref('')
const role = ref('')
const projectStatus = ref<string | null>(null)
const externalUrl = ref('')
const tagIds = ref<string[]>([])
const status = ref<'DRAFT' | 'PUBLISHED'>('DRAFT')
const slug = ref('')

const projectStatusOptions = [
  { value: 'ONGOING', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

// ── Tags ─────────────────────────────────────────────────────────────────────
const { data: allTags, refresh: refreshTags } = await useAsyncData('candidato-portfolio-tags', () =>
  api.get<Tag[]>('/tags').catch(() => []))
const tagOptions = computed(() => (allTags.value ?? []).map(t => ({ value: t.id, label: t.name })))
const newTagName = ref('')
async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await api.post<Tag>('/tags', { name })
    newTagName.value = ''
    await refreshTags()
    tagIds.value = [...tagIds.value, tag.id]
  }
  catch {
    // Provavelmente já existe — tenta encontrar e selecionar.
    await refreshTags()
    const existing = (allTags.value ?? []).find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existing && !tagIds.value.includes(existing.id)) tagIds.value = [...tagIds.value, existing.id]
    newTagName.value = ''
  }
}

// ── Carrega item existente ───────────────────────────────────────────────────
if (props.itemId) {
  try {
    // GET /portfolio/:id não existe (o backend só busca detalhes por slug) —
    // resolve o slug via a lista própria (findAll com userId=self, ver
    // comentário de segurança em portfolio.service.ts) e então busca os
    // detalhes completos (galeria de arquivos etc.) por slug.
    // F16b (2026-07-16) — `auth.user` só é populado pelo fetchMe() do layout
    // app.vue (onMounted, roda DEPOIS do setup desta página) — numa
    // navegação direta/hard-reload pra /portfolio/[id], auth.user?.id vinha
    // undefined aqui, o backend não reconhecia como owner-query e devolvia
    // a lista pública (sem o rascunho), então `match` nunca era achado e o
    // formulário inteiro renderizava vazio (parecendo que o projeto sumiu,
    // mesmo intacto no banco). Fix: garante auth.user carregado primeiro.
    const auth = useAuthStore()
    if (!auth.user) await auth.fetchMe()
    const list = await api.get<{ data: { id: string, slug: string }[] }>('/portfolio', { userId: auth.user?.id, limit: 100 })
    const match = list.data.find(i => i.id === props.itemId)
    if (match) {
      item.value = await api.get<PortfolioDetail>(`/portfolio/${match.slug}`)
    }
  }
  catch {
    toast.error('Não foi possível carregar o projeto.')
  }
  if (item.value) {
    title.value = item.value.title
    subtitle.value = item.value.subtitle ?? ''
    contentHtml.value = item.value.content?.html ?? ''
    clientName.value = item.value.clientName ?? ''
    year.value = item.value.year
    duration.value = item.value.duration ?? ''
    role.value = item.value.role ?? ''
    projectStatus.value = item.value.projectStatus
    externalUrl.value = item.value.externalUrl ?? ''
    tagIds.value = item.value.tags.map(t => t.id)
    status.value = item.value.status
    slug.value = item.value.slug
  }
  loading.value = false
}

// ── Salvar (autosave leve — botão explícito "Salvar rascunho" + autosave silencioso) ──
const saving = ref(false)
const savedRecently = ref(false)
function buildPayload() {
  return {
    title: title.value.trim(),
    subtitle: subtitle.value.trim() || undefined,
    content: { html: contentHtml.value },
    clientName: clientName.value.trim() || undefined,
    year: year.value ?? undefined,
    duration: duration.value.trim() || undefined,
    role: role.value.trim() || undefined,
    projectStatus: projectStatus.value || undefined,
    externalUrl: externalUrl.value.trim() || undefined,
    tagIds: tagIds.value,
  }
}
async function save(silent = false) {
  if (!title.value.trim()) {
    if (!silent) toast.error('Dê um título ao projeto.')
    return
  }
  saving.value = true
  try {
    if (item.value) {
      const updated = await api.patch<PortfolioDetail>(`/portfolio/${item.value.id}`, buildPayload())
      item.value = updated
      slug.value = updated.slug
    }
    else {
      const created = await api.post<PortfolioDetail>('/portfolio', buildPayload())
      item.value = created
      slug.value = created.slug
      router.replace(`/app/candidato/portfolio/${created.id}`)
    }
    savedRecently.value = true
    setTimeout(() => { savedRecently.value = false }, 2000)
    if (!silent) toast.success('Rascunho salvo.')
  }
  catch {
    toast.error('Não foi possível salvar.')
  }
  finally {
    saving.value = false
  }
}

watchDebounced([title, subtitle, contentHtml, clientName, year, duration, role, projectStatus, externalUrl, tagIds], () => {
  if (item.value) save(true)
}, { debounce: 1500, deep: true })

// ── Publicar ─────────────────────────────────────────────────────────────────
const publishConfirmOpen = ref(false)
const publishing = ref(false)
async function openPublishConfirm() {
  if (!item.value) await save(true)
  publishConfirmOpen.value = true
}
async function confirmPublish() {
  if (!item.value) return
  publishing.value = true
  try {
    const updated = await api.patch<PortfolioDetail>(`/portfolio/${item.value.id}`, { ...buildPayload(), status: 'PUBLISHED' })
    item.value = updated
    status.value = updated.status
    slug.value = updated.slug
    publishConfirmOpen.value = false
    toast.success('Projeto publicado!')
  }
  catch {
    toast.error('Não foi possível publicar.')
  }
  finally {
    publishing.value = false
  }
}
async function unpublish() {
  if (!item.value) return
  try {
    const updated = await api.patch<PortfolioDetail>(`/portfolio/${item.value.id}`, { status: 'DRAFT' })
    item.value = updated
    status.value = updated.status
    toast.info('Projeto despublicado.')
  }
  catch {
    toast.error('Não foi possível despublicar.')
  }
}

// ── Cover + galeria ──────────────────────────────────────────────────────────
const coverInput = ref<HTMLInputElement | null>(null)
const uploadingCover = ref(false)
function pickCover() { coverInput.value?.click() }
async function onCoverSelected(e: Event) {
  if (!item.value) { toast.info('Salve o rascunho antes de enviar a capa.'); return }
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const updated = await api.post<PortfolioDetail>(`/portfolio/${item.value.id}/cover`, form)
    item.value = updated
  }
  catch {
    toast.error('Não foi possível enviar a capa.')
  }
  finally {
    uploadingCover.value = false
  }
}

const filesInput = ref<HTMLInputElement | null>(null)
const uploadingFile = ref(false)
function pickFiles() { filesInput.value?.click() }
async function onFilesSelected(e: Event) {
  if (!item.value) { toast.info('Salve o rascunho antes de enviar arquivos.'); return }
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploadingFile.value = true
  try {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/portfolio/${item.value.id}/files`, form)
    }
    const auth = useAuthStore()
    const list = await api.get<{ data: { id: string, slug: string }[] }>('/portfolio', { userId: auth.user?.id, limit: 100 })
    const match = list.data.find(i => i.id === item.value?.id)
    if (match) item.value = await api.get<PortfolioDetail>(`/portfolio/${match.slug}`)
  }
  catch {
    toast.error('Não foi possível enviar o arquivo.')
  }
  finally {
    uploadingFile.value = false
    if (filesInput.value) filesInput.value.value = ''
  }
}
async function deleteFile(fileId: string) {
  if (!item.value) return
  try {
    await api.del(`/portfolio/${item.value.id}/files/${fileId}`)
    item.value.files = item.value.files.filter(f => f.id !== fileId)
  }
  catch {
    toast.error('Não foi possível remover o arquivo.')
  }
}
async function moveFile(fileId: string, dir: -1 | 1) {
  if (!item.value) return
  const files = [...item.value.files].sort((a, b) => a.order - b.order)
  const idx = files.findIndex(f => f.id === fileId)
  const swapIdx = idx + dir
  if (idx < 0 || swapIdx < 0 || swapIdx >= files.length) return
  ;[files[idx], files[swapIdx]] = [files[swapIdx], files[idx]]
  const orders = files.map((f, i) => ({ id: f.id, order: i }))
  try {
    await api.patch(`/portfolio/${item.value.id}/files/reorder`, { orders })
    item.value.files = files.map((f, i) => ({ ...f, order: i }))
  }
  catch {
    toast.error('Não foi possível reordenar.')
  }
}

// ── Excluir ──────────────────────────────────────────────────────────────────
const deleteConfirmOpen = ref(false)
const deleting = ref(false)
async function confirmDeleteProject() {
  if (!item.value) return
  deleting.value = true
  try {
    await api.del(`/portfolio/${item.value.id}`)
    toast.success('Projeto excluído.')
    navigateTo('/app/candidato/portfolio')
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
  <div class="editor">
    <NuxtLink to="/app/candidato/portfolio" class="editor__back">← Portfólio</NuxtLink>

    <div v-if="loading" class="editor__loading">Carregando...</div>
    <template v-else>
      <header class="editor__header">
        <h1>{{ props.itemId ? 'Editar projeto' : 'Novo projeto' }}</h1>
        <div class="editor__header-actions">
          <UiBadge :variant="status === 'PUBLISHED' ? 'success' : 'neutral'">{{ status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}</UiBadge>
          <span v-if="saving" class="editor__autosave">Salvando...</span>
          <span v-else-if="savedRecently" class="editor__autosave">Salvo ✓</span>
          <UiButton variant="secondary" size="sm" @click="save(false)">Salvar rascunho</UiButton>
          <UiButton v-if="status === 'DRAFT'" size="sm" @click="openPublishConfirm">Publicar</UiButton>
          <UiButton v-else variant="secondary" size="sm" @click="unpublish">Despublicar</UiButton>
        </div>
      </header>

      <div class="editor__cols">
        <div class="editor__main">
          <UiInput v-model="title" label="Nome do projeto" placeholder="Ex.: Redesign do app XPTO" required @blur="item && save(true)" />
          <UiInput v-model="subtitle" label="Subtítulo (opcional)" @blur="item && save(true)" />
          <CandidatoRichTextEditor v-model="contentHtml" />

          <section class="editor__gallery">
            <h3>Galeria de arquivos</h3>
            <input ref="filesInput" type="file" accept="image/*,application/pdf" multiple class="editor__hidden-input" @change="onFilesSelected">
            <UiButton variant="secondary" size="sm" :loading="uploadingFile" :disabled="!item" @click="pickFiles">
              Adicionar arquivos
            </UiButton>
            <p v-if="!item" class="text-secondary">Salve o rascunho para poder enviar arquivos.</p>
            <ul v-if="item?.files.length" class="gallery-list">
              <li v-for="f in [...(item?.files ?? [])].sort((a, b) => a.order - b.order)" :key="f.id" class="gallery-item">
                <img v-if="f.fileType === 'IMAGE'" :src="f.fileUrl" class="gallery-item__thumb">
                <span v-else class="gallery-item__thumb gallery-item__thumb--pdf"><FileText :size="20" /></span>
                <span class="gallery-item__name">{{ f.originalFilename || f.caption || 'Arquivo' }}</span>
                <button class="gallery-item__btn" title="Mover para cima" aria-label="Mover para cima" @click="moveFile(f.id, -1)"><ArrowUp :size="16" /></button>
                <button class="gallery-item__btn" title="Mover para baixo" aria-label="Mover para baixo" @click="moveFile(f.id, 1)"><ArrowDown :size="16" /></button>
                <button class="gallery-item__btn gallery-item__btn--danger" title="Remover arquivo" aria-label="Remover arquivo" @click="deleteFile(f.id)"><Trash2 :size="16" /></button>
              </li>
            </ul>
          </section>
        </div>

        <aside class="editor__side">
          <UiCard class="editor__side-card">
            <h4>Capa</h4>
            <div class="editor__cover" :style="item?.coverImageUrl ? { backgroundImage: `url(${item.coverImageUrl})` } : undefined" @click="pickCover">
              <span v-if="!item?.coverImageUrl">Clique para enviar</span>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="editor__hidden-input" @change="onCoverSelected">
          </UiCard>

          <UiCard class="editor__side-card">
            <UiInput v-model="clientName" label="Cliente" @blur="item && save(true)" />
            <UiInput :model-value="year != null ? String(year) : ''" label="Ano" type="number" @update:model-value="year = $event ? Number($event) : null" @blur="item && save(true)" />
            <UiInput v-model="duration" label="Duração" placeholder="Ex.: 3 meses" @blur="item && save(true)" />
            <UiInput v-model="role" label="Seu papel" placeholder="Ex.: Desenvolvedor líder" @blur="item && save(true)" />
            <UiSelect v-model="projectStatus" label="Status do projeto" :options="projectStatusOptions" placeholder="Selecionar" />
            <UiInput v-model="externalUrl" label="URL externa" placeholder="https://..." @blur="item && save(true)" />
          </UiCard>

          <UiCard class="editor__side-card">
            <h4>Tags</h4>
            <UiMultiSelect v-model="tagIds" :options="tagOptions" placeholder="Selecionar tags" />
            <div class="editor__tag-add">
              <UiInput v-model="newTagName" placeholder="Nova tag..." @keyup.enter="createTag" />
              <UiButton size="sm" variant="secondary" @click="createTag">Criar</UiButton>
            </div>
          </UiCard>

          <UiButton v-if="item" variant="ghost" class="editor__delete" @click="deleteConfirmOpen = true">Excluir projeto</UiButton>
        </aside>
      </div>
    </template>

    <UiConfirmDialog
      :open="publishConfirmOpen"
      title="Publicar projeto?"
      :description="`O projeto ficará disponível publicamente em /portfolio/${slug}`"
      confirm-label="Publicar"
      :loading="publishing"
      @confirm="confirmPublish"
      @close="publishConfirmOpen = false"
    />
    <UiConfirmDialog
      :open="deleteConfirmOpen"
      title="Excluir projeto?"
      description="Se estiver publicado, o link público passará a mostrar 'removido' em vez de 404."
      variant="danger"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDeleteProject"
      @close="deleteConfirmOpen = false"
    />
  </div>
</template>

<style scoped>
.editor__back {
  display: inline-block; font-size: var(--text-13); font-weight: 600; color: var(--ink-500);
  text-decoration: none; margin-bottom: var(--sp-4);
}
.editor__back:hover { color: var(--brand-700); }
.editor h1 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.editor__loading { padding: var(--sp-12) 0; text-align: center; color: var(--ink-500); }
.editor__header { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); margin-bottom: var(--sp-6); flex-wrap: wrap; }
.editor__header h1 { margin-bottom: 0; }
.editor__header-actions { display: flex; align-items: center; gap: var(--sp-3); }
.editor__autosave { font-size: var(--text-12); color: var(--ink-500); }
.editor__cols { display: grid; grid-template-columns: 1fr 320px; gap: var(--sp-6); align-items: start; }
.editor__main { display: flex; flex-direction: column; gap: var(--sp-4); }
.editor__gallery h3 { font-size: var(--text-16); margin-bottom: var(--sp-3); }
.editor__hidden-input { display: none; }
.gallery-list { list-style: none; padding: 0; margin: var(--sp-3) 0 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.gallery-item { display: flex; align-items: center; gap: var(--sp-3); border: 1px solid var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-2); }
.gallery-item__thumb { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-input); background: var(--ink-100); display: flex; align-items: center; justify-content: center; }
.gallery-item__name { flex: 1; font-size: var(--text-13); }
.gallery-item__btn {
  width: 28px; height: 28px; border: none; background: none; border-radius: var(--radius-input);
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-500); flex-shrink: 0;
}
.gallery-item__btn:hover { background: var(--brand-100); color: var(--brand-700); }
.gallery-item__btn--danger:hover { background: var(--red-100); color: var(--red-500); }
.editor__side { display: flex; flex-direction: column; gap: var(--sp-4); }
.editor__side-card { display: flex; flex-direction: column; gap: var(--sp-3); }
.editor__side-card h4 { font-size: var(--text-14); color: var(--ink-500); }
.editor__cover {
  aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: var(--ink-100);
  border-radius: var(--radius-input); display: flex; align-items: center; justify-content: center;
  color: var(--ink-500); font-size: var(--text-13); cursor: pointer; border: 2px dashed var(--ink-300);
}
.editor__tag-add { display: flex; gap: var(--sp-2); }
.editor__delete { color: var(--red-500); }
@media (max-width: 900px) { .editor__cols { grid-template-columns: 1fr; } }
</style>
