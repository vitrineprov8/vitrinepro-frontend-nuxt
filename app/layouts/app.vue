<script setup lang="ts">
// Layout do app — sidebar escura + topbar (design-spec/00 §3.9)
// navEntries definidos por workspace via composable useWorkspaceNav (cada workspace estende)
import { Menu, Bell, ChevronDown, User, LogOut, Check } from 'lucide-vue-next'
import type { NotificationItem, NotificationListResponse } from '~/types/notification'

const auth = useAuthStore()
const api = useApi()
const sidebarOpen = ref(false) // mobile drawer
const route = useRoute()
const router = useRouter()

// Itens injetados pela página/workspace via useState (preenchido nos módulos)
const nav = useState<{ label: string, to: string, icon?: unknown }[]>('workspace-nav', () => [])
const workspaceLabel = useState<string>('workspace-label', () => 'Painel')

// F1 — menu do avatar (design-spec 00 §3.9): dropdown com Minha conta / Sair
const userMenuOpen = ref(false)
const userMenuRoot = ref<HTMLElement | null>(null)
onClickOutside(userMenuRoot, () => { userMenuOpen.value = false })

// F5 — sino de notificações. B13 (tabela `notifications` + endpoints) já
// existe no backend — carregamos a lista real + unreadCount pro badge do sino.
const notifOpen = ref(false)
const notifRoot = ref<HTMLElement | null>(null)
onClickOutside(notifRoot, () => { notifOpen.value = false })

const notifications = ref<NotificationItem[]>([])
const unreadCount = ref(0)
const notifLoading = ref(false)
const markingAll = ref(false)

async function loadNotifications() {
  notifLoading.value = true
  try {
    const res = await api.get<NotificationListResponse>('/notifications', { limit: 10 })
    notifications.value = res.data
    unreadCount.value = res.unreadCount
  }
  catch {
    // Sino não deve quebrar o resto do layout se o backend falhar.
    notifications.value = []
  }
  finally {
    notifLoading.value = false
  }
}

// Badge do sino já aparece assim que o usuário loga, não só ao abrir o popover.
onMounted(() => { auth.fetchMe(); if (auth.user) loadNotifications() })
watch(() => auth.user, (u) => { if (u) loadNotifications() })
watch(notifOpen, (open) => { if (open) loadNotifications() })

async function marcarLida(n: NotificationItem) {
  notifOpen.value = false
  if (!n.readAt) {
    n.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    api.patch(`/notifications/${n.id}/read`).catch(() => {})
  }
  if (n.link) router.push(n.link)
}

async function marcarTodasLidas() {
  markingAll.value = true
  try {
    await api.post('/notifications/read-all')
    const now = new Date().toISOString()
    notifications.value.forEach((n) => { if (!n.readAt) n.readAt = now })
    unreadCount.value = 0
  }
  catch { /* silencioso — não é ação crítica */ }
  finally { markingAll.value = false }
}

function notifTempo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'há 1 dia' : `há ${d} dias`
}

function onLogout() {
  userMenuOpen.value = false
  auth.logout()
}

// "Minha conta" ainda não tem tela dedicada (Fase 4) — manda para o perfil
// existente do workspace atual em vez de gerar 404 (par de F2).
const accountLink = computed(() => {
  if (auth.user?.personas?.includes('HUNTER')) return '/app/hunter/perfil'
  return '/app'
})

watch(() => route.fullPath, () => { sidebarOpen.value = false; userMenuOpen.value = false; notifOpen.value = false })
</script>

