<script setup lang="ts">
// F4 — WorkspaceSwitcher completo (design-spec 00 §3.9).
// Substitui o entry-point mínimo anterior (só um item "Consultoria" no menu
// do avatar) por um dropdown próprio na topbar: lista Candidato/Hunter/cada
// Consultoria acessível/Empresa/Admin, conforme o que a conta tem direito, e
// troca o contexto ativo no backend (setActiveContext) ANTES de navegar —
// regra explícita do design-spec ("trocar = navega para a home do workspace
// E persiste contexto no backend ANTES de navegar").
import { ChevronDown, User, Briefcase, Building2, Users, ShieldAlert, Plus } from 'lucide-vue-next'
import type { AccessibleTeam } from '~/types/team'

const auth = useAuthStore()
const api = useApi()
const route = useRoute()
const router = useRouter()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => { open.value = false })

const teams = ref<AccessibleTeam[]>([])
async function loadTeams() {
  try {
    teams.value = await api.get<AccessibleTeam[]>('/me/team/accessible')
  }
  catch {
    teams.value = []
  }
}
onMounted(() => { if (auth.user) loadTeams() })
watch(() => auth.user, (u) => { if (u) loadTeams() })

interface SwitcherItem {
  key: string
  label: string
  to: string
  teamId: string | null
  icon: unknown
}

const items = computed<SwitcherItem[]>(() => {
  const u = auth.user
  if (!u) return []
  const list: SwitcherItem[] = []
  if (u.isCompany) {
    // Conta empresa: persona fixa, sem escolha (mesmo comportamento de F3/escolher-perfil).
    list.push({ key: 'empresa', label: 'Empresa', to: '/app/empresa', teamId: null, icon: Building2 })
  }
  else {
    if (u.personas?.includes('CANDIDATO')) list.push({ key: 'candidato', label: 'Candidato', to: '/app/candidato', teamId: null, icon: User })
    if (u.personas?.includes('HUNTER')) list.push({ key: 'hunter', label: 'Hunter', to: '/app/hunter', teamId: null, icon: Briefcase })
  }
  for (const team of teams.value) {
    list.push({ key: `team-${team.id}`, label: team.name, to: '/app/consultoria', teamId: team.id, icon: Users })
  }
  if (u.role === 'ADMIN') list.push({ key: 'admin', label: 'Admin', to: '/app/admin', teamId: null, icon: ShieldAlert })
  return list
})

// Item "atual": por rota (prefixo mais longo que bate), e no caso de
// Consultoria, desempatando por activeContextTeamId quando há mais de 1 time.
const currentItem = computed(() => {
  const matches = items.value.filter(i => route.path === i.to || route.path.startsWith(`${i.to}/`))
  if (!matches.length) return null
  if (matches.length === 1) return matches[0]
  // route.path === '/app/consultoria' pode bater com vários times na lista —
  // usa o time ativo (activeContextTeamId) pra escolher qual mostrar.
  return matches.find(i => i.teamId === auth.user?.activeContextTeamId) ?? matches[0]
})

async function select(item: SwitcherItem) {
  open.value = false
  if (item.to === route.path && item.teamId === auth.user?.activeContextTeamId) return
  await auth.setActiveContext(item.teamId)
  if (import.meta.client) localStorage.setItem('vp_last_workspace', item.to)
  await router.push(item.to)
}

function criarConsultoria() {
  open.value = false
  router.push('/precos')
}
</script>

<template>
  <div v-if="auth.user && items.length" ref="root" class="wsw">
    <button class="wsw__trigger" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">
      <component :is="currentItem?.icon ?? User" :size="16" />
      <span class="wsw__label">{{ currentItem?.label ?? 'Workspace' }}</span>
      <ChevronDown :size="14" class="wsw__chevron" :class="{ 'wsw__chevron--open': open }" />
    </button>
    <div v-if="open" class="wsw__menu" role="menu">
      <button
        v-for="item in items" :key="item.key" class="wsw__item"
        :class="{ 'wsw__item--active': item.key === currentItem?.key }"
        role="menuitem" @click="select(item)"
      >
        <component :is="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </button>
      <div class="wsw__divider" />
      <button class="wsw__item wsw__item--muted" role="menuitem" @click="criarConsultoria">
        <Plus :size="16" /> <span>Criar consultoria</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wsw { position: relative; }
.wsw__trigger {
  display: flex; align-items: center; gap: var(--sp-2); background: var(--ink-100); border: none;
  border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); cursor: pointer; color: var(--ink-900);
  font-size: var(--text-13); font-weight: 600; max-width: 180px;
}
.wsw__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wsw__chevron { color: var(--ink-500); transition: transform var(--t-fast); flex-shrink: 0; }
.wsw__chevron--open { transform: rotate(180deg); }
.wsw__menu {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 50; min-width: 220px;
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input);
  box-shadow: var(--shadow-md); padding: var(--sp-1); display: flex; flex-direction: column;
}
.wsw__item {
  display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-input); font-size: var(--text-14); color: var(--ink-900);
  background: none; border: none; text-align: left; width: 100%; cursor: pointer;
}
.wsw__item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wsw__item:hover { background: var(--ink-100); }
.wsw__item--active { background: var(--brand-100); color: var(--brand-700); font-weight: 600; }
.wsw__item--muted { color: var(--ink-500); }
.wsw__divider { height: 1px; background: var(--ink-100); margin: var(--sp-1) 0; }
@media (max-width: 768px) {
  .wsw__label { display: none; }
}
</style>
