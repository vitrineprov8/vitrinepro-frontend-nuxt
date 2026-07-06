<script setup lang="ts">
// F6 — página institucional "Contato" (footer linkava para cá e dava 404).
// Formulário é client-side apenas (mailto) — não há endpoint de contato no
// backend ainda; se isso virar gap real, abrir um B novo.
useSeoMeta({
  title: 'Contato',
  description: 'Fale com o time do VitrinePro.',
})

const name = ref('')
const email = ref('')
const message = ref('')
const sent = ref(false)

function submit() {
  const subject = encodeURIComponent(`Contato via site — ${name.value || 'sem nome'}`)
  const body = encodeURIComponent(`${message.value}\n\n— ${name.value} (${email.value})`)
  window.location.href = `mailto:contato@v8pro.com.br?subject=${subject}&body=${body}`
  sent.value = true
}
</script>

<template>
  <div class="contato container">
    <header class="contato__header">
      <h1>Fale com a gente</h1>
      <p class="text-secondary">Dúvidas, parcerias ou suporte — respondemos o mais rápido possível.</p>
    </header>

    <div class="contato__grid">
      <UiCard class="contato__form-card">
        <form v-if="!sent" class="contato__form" @submit.prevent="submit">
          <UiInput v-model="name" label="Seu nome" required />
          <UiInput v-model="email" label="E-mail" type="email" required />
          <div class="field">
            <label class="field__label" for="mensagem">Mensagem</label>
            <textarea id="mensagem" v-model="message" class="contato__textarea" rows="5" required />
          </div>
          <UiButton type="submit" block>Enviar mensagem</UiButton>
        </form>
        <UiEmptyState v-else title="Abrindo seu app de e-mail..." description="Se nada abrir, escreva direto para contato@v8pro.com.br." />
      </UiCard>

      <div class="contato__info">
        <h3>Outros canais</h3>
        <p><strong>Vendas:</strong> <a href="mailto:vendas@v8pro.com.br">vendas@v8pro.com.br</a></p>
        <p><strong>Suporte:</strong> <a href="mailto:contato@v8pro.com.br">contato@v8pro.com.br</a></p>
        <p><strong>Central de ajuda:</strong> <NuxtLink to="/ajuda">Ver artigos</NuxtLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contato { padding: var(--sp-10) 0 var(--sp-16); max-width: 900px; }
.contato__header { text-align: center; margin-bottom: var(--sp-8); }
.contato__grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--sp-6); align-items: start; }
.contato__form { display: flex; flex-direction: column; gap: var(--sp-4); }
.contato__textarea {
  width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input);
  padding: var(--sp-3); font: inherit; resize: vertical;
}
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; display: block; margin-bottom: var(--sp-1); }
.contato__info { display: flex; flex-direction: column; gap: var(--sp-2); }
.contato__info h3 { margin-bottom: var(--sp-2); }
@media (max-width: 720px) { .contato__grid { grid-template-columns: 1fr; } }
</style>
