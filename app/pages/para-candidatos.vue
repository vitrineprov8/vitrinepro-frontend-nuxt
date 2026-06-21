<script setup lang="ts">
// T03 — Landing para candidatos. Spec: design-spec/01 §T03
useSeoMeta({
  title: 'Para profissionais — seu perfil completo, hunters te apresentando',
  description: 'Monte um perfil profissional rico, seja encontrado por hunters de verdade e candidate-se às melhores vagas. Você controla sua visibilidade.',
})
</script>

<template>
  <div class="pc">
    <!-- HERO -->
    <section class="pc-hero container">
      <div class="pc-hero__copy">
        <h1>Seu perfil profissional completo. <span class="accent">Hunters de verdade te apresentando às melhores vagas.</span></h1>
        <p class="pc-hero__sub">Crie um perfil rico, controle sua visibilidade e deixe que recrutadores verificados encontrem você.</p>
        <UiButton size="lg" @click="navigateTo('/cadastro?perfil=candidato')">Criar perfil grátis</UiButton>
      </div>
      <div class="pc-hero__media" aria-hidden="true">
        <div class="mock mock--profile"><span>Seu perfil</span></div>
      </div>
    </section>

    <!-- PERFIL RICO -->
    <section class="split container">
      <div class="split__media"><div class="mock mock--profile-lg" aria-hidden="true"><span>Portfólio · CVs · Formação</span></div></div>
      <div class="split__copy">
        <h2>Um perfil que mostra quem você é</h2>
        <ul class="bullets">
          <li>Portfólio, currículos e formação em um só lugar.</li>
          <li>Link público para compartilhar onde quiser.</li>
          <li>Histórico profissional organizado e bonito.</li>
        </ul>
        <UiButton variant="secondary" @click="navigateTo('/cadastro?perfil=candidato')">Montar meu perfil</UiButton>
      </div>
    </section>

    <!-- RADAR SWIPE -->
    <section class="split split--reverse container">
      <div class="split__media"><div class="mock mock--radar" aria-hidden="true"><span>Radar de vagas</span></div></div>
      <div class="split__copy">
        <h2>Encontre vagas com um deslize</h2>
        <ul class="bullets">
          <li>Radar de vagas com swipe no celular.</li>
          <li>Filtros salvos para o que importa pra você.</li>
          <li>Candidate-se em poucos toques.</li>
        </ul>
        <UiButton variant="secondary" @click="navigateTo('/vagas')">Ver vagas abertas</UiButton>
      </div>
    </section>

    <!-- PRIVACIDADE -->
    <section class="pc-priv container">
      <div class="pc-priv__card">
        <h2>Você controla sua visibilidade</h2>
        <p>Decida se seu perfil é público ou oculto. Seus dados são seus — em conformidade com a LGPD, sempre.</p>
        <UiButton @click="navigateTo('/cadastro?perfil=candidato')">Criar perfil grátis</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.accent { color: var(--brand-600); }

.pc-hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--sp-12); align-items: center; padding: var(--sp-16) var(--sp-6); }
.pc-hero h1 { font-size: var(--text-48); line-height: 1.1; }
.pc-hero__sub { font-size: var(--text-18); color: var(--ink-500); margin: var(--sp-4) 0 var(--sp-8); max-width: 520px; }

.mock { border-radius: var(--radius-card); box-shadow: var(--shadow-md); display: flex; align-items: flex-end; padding: var(--sp-4); color: var(--white); font-size: var(--text-13); font-weight: 600; }
.mock span { background: rgba(255,255,255,0.92); color: var(--ink-900); padding: 4px var(--sp-3); border-radius: var(--radius-full); }
.mock--profile { aspect-ratio: 4/3; background: linear-gradient(135deg, var(--ink-900), var(--ink-700)); }
.mock--profile-lg { aspect-ratio: 4/3; background: linear-gradient(135deg, var(--ink-900), var(--ink-700)); }
.mock--radar { aspect-ratio: 4/3; background: linear-gradient(135deg, var(--brand-700), var(--brand-600)); }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-12); align-items: center; padding: var(--sp-12) var(--sp-6); }
.split--reverse .split__media { order: 2; }
.split__copy h2 { margin-bottom: var(--sp-4); }
.bullets { list-style: none; padding: 0; margin: 0 0 var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-3); }
.bullets li { position: relative; padding-left: var(--sp-6); color: var(--ink-700); font-size: var(--text-16); }
.bullets li::before { content: '✓'; position: absolute; left: 0; top: -1px; width: 20px; height: 20px; border-radius: var(--radius-full); background: var(--brand-100); color: var(--brand-700); display: grid; place-items: center; font-size: var(--text-12); font-weight: 700; }

.pc-priv { padding: var(--sp-12) var(--sp-6) var(--sp-16); }
.pc-priv__card { background: var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-12); text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); }
.pc-priv__card p { color: var(--ink-700); max-width: 520px; }

@media (max-width: 900px) {
  .pc-hero { grid-template-columns: 1fr; gap: var(--sp-8); padding: var(--sp-12) var(--sp-6); }
  .pc-hero h1 { font-size: var(--text-36); }
  .split, .split--reverse { grid-template-columns: 1fr; gap: var(--sp-6); }
  .split--reverse .split__media { order: 0; }
}
</style>
