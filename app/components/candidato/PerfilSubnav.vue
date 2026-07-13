<script setup lang="ts">
// Sub-nav interna do hub "Meu Perfil" (T-C06) — Dados · Portfólio · Currículos · Formação.
// Compartilhada pelas 4 páginas para dar sensação de hub único mesmo sendo rotas separadas
// (cada uma com URL própria per design-spec — T-C07/08/09 têm deep-link direto).
const items = [
  { label: 'Dados', to: '/app/candidato/perfil' },
  { label: 'Portfólio', to: '/app/candidato/portfolio' },
  { label: 'Currículos', to: '/app/candidato/curriculos' },
  { label: 'Formação', to: '/app/candidato/formacao' },
]
const route = useRoute()
</script>

<template>
  <nav class="subnav">
    <NuxtLink
      v-for="item in items" :key="item.to" :to="item.to" class="subnav__item"
      :class="{ 'subnav__item--active': route.path === item.to }"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.subnav { display: flex; gap: var(--sp-2); border-bottom: 1px solid var(--ink-100); margin-bottom: var(--sp-6); overflow-x: auto; }
.subnav__item {
  padding: var(--sp-3) var(--sp-4); font-size: var(--text-14); font-weight: 500;
  color: var(--ink-500); text-decoration: none; border-bottom: 2px solid transparent;
  white-space: nowrap; transition: color var(--t-fast), border-color var(--t-fast);
}
.subnav__item:hover { color: var(--ink-900); }
.subnav__item--active { color: var(--brand-700); border-color: var(--brand-600); font-weight: 600; }
</style>
