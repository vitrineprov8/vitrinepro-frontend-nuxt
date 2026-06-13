<script setup lang="ts">
// Layout do app — sidebar escura + topbar (design-spec/00 §3.9)
// navEntries definidos por workspace via composable useWorkspaceNav (cada workspace estende)
import { Menu, Bell, ChevronDown } from 'lucide-vue-next'

const auth = useAuthStore()
const sidebarOpen = ref(false) // mobile drawer
const route = useRoute()

// Itens injetados pela página/workspace via useState (preenchido nos módulos)
const nav = useState<{ label: string, to: string, icon?: unknown }[]>('workspace-nav', () => [])
const workspaceLabel = useState<string>('workspace-label', () => 'Painel')

onMounted(() => auth.fetchMe())
watch(() => route.fullPath, () => { sidebarOpen.value = false })
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
          <button class="shell__iconbtn" aria-label="Notificações"><Bell :size="20" /></button>
          <button v-if="auth.user" class="shell__user">
            <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" :alt="auth.user.firstName" class="shell__avatar">
            <span v-else class="shell__avatar shell__avatar--fallback">{{ auth.user.firstName?.[0] }}</span>
            <span class="shell__username">{{ auth.user.firstName }}</span>
            <ChevronDown :size="16" />
          </button>
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
.shell__iconbtn { background: none; border: none; color: var(--ink-500); display: flex; }
.shell__user { display: flex; align-items: center; gap: var(--sp-2); background: none; border: none; }
.shell__avatar { width: 32px; height: 32px; border-radius: var(--radius-full); object-fit: cover; }
.shell__avatar--fallback {
  background: var(--brand-100); color: var(--brand-700); display: inline-flex;
  align-items: center; justify-content: center; font-weight: 600;
}
.shell__content { padding: var(--sp-6); max-width: var(--container-app); width: 100%; margin-inline: auto; }
@media (max-width: 768px) {
  .shell__sidebar { position: fixed; z-index: 60; transform: translateX(-100%); transition: transform var(--t-overlay); }
  .shell__sidebar--open { transform: translateX(0); }
  .shell__burger { display: flex; }
}
</style>
