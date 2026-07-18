<script setup lang="ts">
// T-GUIA — Índice das guias de uso, uma por persona.
import { UserRound, Radar, Building2, Users, Clock3, ArrowRight } from 'lucide-vue-next'
import { GUIAS } from '~~/shared/guias'

const ICONES = { UserRound, Radar, Building2, Users }

const config = useRuntimeConfig()
const base = config.public.frontendUrl

useSeoMeta({
  title: 'Guias de uso',
  description: 'Guias visuais do VitrinePro para candidatos, hunters, empresas e consultorias. Passo a passo, em poucos minutos.',
  ogTitle: 'Guias de uso — VitrinePro',
  ogDescription: 'Aprenda a usar o VitrinePro no seu perfil: candidato, hunter, empresa ou consultoria.',
})

// ItemList ajuda buscadores e assistentes de IA a entenderem que esta página é
// um índice de guias, e a saltarem direto para a guia certa.
useHead({
  link: [{ rel: 'canonical', href: `${base}/guias` }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Guias de uso do VitrinePro',
      itemListElement: GUIAS.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.titulo,
        description: g.subtitulo,
        url: `${base}/guias/${g.slug}`,
      })),
    }),
  }],
})
</script>

<template>
  <div class="gidx container">
    <header class="gidx__hero">
      <p class="gidx__eyebrow">Guias de uso</p>
      <h1>Comece pelo seu perfil</h1>
      <p class="gidx__sub">
        Passo a passo, com pouco texto e muita imagem. Escolha como você usa o VitrinePro.
      </p>
    </header>

    <ul class="gidx__grid">
      <li v-for="g in GUIAS" :key="g.slug">
        <NuxtLink :to="`/guias/${g.slug}`" class="gcard" :class="`gcard--${g.cor}`">
          <span class="gcard__icone">
            <component :is="ICONES[g.icone]" :size="22" />
          </span>
          <span class="gcard__persona">{{ g.persona }}</span>
          <h2 class="gcard__titulo">{{ g.titulo }}</h2>
          <p class="gcard__sub">{{ g.subtitulo }}</p>
          <span class="gcard__meta">
            <Clock3 :size="14" /> {{ g.minutos }} min · {{ g.passos.length }} passos
          </span>
          <span class="gcard__cta">Ver guia <ArrowRight :size="15" /></span>
        </NuxtLink>
      </li>
    </ul>

    <aside class="gidx__ia">
      <h2>Está lendo com um assistente de IA?</h2>
      <p>
        Todas as guias existem em markdown puro, sem layout, prontas para leitura por máquina.
      </p>
      <p class="gidx__ia-links">
        <a href="/llms.txt">/llms.txt</a>
        <span v-for="g in GUIAS" :key="g.slug">
          <a :href="`/llms/guias/${g.slug}.md`">/llms/guias/{{ g.slug }}.md</a>
        </span>
      </p>
    </aside>
  </div>
</template>

<style scoped>
.gidx { padding: var(--sp-12) 0 var(--sp-16); }
.gidx__hero { text-align: center; max-width: 620px; margin: 0 auto var(--sp-10); }
.gidx__eyebrow {
  font-size: var(--text-13); font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--brand-700); margin-bottom: var(--sp-2);
}
.gidx__hero h1 { font-size: var(--text-36); line-height: 1.15; }
.gidx__sub { margin-top: var(--sp-3); font-size: var(--text-16); color: var(--ink-700); }

.gidx__grid {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-5);
  max-width: 900px; margin-inline: auto;
}

.gcard {
  display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-2);
  height: 100%; padding: var(--sp-6);
  background: var(--white); border: 1px solid var(--ink-100);
  border-radius: var(--radius-card); color: inherit;
  transition: transform var(--t-fast), box-shadow var(--t-fast), border-color var(--t-fast);
}
.gcard:hover {
  text-decoration: none; transform: translateY(-3px);
  box-shadow: var(--shadow-md); border-color: var(--gc);
}
.gcard:focus-visible { outline: var(--focus-ring); outline-offset: 3px; }

.gcard__icone {
  display: grid; place-items: center; width: 44px; height: 44px;
  border-radius: var(--radius-input); background: var(--gc-soft); color: var(--gc);
  margin-bottom: var(--sp-1);
}
.gcard__persona { font-size: var(--text-13); font-weight: 600; color: var(--gc); }
.gcard__titulo { font-size: var(--text-22); line-height: 1.2; }
.gcard__sub { font-size: var(--text-14); color: var(--ink-700); flex: 1; }
.gcard__meta {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  font-size: var(--text-12); color: var(--ink-500);
}
.gcard__cta {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  margin-top: var(--sp-2); font-size: var(--text-14); font-weight: 600; color: var(--gc);
}

/* Cor por persona, definida uma vez e herdada pelos filhos. */
.gcard--blue { --gc: var(--blue-500); --gc-soft: var(--blue-100); }
.gcard--brand { --gc: var(--brand-700); --gc-soft: var(--brand-100); }
.gcard--purple { --gc: var(--purple-500); --gc-soft: var(--purple-100); }
.gcard--amber { --gc: var(--amber-500); --gc-soft: var(--amber-100); }

.gidx__ia {
  max-width: 900px; margin: var(--sp-12) auto 0; padding: var(--sp-5) var(--sp-6);
  background: var(--ink-100); border-radius: var(--radius-card);
}
.gidx__ia h2 { font-size: var(--text-16); }
.gidx__ia p { font-size: var(--text-14); color: var(--ink-700); margin-top: var(--sp-1); }
.gidx__ia-links { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-3) !important; }
.gidx__ia-links a { font-family: monospace; font-size: var(--text-13); }

@media (max-width: 720px) {
  .gidx__grid { grid-template-columns: 1fr; }
  .gidx__hero h1 { font-size: var(--text-28); }
}
</style>
