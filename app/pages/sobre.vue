<script setup lang="ts">
// F6 — página institucional "Sobre" (footer linkava para cá e dava 404).
useSeoMeta({
  title: 'Sobre o VitrinePro',
  description: 'Conheça o VitrinePro: o ATS gratuito para recrutadores e o marketplace de hunters que paga por placement.',
})

const valores = [
  { titulo: 'Transparência', texto: 'Fees, prazos e regras do marketplace são sempre claros — para empresas, hunters e candidatos.' },
  { titulo: 'Meritocracia', texto: 'Hunters são avaliados pelo resultado real de suas indicações, não por autopromoção.' },
  { titulo: 'Simplicidade', texto: 'Um ATS gratuito de verdade, sem letras miúdas, para quem está começando a recrutar.' },
]
</script>

<template>
  <div class="sobre container">
    <header class="sobre__hero">
      <h1>Conectamos quem recruta, quem indica e quem procura a próxima oportunidade.</h1>
      <p class="text-secondary">
        O VitrinePro nasceu para resolver um problema simples: recrutadores e empresas pequenas não têm
        acesso a um ATS de verdade, e bons hunters não têm um jeito profissional de ganhar por indicações.
      </p>
    </header>

    <section class="sobre__valores">
      <UiCard v-for="v in valores" :key="v.titulo" class="sobre__valor">
        <h3>{{ v.titulo }}</h3>
        <p class="text-secondary">{{ v.texto }}</p>
      </UiCard>
    </section>

    <section class="sobre__cta">
      <h2>Quer fazer parte?</h2>
      <div class="sobre__cta-actions">
        <UiButton size="lg" @click="navigateTo('/cadastro')">Criar conta grátis</UiButton>
        <UiButton size="lg" variant="secondary" @click="navigateTo('/contato')">Falar com a gente</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sobre { padding: var(--sp-10) 0 var(--sp-16); max-width: 760px; }
.sobre__hero { text-align: center; margin-bottom: var(--sp-10); }
.sobre__hero h1 { margin-bottom: var(--sp-3); }
.sobre__valores { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-10); }
.sobre__valor h3 { margin-bottom: var(--sp-2); font-size: var(--text-16); }
.sobre__cta { text-align: center; }
.sobre__cta h2 { margin-bottom: var(--sp-4); }
.sobre__cta-actions { display: flex; gap: var(--sp-3); justify-content: center; flex-wrap: wrap; }
@media (max-width: 720px) { .sobre__valores { grid-template-columns: 1fr; } }
</style>
