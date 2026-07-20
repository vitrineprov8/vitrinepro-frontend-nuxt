<script setup lang="ts">
/**
 * OPS6 — `<noscript>` do Google Tag Manager (a 2ª metade do snippet oficial).
 *
 * Segue a mesma regra de carga do `plugins/gtm.client.ts`:
 *  - **modo padrão** (`gtmRequireConsent: false`): emitido sempre, como manda
 *    o snippet oficial;
 *  - **modo estrito** (`gtmRequireConsent: true` no `nuxt.config.ts`): só para
 *    quem já consentiu numa visita anterior (o cookie é lido no SSR) — porque
 *    quem está sem JavaScript não consegue nem ver o banner, e rastreá-lo seria,
 *    por definição, rastreio sem consentimento.
 *
 * Não vale para `/app/**` (client-only, `ssr: false` no nuxt.config) — mas ali
 * também não há visitante anônimo para medir.
 */
const { public: cfg } = useRuntimeConfig()
const { estado } = useConsentimento()

const gtmId = String(cfg.gtmId || '')
const podeEmitir = computed(() => {
  if (!cfg.gtmRequireConsent) return true
  const c = estado.value
  return !!c && (c.analytics || c.marketing)
})

if (cfg.gtmEnabled && gtmId && podeEmitir.value) {
  useHead({
    noscript: [{
      tagPosition: 'bodyOpen',
      innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}"`
        + ` height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
    }],
  })
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UiToaster />
</template>
