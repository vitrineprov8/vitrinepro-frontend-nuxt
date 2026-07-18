<script setup lang="ts">
// T-GUIA — Guia visual de uma persona. Conteúdo em `shared/guias.ts`.
import { UserRound, Radar, Building2, Users, Clock3, ArrowLeft, FileText } from 'lucide-vue-next'
import { GUIAS, getGuia } from '~~/shared/guias'

const ICONES = { UserRound, Radar, Building2, Users }

const route = useRoute()
const guia = getGuia(String(route.params.persona))

// Slug inexistente vira 404 de verdade (não uma página vazia) — importante para
// não gerar URLs fantasma indexáveis.
if (!guia) {
  throw createError({ statusCode: 404, statusMessage: 'Guia não encontrada', fatal: true })
}

const config = useRuntimeConfig()
const base = config.public.frontendUrl
const url = `${base}/guias/${guia.slug}`

const outras = GUIAS.filter(g => g.slug !== guia.slug)

useSeoMeta({
  title: guia.titulo,
  description: `${guia.subtitulo} Guia visual em ${guia.minutos} minutos, passo a passo.`,
  ogTitle: `${guia.titulo} — VitrinePro`,
  ogDescription: guia.subtitulo,
  ogType: 'article',
})

/**
 * Dois blocos de dados estruturados:
 *  - `HowTo`  → é literalmente o schema de "passo a passo"; buscadores e
 *               assistentes conseguem responder "como faço X no VitrinePro"
 *               citando os passos na ordem certa.
 *  - `FAQPage`→ habilita rich snippet das perguntas frequentes.
 * `alternate` aponta para a versão markdown pura, para leitura por máquina.
 */
useHead({
  link: [
    { rel: 'canonical', href: url },
    { rel: 'alternate', type: 'text/markdown', href: `${base}/llms/guias/${guia.slug}.md`, title: `${guia.titulo} (markdown)` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: guia.titulo,
        description: guia.subtitulo,
        url,
        inLanguage: 'pt-BR',
        totalTime: `PT${guia.minutos}M`,
        step: guia.passos.map((p, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: p.titulo,
          text: p.detalhe ? `${p.texto} ${p.detalhe}` : p.texto,
          ...(p.rota ? { url: `${base}${p.rota}` } : {}),
        })),
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guia.faq.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }),
    },
  ],
})
</script>

<template>
  <article v-if="guia" class="guia" :class="`guia--${guia.cor}`">
    <header class="guia__hero">
      <div class="container">
        <NuxtLink to="/guias" class="guia__voltar">
          <ArrowLeft :size="15" /> Todas as guias
        </NuxtLink>

        <span class="guia__icone">
          <component :is="ICONES[guia.icone]" :size="26" />
        </span>
        <h1>{{ guia.titulo }}</h1>
        <p class="guia__sub">{{ guia.subtitulo }}</p>
        <p class="guia__meta">
          <Clock3 :size="14" /> {{ guia.minutos }} min de leitura · {{ guia.passos.length }} passos
        </p>
      </div>
    </header>

    <div class="container">
      <ol class="guia__passos">
        <GuiasGuiaPasso
          v-for="(p, i) in guia.passos"
          :key="p.titulo"
          :passo="p"
          :numero="i + 1"
          :total="guia.passos.length"
        />
      </ol>

      <section class="guia__faq" aria-labelledby="faq-titulo">
        <h2 id="faq-titulo">Perguntas frequentes</h2>
        <details v-for="f in guia.faq" :key="f.q" class="guia__faq-item">
          <summary>{{ f.q }}</summary>
          <p>{{ f.a }}</p>
        </details>
      </section>

      <section class="guia__fim">
        <h2>Pronto para começar?</h2>
        <div class="guia__fim-acoes">
          <UiButton to="/cadastro" size="lg">Criar conta grátis</UiButton>
          <UiButton to="/precos" variant="secondary" size="lg">Ver planos</UiButton>
        </div>
        <a :href="`/llms/guias/${guia.slug}.md`" class="guia__md">
          <FileText :size="14" /> Versão em markdown (para IA e leitores)
        </a>
      </section>

      <nav class="guia__outras" aria-label="Outras guias">
        <h2>Outras guias</h2>
        <ul>
          <li v-for="o in outras" :key="o.slug">
            <NuxtLink :to="`/guias/${o.slug}`" :class="`guia__outra guia__outra--${o.cor}`">
              <component :is="ICONES[o.icone]" :size="18" />
              <span>
                <strong>{{ o.titulo }}</strong>
                <em>{{ o.persona }}</em>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </article>
