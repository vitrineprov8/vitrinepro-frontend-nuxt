import type { ConsentimentoCookies } from '../composables/useConsentimento'

/**
 * OPS6 — Google Tag Manager com Consent Mode v2.
 *
 * **Modo de carga (decisão do Andres, 2026-07-18):** o contêiner carrega
 * **sempre**, independentemente do aceite de cookies. Para voltar ao
 * comportamento estrito (só carregar depois do aceite), trocar
 * `gtmRequireConsent` para `true` no `nuxt.config.ts` — é uma constante ali,
 * não há variável de ambiente (removidas a pedido do Andres).
 *
 * **O que isso muda, e o que NÃO muda.** O Consent Mode v2 continua ativo nos
 * dois modos: os defaults saem **tudo negado** antes de qualquer tag, e a
 * escolha do usuário é propagada com `consent update`. É o padrão que o próprio
 * Google recomenda — carregar o contêiner e deixar as tags respeitarem o
 * estado de consentimento, em vez de bloquear o contêiner inteiro. Enquanto o
 * usuário não aceitar, tags que dependem de armazenamento operam em modo
 * cookieless (pings sem identificador persistente).
 *
 * **O trade-off honesto:** carregando sempre, há requisição ao Google antes de
 * qualquer aceite — a pessoa aparece nos logs do Google mesmo se depois
 * recusar. É por isso que o PLANO pedia originalmente o contrário (OPS6:
 * "ligar o consentimento ao script"). O ganho prático é que o modo Visualizar
 * do GTM / Tag Assistant passa a funcionar (sem contêiner carregado ele nunca
 * conecta) e nenhuma tag depende de o usuário responder ao banner primeiro.
 * Se a assessoria jurídica pedir o modo estrito, é uma variável de ambiente.
 *
 * **Como funciona:**
 *  1. `dataLayer` + defaults do Consent Mode v2 (**tudo negado**) primeiro.
 *  2. Contêiner injetado na inicialização (ou, no modo estrito, ao aceitar).
 *  3. `consent update` a cada decisão, com mapeamento granular: análise →
 *     `analytics_storage`; marketing → `ad_storage`, `ad_user_data`,
 *     `ad_personalization`. Aceitar só análise NÃO libera tags de anúncio.
 *  4. Navegação SPA dispara `page_view` — sem isso o GTM só contaria a
 *     primeira página de cada sessão (o Nuxt nunca recarrega o documento).
 *
 * O `<noscript>` do snippet oficial fica em `app.vue` e segue a mesma regra.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

/** Estado inicial: nada permitido, exceto o que não grava dado pessoal. */
const CONSENT_DEFAULT = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  // Dá 500ms para o `update` chegar antes de as tags decidirem disparar,
  // evitando corrida quando o usuário já tinha consentido em visita anterior.
  wait_for_update: 500,
} as const

export default defineNuxtPlugin(() => {
  const { public: cfg } = useRuntimeConfig()
  const gtmId = String(cfg.gtmId || '')

  if (!cfg.gtmEnabled || !gtmId) return

  const { estado } = useConsentimento()

  window.dataLayer = window.dataLayer || []
  // `arguments` é obrigatório aqui: o Consent Mode espera os argumentos crus no
  // dataLayer, não um array. Por isso `function` e não arrow function.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }

  gtag('consent', 'default', CONSENT_DEFAULT)

  let containerCarregado = false

  function carregarContainer() {
    if (containerCarregado) return
    containerCarregado = true

    window.dataLayer!.push({ 'gtm.start': Date.now(), 'event': 'gtm.js' })

    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
    document.head.appendChild(s)
  }

  function aplicar(c: ConsentimentoCookies | null) {
    if (!c) return // ainda não respondeu ao banner: segue tudo negado

    gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied',
    })

    // No modo estrito é o aceite que traz o contêiner. No modo padrão ele já
    // foi carregado abaixo, e esta chamada é inofensiva (guard interno).
    if (c.analytics || c.marketing) carregarContainer()
  }

  aplicar(estado.value)
  watch(estado, aplicar, { deep: true })

  // Modo padrão: contêiner sempre carregado, com o consentimento sinalizado
  // acima. As tags dentro do GTM é que decidem o que podem fazer.
  if (!cfg.gtmRequireConsent) carregarContainer()

  /**
   * Pageview de SPA — o snippet cru do GTM dispara uma vez e pronto; num app
   * Nuxt o documento nunca mais recarrega, então sem isto só a primeira página
   * de cada sessão seria contada.
   *
   * **Deliberadamente NÃO enviamos `page_title`.** Foi tentado e medido: o
   * título é aplicado pelo unhead depois da navegação, e nenhuma espera
   * razoável o torna confiável — `router.afterEach`, `nextTick`,
   * `requestAnimationFrame`, `page:finish` e até um MutationObserver no
   * `<title>` com teto de 400ms continuaram reportando o título da página
   * ANTERIOR em parte das navegações (`/precos` como "O hub do recrutador
   * brasileiro", `/hunters` como "Guias de uso"). Mandar um título errado é
   * pior que não mandar: sujaria os relatórios de forma silenciosa. A tag do
   * GA4 dentro do GTM lê `document.title` no momento em que dispara, que é
   * mais tarde e portanto mais correto — e lá isso é configurável pela UI.
   *
   * O que enviamos é só o que dá para garantir no instante do disparo: o
   * caminho, lido de `router.currentRoute.value` (nunca `useRoute()`, que fora
   * de um componente devolve valor stale — chegou a reportar `/` em duas
   * navegações seguidas durante a validação).
   */
  const router = useRouter()
  const nuxtApp = useNuxtApp()

  /**
   * Dedupe por caminho, e não uma flag de "primeira navegação".
   *
   * A flag foi tentada e estava errada: `page:finish` **não dispara na carga
   * inicial** (só em navegação client-side), então a flag comia a primeira
   * navegação de verdade — `/precos` nunca era contado. Guardar o caminho
   * inicial resolve os dois lados: a página de entrada não é contada duas vezes
   * (o contêiner já a conta ao inicializar) e toda navegação real dispara.
   */
  let ultimoCaminho = window.location.pathname + window.location.search

  // `page:finish` garante que a página nova montou. Com `router.afterEach` o
  // evento saía cedo demais em dev, onde os módulos carregam um a um.
  nuxtApp.hook('page:finish', () => {
    if (!containerCarregado) return

    const caminho = router.currentRoute.value.fullPath
    if (caminho === ultimoCaminho) return
    ultimoCaminho = caminho

    window.dataLayer!.push({
      event: 'page_view',
      page_path: caminho,
      page_location: window.location.href,
    })
  })
})
