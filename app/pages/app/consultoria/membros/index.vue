<script setup lang="ts">
// T-T06 — Membros (Workspace Consultoria). Tabela de membros + modal de
// convite + troca de papel (OWNER-only) + remoção (OWNER-only, com aviso de
// que as vagas do membro removido são reatribuídas ao ator — RN-TEAM-xx,
// implementado em teams.service.ts#removeMember).
import { Plus } from 'lucide-vue-next'
import type { Team, TeamMember, TeamRole } from '~/types/team'
import { TEAM_ROLE_LABEL, TEAM_ROLE_DESCRIPTION } from '~/types/team'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Membros' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const { data: team } = await useAsyncData('consultoria-membros-team', () =>
  api.get<Team>('/me/team').catch(() => null))

const { data: members, pending, refresh } = await useAsyncData('consultoria-membros', () =>
  api.get<TeamMember[]>('/me/team/members').catch(() => []))

// Papel do ator autenticado neste time — GET /me/team sempre resolve o
// time-contexto do usuário (dono OU membro ativo), e retorna `members`.
const myRole = computed<TeamRole | null>(() => {
  if (!team.value || !auth.user) return null
  if (team.value.ownerId === auth.user.id) return 'OWNER'
  return team.value.members?.find(m => m.userId === auth.user!.id)?.role ?? null
})
const isOwner = computed(() => myRole.value === 'OWNER')
const canInvite = computed(() => myRole.value === 'OWNER' || myRole.value === 'MANAGER')

const roleOptions = [
  { value: 'MANAGER', label: TEAM_ROLE_LABEL.MANAGER },
  { value: 'RECRUITER', label: TEAM_ROLE_LABEL.RECRUITER },
]

