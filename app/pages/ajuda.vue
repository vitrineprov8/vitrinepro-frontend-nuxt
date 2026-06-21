<script setup lang="ts">
// T18 — Central de ajuda (índice por persona + busca local).
useSeoMeta({ title: 'Central de Ajuda', description: 'Artigos de ajuda do VitrinePro por perfil.' })

const artigos = [
  { persona: 'Recrutador', titulo: 'Como publicar minha primeira vaga', q: 'publicar vaga' },
  { persona: 'Recrutador', titulo: 'Como funciona o limite de vagas por plano', q: 'limite vagas plano' },
  { persona: 'Recrutador', titulo: 'Como compartilhar um processo seletivo', q: 'compartilhar processo' },
  { persona: 'Empresa', titulo: 'Como definir o fee de uma vaga', q: 'fee vaga' },
  { persona: 'Empresa', titulo: 'Garantia de reposição: como funciona', q: 'garantia reposicao' },
  { persona: 'Profissional', titulo: 'Como montar meu perfil público', q: 'perfil publico' },
  { persona: 'Profissional', titulo: 'Como me candidatar a uma vaga', q: 'candidatar vaga' },
  { persona: 'Profissional', titulo: 'Como controlar a visibilidade do meu perfil', q: 'visibilidade perfil' },
  { persona: 'Conta', titulo: 'Como redefinir minha senha', q: 'redefinir senha' },
  { persona: 'Conta', titulo: 'Como cancelar minha assinatura', q: 'cancelar assinatura' },
]

const busca = ref('')
const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase()
  if (!q) return artigos
  return artigos.filter(a => `${a.titulo} ${a.persona}`.toLowerCase().includes(q))
})
const personas = computed(() => [...new Set(filtrados.value.map(a => a.persona))])
</script>

<template>
  <div class="ajuda container">
    <header class="ajuda__header">
      <h1>Central de Ajuda</h1>
      <p class="text-secondary">Encontre respostas rápidas por perfil.</p>
      <div class="ajuda__search">
        <UiInput v-model="busca" placeholder="Buscar um artigo..." />
      </div>
    </header>

    <div v-if="filtrados.length" class="ajuda__groups">
      <section v-for="p in personas" :key="p" class="ajuda__group">
        <h2>{{ p }}</h2>
        <ul>
          <li v-for="a in filtrados.filter(x => x.persona === p)" :key="a.titulo">
            <NuxtLink :to="`/ajuda?q=${encodeURIComponent(a.q)}`">{{ a.titulo }}</NuxtLink>
          </li>
        </ul>
      </section>
    </div>
    <UiEmptyState v-else title="Nenhum artigo encontrado" description="Tente outro termo de busca." />
  </div>
</template>

<style scoped>
.ajuda { padding: var(--sp-10) 0 var(--sp-16); }
.ajuda__header { text-align: center; margin-bottom: var(--sp-8); }
.ajuda__search { max-width: 440px; margin: var(--sp-5) auto 0; text-align: left; }
.ajuda__groups { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-8); max-width: 820px; margin: 0 auto; }
.ajuda__group h2 { font-size: var(--text-16); margin-bottom: var(--sp-3); }
.ajuda__group ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.ajuda__group a { font-size: var(--text-14); color: var(--ink-700); }
.ajuda__group a:hover { color: var(--brand-700); text-decoration: none; }
@media (max-width: 720px) { .ajuda__groups { grid-template-columns: 1fr; } }
</style>
