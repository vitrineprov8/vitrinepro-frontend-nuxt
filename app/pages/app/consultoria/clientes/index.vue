<script setup lang="ts">
// T-T05 — Clientes (Workspace Consultoria). Grid de cards + modal "Novo
// cliente" + modal "Atribuir recrutadores". RECRUITER vê só os atribuídos,
// somente leitura (sem botões de criação/edição — RN-COMP-03).
import { Plus, Globe } from 'lucide-vue-next'
import type { Company, TeamMember, Team } from '~/types/team'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Clientes' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const { data: companies, pending, refresh } = await useAsyncData('consultoria-clientes', () =>
  api.get<Company[]>('/companies').catch(() => []))

const { data: members } = await useAsyncData('consultoria-clientes-members', () =>
  api.get<TeamMember[]>('/me/team/members').catch(() => []))
const recruiterOptions = computed(() => (members.value ?? [])
  .filter(m => m.userId && m.role === 'RECRUITER')
  .map(m => ({ value: m.userId as string, label: `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || 'Recrutador' })))

// RN-COMP-03 — RECRUITER tem acesso somente leitura às empresas (o backend
// já bloqueia create/update/delete/recruiters com 403 "Recrutadores têm
// acesso somente leitura às empresas."). Aqui escondemos os controles de
// escrita para esse papel, resolvendo o papel do ator da mesma forma que
// membros/index.vue (T-T06): via GET /me/team, comparando ownerId/members.
const { data: team } = await useAsyncData('consultoria-clientes-team', () =>
  api.get<Team>('/me/team').catch(() => null))
const canManageClients = computed(() => {
  if (!team.value || !auth.user) return true
  if (team.value.ownerId === auth.user.id) return true
  const role = team.value.members?.find(m => m.userId === auth.user!.id)?.role
  return role === 'OWNER' || role === 'MANAGER'
})

// --- Modal criar/editar cliente ---
const modalOpen = ref(false)
const editing = ref<Company | null>(null)
const form = reactive({ name: '', logoUrl: '', industry: '', description: '', website: '' })
const saving = ref(false)

function abrirNovo() {
  editing.value = null
  Object.assign(form, { name: '', logoUrl: '', industry: '', description: '', website: '' })
  modalOpen.value = true
}
function abrirEditar(c: Company) {
  editing.value = c
  Object.assign(form, { name: c.name, logoUrl: c.logoUrl ?? '', industry: c.industry ?? '', description: c.description ?? '', website: c.website ?? '' })
  modalOpen.value = true
}
async function salvar() {
  if (!form.name.trim()) { toast.error('Informe o nome do cliente.'); return }
  saving.value = true
  const payload = {
    name: form.name.trim(),
    logoUrl: form.logoUrl.trim() || undefined,
    industry: form.industry.trim() || undefined,
    description: form.description.trim() || undefined,
    website: form.website.trim() || undefined,
  }
  try {
    if (editing.value) await api.patch(`/companies/${editing.value.id}`, payload)
    else await api.post('/companies', payload)
    toast.success(editing.value ? 'Cliente atualizado.' : 'Cliente criado.')
    modalOpen.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível salvar o cliente.')
  }
  finally {
    saving.value = false
  }
}

// --- Modal atribuir recrutadores ---
const recrutadoresModalOpen = ref(false)
const recrutadoresAlvo = ref<Company | null>(null)
const selectedRecruiters = ref<string[]>([])
const savingRecrutadores = ref(false)

function abrirRecrutadores(c: Company) {
  recrutadoresAlvo.value = c
  selectedRecruiters.value = (c.assignedRecruiters ?? []).map(r => r.id)
  recrutadoresModalOpen.value = true
}
async function salvarRecrutadores() {
  if (!recrutadoresAlvo.value) return
  savingRecrutadores.value = true
  try {
    await api.patch(`/companies/${recrutadoresAlvo.value.id}/recruiters`, { recruiterIds: selectedRecruiters.value })
    toast.success('Recrutadores atualizados.')
    recrutadoresModalOpen.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível atualizar os recrutadores.')
  }
  finally {
    savingRecrutadores.value = false
  }
}

// --- Excluir ---
const excluindo = ref<Company | null>(null)
const deleting = ref(false)
async function confirmarExclusao() {
  if (!excluindo.value) return
  deleting.value = true
  try {
    await api.del(`/companies/${excluindo.value.id}`)
    toast.success('Cliente excluído. As vagas foram mantidas, sem vínculo.')
    excluindo.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível excluir o cliente.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="clientes">
    <header class="clientes__header">
      <h1>Clientes</h1>
      <UiButton v-if="canManageClients" @click="abrirNovo"><Plus :size="16" /> Novo cliente</UiButton>
    </header>

    <div v-if="pending" class="clientes__skel">
      <div v-for="n in 3" :key="n" class="skeleton clientes__skel-card" />
    </div>

    <UiEmptyState
      v-else-if="!companies?.length"
      :title="canManageClients ? 'Cadastre seu primeiro cliente' : 'Você ainda não foi atribuído a nenhum cliente'"
      :description="canManageClients ? 'Organize as vagas por cliente para acompanhar melhor cada processo.' : 'Fale com seu gestor para ser atribuído a um cliente.'"
    >
      <template v-if="canManageClients" #action>
        <UiButton @click="abrirNovo">Novo cliente</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="clientes__grid">
      <UiCard v-for="c in companies" :key="c.id" class="cliente-card">
        <div class="cliente-card__top">
          <UiAvatar :src="c.logoUrl" :name="c.name" size="lg" />
          <details v-if="canManageClients" class="menu">
            <summary aria-label="Ações">⋯</summary>
            <div class="menu__list">
              <button @click="abrirEditar(c)">Editar</button>
              <button @click="abrirRecrutadores(c)">Atribuir recrutadores</button>
              <button class="menu__danger" @click="excluindo = c">Excluir</button>
            </div>
          </details>
        </div>
        <NuxtLink :to="`/app/consultoria/clientes/${c.id}`" class="cliente-card__name">{{ c.name }}</NuxtLink>
        <p v-if="c.industry" class="cliente-card__industry">{{ c.industry }}</p>
        <a v-if="c.website" :href="c.website" target="_blank" rel="noopener" class="cliente-card__website" @click.stop>
          <Globe :size="13" /> {{ c.website.replace(/^https?:\/\//, '') }}
        </a>
        <div v-if="c.assignedRecruiters?.length" class="cliente-card__recruiters">
          <UiAvatar
            v-for="r in c.assignedRecruiters.slice(0, 4)" :key="r.id"
            :src="r.avatarUrl" :name="`${r.firstName ?? ''} ${r.lastName ?? ''}`" size="sm"
          />
          <span v-if="c.assignedRecruiters.length > 4" class="cliente-card__more">+{{ c.assignedRecruiters.length - 4 }}</span>
        </div>
      </UiCard>
    </div>

    <!-- Modal criar/editar -->
    <UiModal :open="modalOpen" :title="editing ? 'Editar cliente' : 'Novo cliente'" size="md" @close="modalOpen = false">
      <div class="form">
        <UiInput v-model="form.name" label="Nome" required placeholder="Nome do cliente" />
        <UiInput v-model="form.logoUrl" label="Logo (URL)" placeholder="https://..." />
        <UiInput v-model="form.industry" label="Setor" placeholder="Ex.: Tecnologia, Varejo..." />
        <UiInput v-model="form.website" label="Site" placeholder="https://..." />
        <div class="field">
          <label class="field__label">Descrição</label>
          <textarea v-model="form.description" class="textarea" rows="3" placeholder="Notas internas sobre o cliente..." />
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="modalOpen = false">Cancelar</UiButton>
        <UiButton :loading="saving" @click="salvar">Salvar</UiButton>
      </template>
    </UiModal>

    <!-- Modal atribuir recrutadores -->
    <UiModal :open="recrutadoresModalOpen" title="Atribuir recrutadores" size="md" @close="recrutadoresModalOpen = false">
      <p class="text-secondary">Recrutadores selecionados só enxergam clientes atribuídos.</p>
      <UiMultiSelect v-model="selectedRecruiters" :options="recruiterOptions" placeholder="Selecionar recrutadores" />
      <p v-if="!recruiterOptions.length" class="clientes__hint">Nenhum recrutador no time ainda. Convide membros em Membros.</p>
      <template #footer>
        <UiButton variant="ghost" @click="recrutadoresModalOpen = false">Cancelar</UiButton>
        <UiButton :loading="savingRecrutadores" @click="salvarRecrutadores">Salvar</UiButton>
      </template>
    </UiModal>

    <UiConfirmDialog
      :open="!!excluindo"
      title="Excluir cliente?"
      :description="`As vagas de '${excluindo?.name}' serão mantidas, sem vínculo com nenhum cliente.`"
      variant="danger"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmarExclusao"
      @cancel="excluindo = null"
      @close="excluindo = null"
    />
  </div>
</template>

<style scoped>
.clientes__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-6); }
.clientes__header h1 { font-size: var(--text-22); }
.clientes__skel { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.clientes__skel-card { height: 160px; border-radius: var(--radius-card); }
.clientes__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--sp-4); }
.cliente-card { display: flex; flex-direction: column; gap: var(--sp-2); }
.cliente-card__top { display: flex; align-items: flex-start; justify-content: space-between; }
.cliente-card__name { font-size: var(--text-16); font-weight: 600; color: var(--ink-900); margin-top: var(--sp-2); }
.cliente-card__industry { font-size: var(--text-13); color: var(--ink-500); }
.cliente-card__website { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-12); color: var(--brand-600); }
.cliente-card__recruiters { display: flex; align-items: center; gap: 4px; margin-top: var(--sp-2); }
.cliente-card__more { font-size: var(--text-12); color: var(--ink-500); }
.clientes__hint { font-size: var(--text-12); color: var(--ink-500); margin-top: var(--sp-2); }
.form { display: flex; flex-direction: column; gap: var(--sp-4); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.menu { position: relative; display: inline-block; }
.menu summary { list-style: none; cursor: pointer; padding: 0 var(--sp-2); font-size: var(--text-18); color: var(--ink-500); border-radius: var(--radius-input); }
.menu summary::-webkit-details-marker { display: none; }
.menu summary:hover { background: var(--ink-100); }
.menu__list { position: absolute; right: 0; top: 100%; z-index: 10; background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input); box-shadow: var(--shadow-md); min-width: 180px; display: flex; flex-direction: column; padding: var(--sp-1); }
.menu__list button { text-align: left; background: none; border: none; padding: var(--sp-2) var(--sp-3); font-size: var(--text-14); color: var(--ink-700); cursor: pointer; border-radius: var(--radius-input); }
.menu__list button:hover { background: var(--ink-100); }
.menu__danger { color: var(--red-500) !important; }
</style>
