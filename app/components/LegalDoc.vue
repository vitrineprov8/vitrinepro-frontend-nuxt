<script setup lang="ts">
// Documento legal com TOC lateral sticky (T18 — /termos, /privacidade, /cookies).
interface Section { id: string, heading: string, body: string }
defineProps<{ title: string, updated: string, sections: Section[] }>()
</script>

<template>
  <div class="legal container">
    <header class="legal__header">
      <h1>{{ title }}</h1>
      <p class="legal__updated">Última atualização: {{ updated }}</p>
    </header>

    <div class="legal__layout">
      <nav class="legal__toc" aria-label="Índice">
        <span class="legal__toc-title">Nesta página</span>
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`">{{ s.heading }}</a>
      </nav>

      <article class="legal__content">
        <section v-for="s in sections" :id="s.id" :key="s.id" class="legal__section">
          <h2>{{ s.heading }}</h2>
          <p>{{ s.body }}</p>
        </section>
        <p class="legal__disclaimer">
          Este documento foi redigido internamente com base no funcionamento real da plataforma. Recomendamos revisão por um advogado antes do lançamento público, especialmente quanto a obrigações da LGPD.
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal { padding: var(--sp-10) 0 var(--sp-16); }
.legal__header { margin-bottom: var(--sp-8); }
.legal__updated { color: var(--ink-500); font-size: var(--text-13); margin-top: var(--sp-1); }
.legal__layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--sp-10); align-items: start; }
.legal__toc { position: sticky; top: calc(var(--topbar-h) + var(--sp-4)); display: flex; flex-direction: column; gap: var(--sp-2); }
.legal__toc-title { font-size: var(--text-12); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-500); }
.legal__toc a { font-size: var(--text-14); color: var(--ink-700); }
.legal__toc a:hover { color: var(--brand-700); text-decoration: none; }
.legal__content { max-width: 720px; }
.legal__section { margin-bottom: var(--sp-8); scroll-margin-top: calc(var(--topbar-h) + var(--sp-4)); }
.legal__section h2 { font-size: var(--text-18); margin-bottom: var(--sp-3); }
.legal__section p { color: var(--ink-700); line-height: 1.7; }
.legal__disclaimer { margin-top: var(--sp-8); padding: var(--sp-3) var(--sp-4); background: var(--amber-100); color: #92400E; border-radius: var(--radius-input); font-size: var(--text-13); }
@media (max-width: 900px) {
  .legal__layout { grid-template-columns: 1fr; }
  .legal__toc { position: static; flex-direction: row; flex-wrap: wrap; gap: var(--sp-3); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--ink-100); }
}
</style>
