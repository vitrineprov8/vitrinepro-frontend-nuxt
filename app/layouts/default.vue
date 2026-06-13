<script setup lang="ts">
// Layout marketing/público — topbar T01, footer
const auth = useAuthStore()
onMounted(() => auth.fetchMe())
</script>

<template>
  <div class="mkt">
    <header class="mkt__topbar">
      <div class="container mkt__topbar-inner">
        <NuxtLink to="/" class="mkt__logo">Vitrine<span>Pro</span></NuxtLink>
        <nav class="mkt__nav">
          <NuxtLink to="/">Para Hunters</NuxtLink>
          <NuxtLink to="/para-empresas">Para Empresas</NuxtLink>
          <NuxtLink to="/vagas">Vagas</NuxtLink>
          <NuxtLink to="/hunters">Hunters</NuxtLink>
          <NuxtLink to="/precos">Preços</NuxtLink>
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
      </div>
    </header>

    <main><slot /></main>

    <footer class="mkt__footer">
      <div class="container mkt__footer-inner">
        <p>© {{ new Date().getFullYear() }} VitrinePro · v8pro.com.br</p>
        <nav class="mkt__footer-nav">
          <NuxtLink to="/termos">Termos</NuxtLink>
          <NuxtLink to="/privacidade">Privacidade</NuxtLink>
          <NuxtLink to="/ajuda">Ajuda</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.mkt { min-height: 100vh; display: flex; flex-direction: column; background: var(--white); }
.mkt__topbar { background: var(--ink-900); position: sticky; top: 0; z-index: 50; }
.mkt__topbar-inner { display: flex; align-items: center; gap: var(--sp-8); height: var(--topbar-h); }
.mkt__logo { font-family: var(--font-display); font-size: var(--text-18); font-weight: 700; color: var(--white); }
.mkt__logo span { color: var(--brand-600); }
.mkt__nav { display: flex; gap: var(--sp-5); flex: 1; }
.mkt__nav a { color: var(--ink-300); font-size: var(--text-14); }
.mkt__nav a:hover { color: var(--white); text-decoration: none; }
.mkt__actions { display: flex; gap: var(--sp-2); }
main { flex: 1; }
.mkt__footer { background: var(--ink-900); color: var(--ink-300); padding: var(--sp-8) 0; }
.mkt__footer-inner { display: flex; justify-content: space-between; font-size: var(--text-13); }
.mkt__footer-nav { display: flex; gap: var(--sp-4); }
.mkt__footer-nav a { color: var(--ink-300); }
@media (max-width: 768px) { .mkt__nav { display: none; } }
</style>