</template>

<style scoped>
/* Acento por persona: definido no topo e herdado por maquetes e passos
   (GuiaMockup lê --mk-accent / --mk-accent-soft). */
.guia--blue { --mk-accent: var(--blue-500); --mk-accent-soft: var(--blue-100); }
.guia--brand { --mk-accent: var(--brand-700); --mk-accent-soft: var(--brand-100); }
.guia--purple { --mk-accent: var(--purple-500); --mk-accent-soft: var(--purple-100); }
.guia--amber { --mk-accent: var(--amber-500); --mk-accent-soft: var(--amber-100); }

.guia__hero { padding: var(--sp-8) 0 var(--sp-10); background: var(--mk-accent-soft); text-align: center; }
.guia__voltar {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  font-size: var(--text-13); font-weight: 600; color: var(--mk-accent); margin-bottom: var(--sp-5);
}
.guia__icone {
  display: grid; place-items: center; width: 56px; height: 56px; margin: 0 auto var(--sp-3);
  border-radius: var(--radius-card); background: var(--white); color: var(--mk-accent);
  box-shadow: var(--shadow-sm);
}
.guia__hero h1 { font-size: var(--text-36); line-height: 1.15; }
.guia__sub { margin-top: var(--sp-2); font-size: var(--text-18); color: var(--ink-700); }
.guia__meta {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  margin-top: var(--sp-3); font-size: var(--text-13); color: var(--ink-500);
}

.guia__passos { list-style: none; padding: 0; margin: var(--sp-6) auto var(--sp-10); max-width: 980px; }
.guia__passos > :deep(li + li) { border-top: 1px solid var(--ink-100); }

.guia__faq { max-width: 720px; margin: 0 auto var(--sp-12); }
.guia__faq h2 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.guia__faq-item { border-bottom: 1px solid var(--ink-100); padding: var(--sp-3) 0; }
.guia__faq-item summary { cursor: pointer; font-weight: 600; font-size: var(--text-14); }
.guia__faq-item summary:hover { color: var(--mk-accent); }
.guia__faq-item p { margin-top: var(--sp-2); font-size: var(--text-14); color: var(--ink-700); line-height: 1.6; }

.guia__fim {
  text-align: center; padding: var(--sp-10) var(--sp-5);
  background: var(--ink-100); border-radius: var(--radius-card); margin-bottom: var(--sp-10);
}
.guia__fim h2 { font-size: var(--text-28); }
.guia__fim-acoes {
  display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-3); margin-top: var(--sp-5);
}
.guia__md {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  margin-top: var(--sp-5); font-size: var(--text-13); color: var(--ink-500);
}

.guia__outras { max-width: 980px; margin: 0 auto var(--sp-12); }
.guia__outras h2 { font-size: var(--text-18); margin-bottom: var(--sp-4); }
.guia__outras ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3); }
.guia__outra {
  display: flex; align-items: center; gap: var(--sp-3); height: 100%;
  padding: var(--sp-4); border: 1px solid var(--ink-100); border-radius: var(--radius-card);
  color: inherit; transition: border-color var(--t-fast), transform var(--t-fast);
}
.guia__outra:hover { text-decoration: none; transform: translateY(-2px); border-color: currentColor; }
.guia__outra span { display: flex; flex-direction: column; min-width: 0; }
.guia__outra strong { font-size: var(--text-14); }
.guia__outra em { font-style: normal; font-size: var(--text-12); color: var(--ink-500); }
.guia__outra--blue { color: var(--blue-500); }
.guia__outra--brand { color: var(--brand-700); }
.guia__outra--purple { color: var(--purple-500); }
.guia__outra--amber { color: var(--amber-500); }

@media (max-width: 860px) {
  .guia__hero h1 { font-size: var(--text-28); }
  .guia__sub { font-size: var(--text-16); }
  .guia__outras ul { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .gcard, .guia__outra { transition: none; }
}
</style>
