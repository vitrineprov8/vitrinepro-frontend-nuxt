<script setup lang="ts">
// Layout auth — split-screen T12/T13: form à esquerda, painel ink-900 à direita
</script>

<template>
  <div class="auth">
    <div class="auth__form">
      <NuxtLink to="/" class="auth__logo">Vitrine<span>Pro</span></NuxtLink>
      <div class="auth__content"><slot /></div>
    </div>
    <aside class="auth__panel">
      <blockquote>
        <p>"Fechei 3 placements no primeiro mês. O pipeline organiza tudo que eu fazia em planilha."</p>
        <footer>— Ana C., Hunter de Tecnologia · Curitiba</footer>
      </blockquote>
    </aside>
  </div>
</template>

<style scoped>
.auth { min-height: 100vh; display: grid; grid-template-columns: 480px 1fr; background: var(--white); }
.auth__form { padding: var(--sp-10); display: flex; flex-direction: column; }
.auth__logo { font-family: var(--font-display); font-size: var(--text-22); font-weight: 700; color: var(--ink-900); }
.auth__logo span { color: var(--brand-600); }
.auth__content { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 360px; margin-inline: auto; width: 100%; }
.auth__panel {
  background: var(--ink-900); color: var(--white);
  display: flex; align-items: center; justify-content: center; padding: var(--sp-16);
}
.auth__panel p { font-size: var(--text-22); font-family: var(--font-display); line-height: 1.4; }
.auth__panel footer { margin-top: var(--sp-4); color: var(--ink-300); font-size: var(--text-14); }
@media (max-width: 1024px) { .auth { grid-template-columns: 1fr; } .auth__panel { display: none; } }
</style>
