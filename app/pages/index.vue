<script setup lang="ts">
// T01 — Home marketing (versão inicial; hero + como funciona + CTA)
useSeoMeta({
  title: 'O hub do recrutador brasileiro',
  description: 'O ATS gratuito do recrutador brasileiro + o marketplace que paga por placement.',
})
</script>

<template>
  <div>
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__copy">
          <h1>Recrute. Indique. <span class="hero__accent">Receba.</span></h1>
          <p class="hero__sub">O ATS gratuito do recrutador brasileiro + o marketplace que paga por placement.</p>
          <div class="hero__ctas">
            <UiButton size="lg" @click="navigateTo('/cadastro?perfil=hunter')">Começar grátis</UiButton>
            <UiButton size="lg" variant="secondary" @click="navigateTo('/vagas?fee=true')">Ver vagas com fee</UiButton>
          </div>
        </div>
      </div>
    </section>

    <section class="how container">
      <h2>Como funciona</h2>
      <div class="how__grid">
        <UiCard>
          <h4>1 · Empresa publica a vaga</h4>
          <p class="text-secondary">Define o fee que paga pela contratação. Publicar é grátis.</p>
        </UiCard>
        <UiCard>
          <h4>2 · Hunters indicam candidatos</h4>
          <p class="text-secondary">Hunters verificados trabalham a vaga e submetem os melhores perfis.</p>
        </UiCard>
        <UiCard>
          <h4>3 · Contratou? Fee dividido</h4>
          <p class="text-secondary">Placement confirmado, garantia de reposição e pagamento via Pix.</p>
        </UiCard>
      </div>
    </section>

    <section class="cta-final">
      <div class="container cta-final__inner">
        <h2>Crie sua conta em 2 minutos</h2>
        <UiButton size="lg" variant="secondary" @click="navigateTo('/cadastro')">Criar conta grátis</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero { background: var(--ink-900); color: var(--white); padding: 96px 0; }
.hero h1 { font-size: var(--text-48); color: var(--white); }
.hero__accent { color: var(--brand-600); }
.hero__sub { font-size: var(--text-18); color: var(--ink-300); margin-top: var(--sp-4); max-width: 560px; }
.hero__ctas { display: flex; gap: var(--sp-3); margin-top: var(--sp-8); }
.how { padding: var(--sp-16) var(--sp-6); }
.how__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); margin-top: var(--sp-6); }
.how__grid p { margin-top: var(--sp-2); }
.cta-final { background: var(--brand-600); color: var(--white); padding: var(--sp-12) 0; }
.cta-final__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-6); }
.cta-final h2 { color: var(--white); }
@media (max-width: 768px) {
  .hero h1 { font-size: var(--text-36); }
  .how__grid { grid-template-columns: 1fr; }
  .cta-final__inner { flex-direction: column; text-align: center; }
}
</style>
