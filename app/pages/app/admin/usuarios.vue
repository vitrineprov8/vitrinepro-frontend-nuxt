<script setup lang="ts">
// A6 (parte 1) — Usuários (design-spec/06 §A). Backend 100% pronto via B24
// (admin-users.controller.ts): busca + drawer de ações (mudar plano,
// promote/demote ADMIN, login-as suporte, excluir/anonimizar LGPD).
import type { TableColumn } from '~/components/ui/Table.vue'
import type { AdminUserListItem } from '~/types/admin'
import { PLAN_TIER_OPTIONS } from '~/types/admin'
import type { PaginatedResult } from '~/types/vaga'
import type { PlanTier } from '~/stores/auth'

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Usuários — Admin' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const q = ref('')
const persona = ref<string | null>(null)
const plan = ref<string | null>(null)
const page = ref(1)

const personaOptions = [
  { value: 'CANDIDATO', label: 'Candidato' },
  { value: 'HUNTER', label: 'Hunter' },
  { value: 'EMPRESA', label: 'Empresa' },
]
const planOptions = PLAN_TIER_OPTIONS

const { data: resp, pending, refresh } = await useAsyncData('admin-users', () =>
  api.get<PaginatedResult<AdminUserListItem>>('/admin/users', {
    q: q.value || undefined,
    persona: persona.value || undefined,
    plan: plan.value || undefined,
    page: page.value,
    limit: 20,
  }).catch(() => null),
{ watch: [q, persona, plan, page] })
const rows = computed<AdminUserListItem[]>(() => resp.value?.data ?? [])
watch([q, persona, plan], () => { page.value = 1 })

const columns: TableColumn[] = [
  { key: 'user', label: 'Usuário' },
  { key: 'personas', label: 'Personas' },
  { key: 'plan', label: 'Plano' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'createdAt', label: 'Criado em' },
]

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Drawer de detalhe/ações
const selected = ref<AdminUserListItem | null>(null)
function openDrawer(row: Record<string, unknown>) {
  selected.value = row as unknown as AdminUserListItem
  newPlan.value = selected.value.plan
  planReason.value = ''
  roleReason.value = ''
  loginReason.value = ''
  deleteReason.value = ''
  confirmingDelete.value = false
}
function closeDrawer() { selected.value = null }

// Alterar plano
const newPlan = ref<PlanTier>('FREE')
const planReason = ref('')
const savingPlan = ref(false)
async function salvarPlano() {
  if (!selected.value || !planReason.value.trim()) return
  savingPlan.value = true
  try {
    await api.patch(`/admin/users/${selected.value.id}/plan`, { plan: newPlan.value, reason: planReason.value.trim() })
    toast.success('Plano atualizado.')
    planReason.value = ''
    await refresh()
    const updated = rows.value.find(r => r.id === selected.value?.id)
    if (updated) selected.value = updated
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível atualizar o plano.')
  }
  finally { savingPlan.value = false }
}

// Promote/demote ADMIN
const roleReason = ref('')
const changingRole = ref(false)
async function alternarAdmin() {
  if (!selected.value || !roleReason.value.trim()) return
  changingRole.value = true
  try {
    const isAdmin = selected.value.role === 'ADMIN'
    const action = isAdmin ? 'demote-admin' : 'promote-admin'
    await api.post(`/admin/users/${selected.value.id}/${action}`, { reason: roleReason.value.trim() })
    toast.success(isAdmin ? 'Privilégio de admin removido.' : 'Usuário promovido a admin.')
    roleReason.value = ''
    await refresh()
    const updated = rows.value.find(r => r.id === selected.value?.id)
    if (updated) selected.value = updated
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível alterar o papel.')
  }
  finally { changingRole.value = false }
}

// Login-as (suporte)
const loginReason = ref('')
const loggingIn = ref(false)
const loginAsLink = ref<string | null>(null)
async function fazerLoginAs() {
  if (!selected.value || !loginReason.value.trim()) return
  loggingIn.value = true
  loginAsLink.value = null
  try {
    const res = await api.post<{ accessToken: string, expiresIn: string, user: { id: string, email: string } }>(
      `/admin/users/${selected.value.id}/login-as`,
      { reason: loginReason.value.trim() },
    )
    // Token de suporte de 15min — cookies não são isoladas por aba no mesmo
    // navegador, então abrir aqui mesmo trocaria a sessão do admin também.
    // Geramos o link de ativação (/login-as?token=...) pra abrir numa janela
    // anônima/outro navegador, preservando a sessão admin atual.
    loginAsLink.value = `${window.location.origin}/login-as?token=${encodeURIComponent(res.accessToken)}`
    toast.success(`Token de suporte gerado (expira em ${res.expiresIn}).`)
    loginReason.value = ''
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível gerar o token de suporte.')
  }
  finally { loggingIn.value = false }
}
async function copiarLink() {
  if (!loginAsLink.value) return
  await navigator.clipboard.writeText(loginAsLink.value)
  toast.success('Link copiado.')
}