function nome(m: TeamMember) {
  if (m.user) return `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email
  return m.invitedEmail ?? '—'
}
function iniciais(m: TeamMember) {
  const n = nome(m)
  return n.slice(0, 2).toUpperCase()
}

// --- Convite ---
const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<'MANAGER' | 'RECRUITER'>('RECRUITER')
const inviting = ref(false)

function abrirConvite() {
  inviteEmail.value = ''
  inviteRole.value = 'RECRUITER'
  inviteOpen.value = true
}
async function enviarConvite() {
  if (!inviteEmail.value.trim()) { toast.error('Informe o e-mail do convidado.'); return }
  inviting.value = true
  try {
    await api.post('/me/team/invite', { email: inviteEmail.value.trim(), role: inviteRole.value })
    toast.success('Convite enviado.')
    inviteOpen.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string, code?: string }
    if (err.code === 'SEAT_LIMIT_REACHED') toast.error('Limite de membros do plano atingido.')
    else toast.error(err.message || 'Não foi possível enviar o convite.')
  }
  finally {
    inviting.value = false
  }
}

// --- Troca de papel ---
const changingRole = ref<string | null>(null)
async function trocarPapel(m: TeamMember, role: string) {
  changingRole.value = m.id
  try {
    await api.patch(`/me/team/members/${m.id}`, { role })
    toast.success('Papel atualizado.')
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível atualizar o papel.')
  }
  finally {
    changingRole.value = null
  }
}

// --- Remoção ---
const removendo = ref<TeamMember | null>(null)
const removing = ref(false)
async function confirmarRemocao() {
  if (!removendo.value) return
  removing.value = true
  try {
    await api.del(`/me/team/members/${removendo.value.id}`)
    toast.success('Membro removido.')
    removendo.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível remover o membro.')
  }
  finally {
    removing.value = false
  }
}
</script>

<template>
  <div class="membros">
    <header class="membros__header">
      <h1>Membros</h1>
      <UiButton v-if="canInvite" @click="abrirConvite"><Plus :size="16" /> Convidar membro</UiButton>
    </header>

    <div v-if="pending" class="membros__skel">
      <div v-for="n in 3" :key="n" class="skeleton membros__skel-row" />
    </div>

    <div v-else-if="members?.length" class="membros__table-wrap">
      <table class="membros__table">
        <thead><tr><th>Membro</th><th>Papel</th><th>Status</th><th>Desde</th><th></th></tr></thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td>
              <div class="membros__pessoa">
                <UiAvatar :src="m.user?.avatarUrl" :name="nome(m)" size="sm" />
                <div>
                  <span class="membros__nome">{{ nome(m) }}</span>
                  <span v-if="m.user?.email" class="membros__email">{{ m.user.email }}</span>
                </div>
              </div>
            </td>
            <td>
              <UiSelect
                v-if="isOwner && m.role !== 'OWNER'"
                :model-value="m.role"
                :options="roleOptions"
                :disabled="changingRole === m.id"
                @update:model-value="(r) => trocarPapel(m, r as string)"
              />
              <UiBadge v-else :variant="m.role === 'OWNER' ? 'purple' : 'neutral'">{{ TEAM_ROLE_LABEL[m.role] }}</UiBadge>
              <p class="membros__role-desc">{{ TEAM_ROLE_DESCRIPTION[m.role] }}</p>
            </td>
            <td>
              <UiBadge :variant="m.status === 'ACTIVE' ? 'success' : 'warning'">
                {{ m.status === 'ACTIVE' ? 'Ativo' : 'Pendente' }}
              </UiBadge>
            </td>
            <td>{{ new Date(m.joinedAt).toLocaleDateString('pt-BR') }}</td>
            <td class="membros__actions">
              <UiButton v-if="isOwner && m.role !== 'OWNER'" variant="ghost" size="sm" @click="removendo = m">Remover</UiButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiEmptyState v-else title="Nenhum membro ainda" description="Convide gerentes e recrutadores para colaborar nas vagas do time." />

    <!-- Modal convite -->
    <UiModal :open="inviteOpen" title="Convidar membro" size="md" @close="inviteOpen = false">
      <div class="form">
        <UiInput v-model="inviteEmail" label="E-mail" type="email" required placeholder="nome@empresa.com" />
        <UiSelect v-model="inviteRole" label="Papel" :options="roleOptions" />
        <p class="membros__hint">{{ TEAM_ROLE_DESCRIPTION[inviteRole] }}</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="inviteOpen = false">Cancelar</UiButton>
        <UiButton :loading="inviting" @click="enviarConvite">Enviar convite</UiButton>
      </template>
    </UiModal>

    <UiConfirmDialog
      :open="!!removendo"
      title="Remover membro?"
      :description="`As vagas atribuídas a '${removendo ? nome(removendo) : ''}' serão reatribuídas a você.`"
      variant="danger"
      confirm-label="Remover"
      :loading="removing"
      @confirm="confirmarRemocao"
      @cancel="removendo = null"
      @close="removendo = null"
    />
  </div>
</template>

<style scoped>
.membros__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-6); }
.membros__header h1 { font-size: var(--text-22); }
.membros__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.membros__skel-row { height: 56px; border-radius: var(--radius-input); }
.membros__table-wrap { overflow-x: auto; }
.membros__table { width: 100%; border-collapse: collapse; font-size: var(--text-14); min-width: 720px; }
.membros__table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: var(--text-13); padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ink-100); }
.membros__table td { padding: var(--sp-3); border-bottom: 1px solid var(--ink-100); vertical-align: middle; }
.membros__pessoa { display: flex; align-items: center; gap: var(--sp-2); }
.membros__nome { display: block; font-weight: 600; color: var(--ink-900); }
.membros__email { display: block; font-size: var(--text-12); color: var(--ink-500); }
.membros__role-desc { font-size: var(--text-11); color: var(--ink-500); margin-top: 4px; max-width: 220px; }
.membros__actions { text-align: right; }
.membros__hint { font-size: var(--text-12); color: var(--ink-500); }
.form { display: flex; flex-direction: column; gap: var(--sp-4); }
@media (max-width: 768px) {
  .membros__header { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
}
</style>
