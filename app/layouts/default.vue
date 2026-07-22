<script setup lang="ts">
// Layout marketing/público — topbar T01 (transparente sobre hero → sólida no scroll), footer 4 col + selo LGPD
import { Menu, X } from 'lucide-vue-next'

const auth = useAuthStore()
const route = useRoute()

// F20 — menu mobile. Abaixo de 768px a `.mkt__nav` some, e até então NÃO havia
// substituto: os 6 links do site ficavam inalcançáveis pelo topo (só pelo rodapé).
// Mesmo padrão do drawer de `layouts/app.vue`: backdrop que fecha no clique fora
// e fechamento no clique do próprio item (o watch de rota não dispara quando o
// link aponta pra rota atual — ver o fix F15b).
const menuOpen = ref(false)
const navLinks = [
  { to: '/para-empresas', label: 'Para Empresas' },
  { to: '/para-candidatos', label: 'Para Candidatos' },
  { to: '/vagas', label: 'Vagas' },
  { to: '/hunters', label: 'Hunters' },
  { to: '/precos', label: 'Preços' },
  { to: '/guias', label: 'Guias' },
]
watch(() => route.fullPath, () => { menuOpen.value = false })
// Trava o scroll do fundo enquanto o menu está aberto.
watch(menuOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => { if (import.meta.client) document.body.style.overflow = '' })