// Excluir/anonimizar (LGPD)
const deleteReason = ref('')
const confirmingDelete = ref(false)
const deleting = ref(false)
async function anonimizar() {
  if (!selected.value || !deleteReason.value.trim()) return
  deleting.value = true
  try {
    await api.del(`/admin/users/${selected.value.id}`, { reason: deleteReason.value.trim() })
    toast.success('Conta anonimizada.')
    confirmingDelete.value = false
    closeDrawer()
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível anonimizar a conta.')
  }
  finally { deleting.value = false }
}

const isSelf = computed(() => selected.value?.id === auth.user?.id)
</script>

<template>
  <div class="usr">
    <header class="usr__header">
      <h1>Usuários</h1>
      <p class="usr__sub">Busca global, alteração de plano, promoção/remoção de admin, login-as e exclusão LGPD.</p>
    </header>

    <div class="usr__filters">
      <UiInput v-model="q" placeholder="Buscar por nome ou e-mail" class="usr__search" />
      <UiSelect v-model="persona" :options="personaOptions" placeholder="Todas as personas" />
      <UiSelect v-model="plan" :options="planOptions" placeholder="Todos os planos" />
    </div>

    <UiTable
      :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" :loading="pending"
      clickable-rows empty-title="Nenhum usuário encontrado"
      @row-click="openDrawer"
    >
      <template #cell-user="{ row }">
        <strong>{{ row.firstName }} {{ row.lastName }}</strong>
        <span class="usr__email">{{ row.email }}</span>
      </template>
      <template #cell-personas="{ row }">
        <span v-if="row.isCompany">Empresa</span>
        <span v-else-if="(row as AdminUserListItem).personas?.length">{{ (row as AdminUserListItem).personas!.join(', ') }}</span>
        <span v-else class="usr__muted">—</span>
      </template>
      <template #cell-plan="{ row }">
        {{ PLAN_TIER_OPTIONS.find(p => p.value === row.plan)?.label ?? row.plan }}
        <span class="usr__muted">({{ (row as AdminUserListItem).planStatus }})</span>
      </template>
      <template #cell-status="{ row }">
        <UiBadge v-if="row.role === 'ADMIN'" variant="purple">Admin</UiBadge>
        <UiBadge v-else-if="!(row as AdminUserListItem).isActive" variant="neutral">Inativo</UiBadge>
        <UiBadge v-else variant="success">Ativo</UiBadge>
      </template>
      <template #cell-createdAt="{ value }">
        {{ fmt(value as string) }}
      </template>
    </UiTable>

    <UiPagination
      v-if="resp && resp.lastPage > 1"
      :page="page" :last-page="resp.lastPage" :total="resp.total"
      @update:page="page = $event"
    />

    <UiDrawer :open="!!selected" title="Detalhe do usuário" size="lg" @close="closeDrawer">
      <div v-if="selected" class="usr__drawer">
        <div class="usr__drawer-top">
          <strong>{{ selected.firstName }} {{ selected.lastName }}</strong>
          <span class="usr__email">{{ selected.email }}</span>
          <span v-if="selected.username" class="usr__muted">@{{ selected.username }}</span>
        </div>

        <section class="usr__section">
          <h4>Plano</h4>
          <p class="usr__muted">Atual: {{ PLAN_TIER_OPTIONS.find(p => p.value === selected.plan)?.label }} ({{ selected.planStatus }}{{ selected.planExpiresAt ? `, expira ${fmt(selected.planExpiresAt)}` : '' }})</p>
          <UiSelect v-model="newPlan" :options="planOptions" label="Novo plano" />
          <label class="usr__field">
            <span class="usr__label">Motivo (obrigatório)</span>
            <textarea v-model="planReason" rows="2" placeholder="Ex.: cortesia comercial, correção de cobrança..." />
          </label>
          <UiButton size="sm" :loading="savingPlan" :disabled="!planReason.trim() || newPlan === selected.plan" @click="salvarPlano">
            Salvar plano
          </UiButton>
        </section>

        <section class="usr__section">
          <h4>Papel de administrador</h4>
          <p class="usr__muted">Atual: {{ selected.role === 'ADMIN' ? 'Administrador' : 'Usuário comum' }}</p>
          <label class="usr__field">
            <span class="usr__label">Motivo (obrigatório)</span>
            <textarea v-model="roleReason" rows="2" placeholder="Ex.: novo membro da equipe de operações..." />
          </label>
          <UiButton
            size="sm" :variant="selected.role === 'ADMIN' ? 'danger' : 'primary'"
            :loading="changingRole" :disabled="!roleReason.trim() || isSelf"
            @click="alternarAdmin"
          >
            {{ selected.role === 'ADMIN' ? 'Remover admin' : 'Promover a admin' }}
          </UiButton>
          <p v-if="isSelf" class="usr__hint">Você não pode alterar seu próprio papel de admin por aqui.</p>
        </section>

        <section class="usr__section">
          <h4>Login-as (suporte)</h4>
          <p class="usr__muted">Gera um token de sessão de 15min para investigar um problema como se fosse este usuário. Auditado.</p>
          <label class="usr__field">
            <span class="usr__label">Motivo (obrigatório)</span>
            <textarea v-model="loginReason" rows="2" placeholder="Ex.: investigar chamado de suporte #123..." />
          </label>
          <UiButton size="sm" variant="secondary" :loading="loggingIn" :disabled="!loginReason.trim() || selected.role === 'ADMIN'" @click="fazerLoginAs">
            Gerar token de suporte
          </UiButton>
          <p v-if="selected.role === 'ADMIN'" class="usr__hint">Não é permitido personificar outra conta administradora.</p>
          <div v-if="loginAsLink" class="usr__login-link">
            <p class="usr__hint">Abra este link numa janela anônima ou outro navegador (evita perder sua sessão admin nesta aba):</p>
            <div class="usr__login-link-row">
              <code>{{ loginAsLink }}</code>
              <UiButton size="sm" variant="ghost" @click="copiarLink">Copiar</UiButton>
            </div>
          </div>
        </section>

        <section class="usr__section usr__section--danger">
          <h4>Excluir / anonimizar (LGPD)</h4>
          <p class="usr__muted">Não é um hard-delete (há dados de terceiros vinculados) — sobrescreve PII e desativa a conta.</p>
          <template v-if="!confirmingDelete">
            <UiButton size="sm" variant="danger" :disabled="isSelf || selected.role === 'ADMIN'" @click="confirmingDelete = true">
              Anonimizar conta
            </UiButton>
            <p v-if="isSelf" class="usr__hint">Você não pode anonimizar sua própria conta por aqui.</p>
          </template>
          <template v-else>
            <label class="usr__field">
              <span class="usr__label">Motivo (obrigatório)</span>
              <textarea v-model="deleteReason" rows="2" placeholder="Ex.: solicitação do titular via LGPD..." />
            </label>
            <div class="usr__btns">
              <UiButton size="sm" variant="ghost" @click="confirmingDelete = false">Cancelar</UiButton>
              <UiButton size="sm" variant="danger" :loading="deleting" :disabled="!deleteReason.trim()" @click="anonimizar">
                Confirmar anonimização
              </UiButton>
            </div>
          </template>
        </section>
      </div>
    </UiDrawer>
  </div>
