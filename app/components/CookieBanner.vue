<script setup lang="ts">
// T18 — Banner de cookies (barra inferior + modal Configurar com 3 toggles).
// OPS6 — o estado saiu daqui para `useConsentimento()`: o plugin do GTM precisa
// reagir NA HORA em que o usuário decide, e dois `useCookie` na mesma chave não
// se sincronizam (cada chamada devolve um ref novo). Ver o composable.
import type { ConsentimentoCookies } from '~/composables/useConsentimento'

const { estado, decidiu, salvar } = useConsentimento()

const show = ref(!decidiu.value)
const configOpen = ref(false)
const analytics = ref(true)
const marketing = ref(false)

function persist(c: ConsentimentoCookies) {
  salvar(c) // grava cookie + estado compartilhado → dispara o watch do GTM
  show.value = false
  configOpen.value = false
}
function aceitarTudo() { persist({ essential: true, analytics: true, marketing: true }) }
function salvarPreferencias() { persist({ essential: true, analytics: analytics.value, marketing: marketing.value }) }

/**
 * OPS6 — recusar precisa custar o MESMO que aceitar (um clique).
 *
 * Antes só havia "Aceitar" e "Configurar": para recusar era preciso abrir o
 * modal e desmarcar duas caixas — quatro cliques contra um. Isso é o padrão
 * escuro que a LGPD (art. 8º, §4º — consentimento livre e inequívoco) e o EDPB
 * tratam como consentimento viciado. Enquanto os toggles não faziam nada era
 * um detalhe cosmético; com o GTM ligado de verdade, passou a ter efeito real.
 */
function recusarTudo() { persist({ essential: true, analytics: false, marketing: false }) }

/**
 * Permite reabrir as preferências de qualquer lugar (ex.: link na Política de
 * Cookies) sem duplicar o componente: `window.dispatchEvent(new Event('vp:cookies'))`.
 */
onMounted(() => {
  const abrir = () => { show.value = true; configOpen.value = true
    analytics.value = estado.value?.analytics ?? true
    marketing.value = estado.value?.marketing ?? false }
  window.addEventListener('vp:cookies', abrir)
  onBeforeUnmount(() => window.removeEventListener('vp:cookies', abrir))
})
</script>

<template>
  <div v-if="show" class="cookie">
    <div class="container cookie__inner">
      <p class="cookie__text">
        Usamos cookies para melhorar sua experiência. Veja a
        <NuxtLink to="/cookies">Política de Cookies</NuxtLink>.
      </p>
      <div class="cookie__actions">
        <UiButton variant="ghost" size="sm" @click="configOpen = true">Configurar</UiButton>
        <!-- "Recusar" com o mesmo peso visual de "Aceitar": um clique cada. -->
        <UiButton variant="secondary" size="sm" @click="recusarTudo">Recusar</UiButton>
        <UiButton size="sm" @click="aceitarTudo">Aceitar</UiButton>
      </div>
    </div>

    <UiModal :open="configOpen" title="Preferências de cookies" size="sm" @close="configOpen = false">
      <div class="cookie__opt">
        <div>
          <strong>Essenciais</strong>
          <p>Necessários para o funcionamento do site.</p>
        </div>
        <input type="checkbox" checked disabled>
      </div>
      <div class="cookie__opt">
        <div>
          <strong>Análise</strong>
          <p>Ajudam a entender como o site é usado.</p>
        </div>
        <input v-model="analytics" type="checkbox">
      </div>
      <div class="cookie__opt">
        <div>
          <strong>Marketing</strong>
          <p>Personalizam comunicações e anúncios.</p>
        </div>
        <input v-model="marketing" type="checkbox">
      </div>
      <template #footer>
        <UiButton block @click="salvarPreferencias">Salvar preferências</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.cookie { position: fixed; left: 0; right: 0; bottom: 0; z-index: 90; background: var(--ink-900); color: var(--white); box-shadow: var(--shadow-lg); }
.cookie__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-4) var(--sp-6); flex-wrap: wrap; }
.cookie__text { font-size: var(--text-13); color: var(--ink-300); }
.cookie__text a { color: var(--white); text-decoration: underline; }
.cookie__actions { display: flex; gap: var(--sp-2); }
.cookie__opt { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-3) 0; border-bottom: 1px solid var(--ink-100); }
.cookie__opt:last-of-type { border-bottom: none; }
.cookie__opt strong { font-size: var(--text-14); color: var(--ink-900); }
.cookie__opt p { font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.cookie__opt input { width: 18px; height: 18px; accent-color: var(--brand-600); }
</style>
