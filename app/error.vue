<script setup lang="ts">
// T18 — Página de erro global (404 + 410 tombstone). Renderizada fora dos layouts.
import type { NuxtError } from '#app'
import type { Vaga, PaginatedResult } from '~/types/vaga'

const props = defineProps<{ error: NuxtError }>()
const api = useApi()

const code = computed(() => props.error?.statusCode ?? 500)
const is410 = computed(() => code.value === 410)
const is404 = computed(() => code.value === 404)

// Sugestões (410) ou nada.
const { data: sugResp } = await useAsyncData('error-sugestoes', () =>
  is410.value ? api.get<PaginatedResult<Vaga>>('/vagas', { limit: 4 }).catch(() => null) : Promise.resolve(null))
const sugestoes = computed<Vaga[]>(() => sugResp.value?.data ?? [])

const busca = ref('')
function buscar() {
  const q = busca.value.trim()
  clearError({ redirect: q ? `/vagas?q=${encodeURIComponent(q)}` : '/vagas' })
}
function irHome() { clearError({ redirect: '/' }) }

useSeoMeta({ title: is410.value ? 'Conteúdo removido' : 'Página não encontrada', robots: 'noindex' })
</script>

<template>
  <div class="err">
    <header class="err__top">
      <NuxtLink to="/" class="err__logo" @click.prevent="irHome">Vitrine<span>Pro</span></NuxtLink>
    </header>

    <main class="err__body container">
      <!-- 410 -->
      <template v-if="is410">
        <span class="err__code">410</span>
        <h1>Este conteúdo foi removido</h1>
        <p class="err__sub">A página que você procura não está mais disponível. Veja algumas vagas abertas:</p>
        <div v-if="sugestoes.length" class="err__grid">
          <VagaCard v-for="v in sugestoes" :key="v.id" :vaga="v" />
        </div>
        <UiButton class="err__home" variant="secondary" @click="irHome">Voltar ao início</UiButton>
      </template>

      <!-- 404 -->
      <template v-else-if="is404">
        <span class="err__code">404</span>
        <h1>Página não encontrada</h1>
        <p class="err__sub">O endereço não existe ou foi movido. Que tal procurar uma vaga?</p>
        <form class="err__search" @submit.prevent="buscar">
          <UiInput v-model="busca" placeholder="Cargo, palavra-chave..." />
          <UiButton type="submit">Buscar vagas</UiButton>
        </form>
        <button class="err__link" @click="irHome">Voltar ao início</button>
      </template>

      <!-- genérico -->
      <template v-else>
        <span class="err__code">{{ code }}</span>
        <h1>Algo deu errado</h1>
        <p class="err__sub">Tente novamente em instantes.</p>
        <UiButton class="err__home" @click="irHome">Voltar ao início</UiButton>
      </template>
    </main>
  </div>
</template>

<style scoped>
.err { min-height: 100vh; display: flex; flex-direction: column; background: var(--white); }
.err__top { height: var(--topbar-h); display: flex; align-items: center; padding: 0 var(--sp-6); border-bottom: 1px solid var(--ink-100); }
.err__logo { font-family: var(--font-display); font-size: var(--text-18); font-weight: 700; color: var(--ink-900); }
.err__logo span { color: var(--brand-600); }
.err__body { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: var(--sp-16); }
.err__code { font-family: var(--font-display); font-size: 64px; font-weight: 700; color: var(--brand-600); line-height: 1; }
.err__body h1 { font-size: var(--text-28); margin-top: var(--sp-4); }
.err__sub { color: var(--ink-500); margin-top: var(--sp-2); max-width: 460px; }
.err__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-top: var(--sp-8); width: 100%; text-align: left; }
.err__search { display: flex; gap: var(--sp-2); margin-top: var(--sp-6); width: 100%; max-width: 440px; align-items: flex-end; }
.err__search > :first-child { flex: 1; }
.err__home { margin-top: var(--sp-6); }
.err__link { margin-top: var(--sp-5); background: none; border: none; color: var(--brand-700); font-weight: 600; cursor: pointer; font-size: var(--text-14); }
@media (max-width: 900px) { .err__grid { grid-template-columns: 1fr; } }
</style>