</template>

<style scoped>
.usr__header h1 { font-size: var(--text-22); }
.usr__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-5); }
.usr__filters { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: var(--sp-3); margin-bottom: var(--sp-4); }
.usr__email { display: block; font-size: var(--text-13); color: var(--ink-500); }
.usr__muted { color: var(--ink-500); font-size: var(--text-13); }
.usr__drawer { display: flex; flex-direction: column; gap: var(--sp-5); }
.usr__drawer-top { display: flex; flex-direction: column; gap: 2px; padding-bottom: var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.usr__section { display: flex; flex-direction: column; gap: var(--sp-2); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--ink-100); }
.usr__section h4 { font-size: var(--text-14); }
.usr__section--danger h4 { color: var(--red-500); }
.usr__field { display: flex; flex-direction: column; gap: 4px; }
.usr__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.usr__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
.usr__hint { font-size: var(--text-12); color: var(--ink-500); }
.usr__btns { display: flex; gap: var(--sp-2); }
.usr__login-link { background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
.usr__login-link-row { display: flex; align-items: center; gap: var(--sp-2); }
.usr__login-link-row code { flex: 1; font-size: var(--text-12); overflow-wrap: anywhere; }
@media (max-width: 900px) {
  .usr__filters { grid-template-columns: 1fr; }
}
</style>