// Só a Home tem hero escuro full-bleed; nas demais páginas a topbar é sempre sólida.
const overHero = computed(() => route.path === '/')
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}
onMounted(() => {
  auth.fetchMe()
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// Topbar transparente apenas no topo da Home; sólida ao rolar, fora da Home, ou
// com o menu mobile aberto (senão o painel escuro nasceria sob uma faixa vazada).
const transparent = computed(() => overHero.value && !scrolled.value && !menuOpen.value)
</script>

<template>
  <div class="mkt">
    <header class="mkt__topbar" :class="{ 'mkt__topbar--solid': !transparent }">
      <div class="container mkt__topbar-inner">
        <NuxtLink to="/" class="mkt__logo">Vitrine<span>Pro</span></NuxtLink>
        <nav class="mkt__nav">
          <NuxtLink v-for="l in navLinks" :key="l.to" :to="l.to">{{ l.label }}</NuxtLink>
        </nav>
        <div class="mkt__actions">
          <template v-if="auth.isAuthenticated">
            <UiButton variant="secondary" size="sm" @click="navigateTo('/app')">Ir ao painel</UiButton>
          </template>
          <template v-else>
            <UiButton variant="ghost" size="sm" @click="navigateTo('/login')">Entrar</UiButton>
            <UiButton size="sm" @click="navigateTo('/cadastro')">Criar conta grátis</UiButton>
          </template>
        </div>
        <button
          class="mkt__burger" :aria-expanded="menuOpen" aria-label="Menu"
          aria-controls="mkt-mobile-nav" @click="menuOpen = !menuOpen"
        >
          <component :is="menuOpen ? X : Menu" :size="24" />
        </button>
      </div>
    </header>

    <!-- Menu mobile (≤768px) -->
    <div v-if="menuOpen" class="mkt__menu-backdrop" @click="menuOpen = false" />
    <nav v-if="menuOpen" id="mkt-mobile-nav" class="mkt__menu">
      <NuxtLink v-for="l in navLinks" :key="l.to" :to="l.to" class="mkt__menu-item" @click="menuOpen = false">
        {{ l.label }}
      </NuxtLink>
      <div class="mkt__menu-actions">
        <template v-if="auth.isAuthenticated">
          <UiButton block variant="secondary" @click="menuOpen = false; navigateTo('/app')">Ir ao painel</UiButton>
        </template>
        <template v-else>
          <UiButton block variant="secondary" @click="menuOpen = false; navigateTo('/login')">Entrar</UiButton>
          <UiButton block @click="menuOpen = false; navigateTo('/cadastro')">Criar conta grátis</UiButton>
        </template>
      </div>
    </nav>

    <main :class="{ 'mkt__main--offset': !overHero }"><slot /></main>

    <CookieBanner />

    <footer class="mkt__footer">
      <div class="container mkt__footer-top">
        <div class="mkt__footer-brand">
          <NuxtLink to="/" class="mkt__logo">Vitrine<span>Pro</span></NuxtLink>
          <p class="mkt__footer-tag">O hub do recrutador brasileiro.</p>
        </div>
        <div class="mkt__footer-cols">
          <div class="mkt__footer-col">
            <h4>Produto</h4>
            <NuxtLink to="/vagas">Vagas</NuxtLink>
            <NuxtLink to="/hunters">Hunters</NuxtLink>
            <NuxtLink to="/precos">Preços</NuxtLink>
            <NuxtLink to="/para-candidatos">Para Candidatos</NuxtLink>
          </div>
          <div class="mkt__footer-col">
            <h4>Empresa</h4>
            <NuxtLink to="/para-empresas">Para Empresas</NuxtLink>
            <NuxtLink to="/sobre">Sobre</NuxtLink>
            <NuxtLink to="/contato">Contato</NuxtLink>
          </div>
          <div class="mkt__footer-col">
            <h4>Aprender</h4>
            <NuxtLink to="/guias">Guias de uso</NuxtLink>
            <NuxtLink to="/ajuda">Central de ajuda</NuxtLink>
            <NuxtLink to="/termos">Termos de uso</NuxtLink>
            <NuxtLink to="/privacidade">Privacidade</NuxtLink>
          </div>
          <div class="mkt__footer-col">
            <h4>Social</h4>
            <a href="https://www.linkedin.com/in/vitrinepro-v8-5015713b0/" target="_blank" rel="noopener">LinkedIn</a>
            <a href="https://www.instagram.com/vitrine.v8pro/" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </div>
      <div class="container mkt__footer-bottom">
        <p>© {{ new Date().getFullYear() }} VitrinePro · v8pro.com.br</p>
        <UiBadge variant="outline">🔒 Conforme LGPD</UiBadge>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.mkt { min-height: 100vh; display: flex; flex-direction: column; background: var(--white); }

.mkt__topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: transparent;
  transition: background var(--t-fast), box-shadow var(--t-fast);
}
.mkt__topbar--solid { background: var(--ink-900); box-shadow: var(--shadow-sm); }
.mkt__topbar-inner { display: flex; align-items: center; gap: var(--sp-8); height: var(--topbar-h); }
.mkt__logo { font-family: var(--font-display); font-size: var(--text-18); font-weight: 700; color: var(--white); }
.mkt__logo span { color: var(--brand-600); }
.mkt__nav { display: flex; gap: var(--sp-5); flex: 1; }
.mkt__nav a { color: var(--ink-300); font-size: var(--text-14); }
.mkt__nav a:hover { color: var(--white); text-decoration: none; }
.mkt__actions { display: flex; gap: var(--sp-2); }
/* Bug real: .btn--ghost (Button.vue) pinta texto em --ink-900 (quase preto),
   pensado pro shell do app (topbar branca). Aqui a topbar é sempre escura
   (transparente sobre o hero OU sólida --ink-900 ao rolar) — texto escuro em
   fundo escuro ficava invisível. Corrigido só neste contexto (não mexe no
   componente compartilhado, que está certo pros outros usos). */
.mkt__actions :deep(.btn--ghost) { color: var(--white); }
.mkt__actions :deep(.btn--ghost:hover:not(:disabled)) { background: rgba(255, 255, 255, 0.12); }

/* topbar é fixed: na Home o hero escuro passa por baixo (topbar transparente);
   nas demais páginas, compensa a altura para o conteúdo não ficar atrás da topbar. */
main { flex: 1; }
.mkt__main--offset { padding-top: var(--topbar-h); }

.mkt__footer { background: var(--ink-900); color: var(--ink-300); padding: var(--sp-12) 0 var(--sp-6); }
.mkt__footer-top { display: flex; justify-content: space-between; gap: var(--sp-12); flex-wrap: wrap; }
.mkt__footer-brand { max-width: 240px; }
.mkt__footer-tag { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-3); }
.mkt__footer-cols { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: var(--sp-8); flex: 1; }
.mkt__footer-col { display: flex; flex-direction: column; gap: var(--sp-2); }
.mkt__footer-col h4 { color: var(--white); font-size: var(--text-14); margin-bottom: var(--sp-1); }
.mkt__footer-col a { color: var(--ink-300); font-size: var(--text-13); }
.mkt__footer-col a:hover { color: var(--white); text-decoration: none; }
.mkt__footer-bottom {
  display: flex; align-items: center; justify-content: space-between;
  font-size: var(--text-13); margin-top: var(--sp-10);
  padding-top: var(--sp-5); border-top: 1px solid var(--ink-700);
}
/* Botão do menu mobile — escondido no desktop, onde a `.mkt__nav` já aparece. */
.mkt__burger {
  display: none; background: none; border: none; color: inherit;
  padding: var(--sp-2); margin-right: calc(var(--sp-2) * -1);
  align-items: center; justify-content: center; flex-shrink: 0;
}
.mkt__menu-backdrop { position: fixed; inset: 0; z-index: 40; background: rgba(11, 18, 32, 0.5); }
.mkt__menu {
  position: fixed; top: var(--topbar-h); left: 0; right: 0; z-index: 41;
  max-height: calc(100vh - var(--topbar-h)); overflow-y: auto;
  background: var(--ink-900); border-top: 1px solid var(--ink-700);
  padding: var(--sp-3) var(--sp-6) var(--sp-6);
  display: none; flex-direction: column;
}
.mkt__menu-item {
  color: var(--white); font-size: var(--text-16); font-weight: 500;
  padding: var(--sp-4) 0; border-bottom: 1px solid var(--ink-700);
}
.mkt__menu-item:hover { text-decoration: none; color: var(--brand-600); }
.mkt__menu-actions { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-5); }

@media (max-width: 768px) {
  .mkt__nav { display: none; }
  /* Ações do topo migram pro menu: sobra espaço e o alvo de toque fica maior. */
  .mkt__actions { display: none; }
  .mkt__burger { display: flex; }
  .mkt__menu { display: flex; }
  .mkt__footer-top { flex-direction: column; gap: var(--sp-8); }
  .mkt__footer-cols { grid-template-columns: repeat(2, 1fr); gap: var(--sp-6); }
  .mkt__footer-bottom { flex-direction: column; gap: var(--sp-3); align-items: flex-start; }
}
</style>