<template>
  <div class="shell">
    <aside class="shell__sidebar" :class="{ 'shell__sidebar--open': sidebarOpen }">
      <NuxtLink to="/app" class="shell__logo">Vitrine<span>Pro</span></NuxtLink>
      <nav class="shell__nav">
        <NuxtLink
          v-for="item in nav" :key="item.to" :to="item.to"
          class="shell__nav-item" :class="{ active: route.path.startsWith(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>

    <div class="shell__main">
      <header class="shell__topbar">
        <button class="shell__burger" aria-label="Menu" @click="sidebarOpen = !sidebarOpen"><Menu :size="22" /></button>
        <span class="shell__breadcrumb">{{ workspaceLabel }}</span>
        <div class="shell__topbar-right">
          <div ref="notifRoot" class="shell__notif-wrap">
            <button
              class="shell__iconbtn"
              aria-label="Notificações"
              aria-haspopup="menu"
              :aria-expanded="notifOpen"
              @click="notifOpen = !notifOpen"
            >
              <Bell :size="20" />
              <span v-if="unreadCount > 0" class="shell__notif-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </button>
            <div v-if="notifOpen" class="shell__notif-menu" role="menu">
              <div class="shell__notif-header">
                <p class="shell__notif-title">Notificações</p>
                <button
                  v-if="unreadCount > 0"
                  class="shell__notif-markall"
                  :disabled="markingAll"
                  @click="marcarTodasLidas"
                >
                  <Check :size="13" /> Marcar todas como lidas
                </button>
              </div>
              <p v-if="notifLoading" class="shell__notif-loading">Carregando...</p>
              <UiEmptyState
                v-else-if="!notifications.length"
                :icon="Bell"
                title="Nada por aqui ainda"
                description="Em breve você vai receber avisos de candidaturas, convites e atualizações do marketplace por aqui."
              />
              <ul v-else class="shell__notif-list">
                <li
                  v-for="n in notifications" :key="n.id"
                  class="shell__notif-item" :class="{ 'shell__notif-item--unread': !n.readAt }"
                  @click="marcarLida(n)"
                >
                  <span class="shell__notif-item-dot" />
                  <div class="shell__notif-item-body">
                    <p class="shell__notif-item-title">{{ n.title }}</p>
                    <p class="shell__notif-item-msg">{{ n.message }}</p>
                    <p class="shell__notif-item-time">{{ notifTempo(n.createdAt) }}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div v-if="auth.user" ref="userMenuRoot" class="shell__user-wrap">
            <button
              class="shell__user"
              aria-haspopup="menu"
              :aria-expanded="userMenuOpen"
              @click="userMenuOpen = !userMenuOpen"
            >
              <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" :alt="auth.user.firstName" class="shell__avatar">
              <span v-else class="shell__avatar shell__avatar--fallback">{{ auth.user.firstName?.[0] }}</span>
              <span class="shell__username">{{ auth.user.firstName }}</span>
              <ChevronDown :size="16" class="shell__chevron" :class="{ 'shell__chevron--open': userMenuOpen }" />
            </button>
            <div v-if="userMenuOpen" class="shell__user-menu" role="menu">
              <NuxtLink :to="accountLink" class="shell__user-menu-item" role="menuitem" @click="userMenuOpen = false">
                <User :size="16" /> Minha conta
              </NuxtLink>
              <button class="shell__user-menu-item shell__user-menu-item--danger" role="menuitem" @click="onLogout">
                <LogOut :size="16" /> Sair
              </button>
            </div>
          </div>
        </div>
      </header>
      <main class="shell__content"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; }
.shell__sidebar {
  width: var(--sidebar-w); background: var(--ink-900); color: var(--ink-300);
  display: flex; flex-direction: column; padding: var(--sp-5) var(--sp-3);
  position: sticky; top: 0; height: 100vh; flex-shrink: 0;
}
.shell__logo { font-family: var(--font-display); font-weight: 700; font-size: var(--text-18); color: var(--white); padding: 0 var(--sp-3) var(--sp-5); }
.shell__logo span { color: var(--brand-600); }
.shell__nav { display: flex; flex-direction: column; gap: 2px; }
.shell__nav-item {
  color: var(--ink-300); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-input);
  font-size: var(--text-14); border-left: 3px solid transparent;
}
.shell__nav-item:hover { background: var(--ink-700); color: var(--white); text-decoration: none; }
.shell__nav-item.active { background: var(--ink-700); color: var(--white); border-left-color: var(--brand-600); }
.shell__main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.shell__topbar {
  height: var(--topbar-h); background: var(--white); border-bottom: 1px solid var(--ink-300);
  display: flex; align-items: center; gap: var(--sp-4); padding-inline: var(--sp-6);
  position: sticky; top: 0; z-index: 40;
}
.shell__burger { display: none; background: none; border: none; }
.shell__breadcrumb { font-weight: 600; flex: 1; }
.shell__topbar-right { display: flex; align-items: center; gap: var(--sp-3); }
.shell__iconbtn { position: relative; background: none; border: none; color: var(--ink-500); display: flex; cursor: pointer; }
.shell__notif-dot {
  position: absolute; top: -4px; right: -6px; min-width: 16px; height: 16px; padding: 0 3px;
  border-radius: var(--radius-full); background: var(--red-500); color: var(--white);
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
}
.shell__notif-wrap { position: relative; }
.shell__notif-menu {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 50; width: 340px; max-height: 420px;
  overflow-y: auto; background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input);
  box-shadow: var(--shadow-md); padding: var(--sp-3);
}
.shell__notif-header { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); margin-bottom: var(--sp-2); }
.shell__notif-title { font-weight: 600; font-size: var(--text-14); }
.shell__notif-markall {
  display: flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer;
  color: var(--brand-600); font-size: var(--text-12); font-weight: 600; white-space: nowrap;
}
.shell__notif-markall:disabled { opacity: 0.5; cursor: default; }
.shell__notif-menu :deep(.empty) { padding: var(--sp-6) var(--sp-3); }
.shell__notif-loading { color: var(--ink-500); font-size: var(--text-13); padding: var(--sp-4) var(--sp-2); text-align: center; }
.shell__notif-list { display: flex; flex-direction: column; gap: 2px; }
.shell__notif-item {
  display: flex; gap: var(--sp-2); padding: var(--sp-2); border-radius: var(--radius-input);
  cursor: pointer; align-items: flex-start;
}
.shell__notif-item:hover { background: var(--ink-100); }
.shell__notif-item-dot {
  width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--brand-600);
  margin-top: 6px; flex-shrink: 0; visibility: hidden;
}
.shell__notif-item--unread .shell__notif-item-dot { visibility: visible; }
.shell__notif-item-body { min-width: 0; }
.shell__notif-item-title { font-size: var(--text-13); font-weight: 600; color: var(--ink-900); }
.shell__notif-item--unread .shell__notif-item-title { font-weight: 700; }
.shell__notif-item-msg { font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; overflow-wrap: break-word; }
.shell__notif-item-time { font-size: 11px; color: var(--ink-300); margin-top: 4px; }
.shell__user-wrap { position: relative; }
.shell__user { display: flex; align-items: center; gap: var(--sp-2); background: none; border: none; cursor: pointer; }
.shell__avatar { width: 32px; height: 32px; border-radius: var(--radius-full); object-fit: cover; }
.shell__avatar--fallback {
  background: var(--brand-100); color: var(--brand-700); display: inline-flex;
  align-items: center; justify-content: center; font-weight: 600;
}
.shell__chevron { color: var(--ink-500); transition: transform var(--t-fast); }
.shell__chevron--open { transform: rotate(180deg); }
.shell__user-menu {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 50; min-width: 200px;
  background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-input);
  box-shadow: var(--shadow-md); padding: var(--sp-1); display: flex; flex-direction: column;
}
.shell__user-menu-item {
  display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-input); font-size: var(--text-14); color: var(--ink-900);
  background: none; border: none; text-align: left; width: 100%; cursor: pointer;
}
.shell__user-menu-item:hover { background: var(--ink-100); text-decoration: none; }
.shell__user-menu-item--danger { color: var(--red-500); }
.shell__user-menu-item--danger:hover { background: var(--red-100, #fee2e2); }
.shell__content { padding: var(--sp-6); max-width: var(--container-app); width: 100%; margin-inline: auto; }
@media (max-width: 768px) {
  .shell__sidebar { position: fixed; z-index: 60; transform: translateX(-100%); transition: transform var(--t-overlay); }
  .shell__sidebar--open { transform: translateX(0); }
  .shell__burger { display: flex; }
}
</style>
